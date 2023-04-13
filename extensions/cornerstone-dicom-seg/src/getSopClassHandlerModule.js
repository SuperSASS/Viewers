import vtkMath from '@kitware/vtk.js/Common/Core/Math';

import { utils } from '@ohif/core';

import { SOPClassHandlerId } from './id';
import dcmjs from 'dcmjs';

const { DicomMessage, DicomMetaDictionary } = dcmjs.data;

const sopClassUids = ['1.2.840.10008.5.1.4.1.1.66.4']; // SEG

let loadPromises = {};

// 这个就是入口函数 - getDisplaySetsFromSeries
// 会生成SEG文件对应的displaySet
function _getDisplaySetsFromSeries(
  instances,
  servicesManager,
  extensionManager
) {
  const instance = instances[0];

  const {
    StudyInstanceUID,
    SeriesInstanceUID,
    SOPInstanceUID,
    SeriesDescription,
    SeriesNumber,
    SeriesDate,
    SOPClassUID,
    wadoRoot,
    wadoUri,
    wadoUriRoot,
  } = instance;

  // 生成displaySet的默认基本属性
  const displaySet = {
    Modality: 'SEG',
    loading: false,
    isReconstructable: true, // by default for now since it is a volumetric SEG currently，SEG现在也可以支持重构（比如在MPR视图显示）
    displaySetInstanceUID: utils.guid(),
    SeriesDescription,
    SeriesNumber,
    SeriesDate,
    SOPInstanceUID,
    SeriesInstanceUID,
    StudyInstanceUID,
    SOPClassHandlerId,
    SOPClassUID,
    referencedImages: null,
    referencedSeriesInstanceUID: null,
    referencedDisplaySetInstanceUID: null,
    isDerivedDisplaySet: true,
    isLoaded: false,
    isHydrated: false,
    segments: {},
    sopClassUids,
    instance,
    wadoRoot,
    wadoUriRoot,
    wadoUri,
  };

  // 得到SEG的参考(Reference)影像序列【为什么是Sequence？
  const referencedSeriesSequence = instance.ReferencedSeriesSequence;

  if (!referencedSeriesSequence) {
    throw new Error('ReferencedSeriesSequence is missing for the SEG');
  }

  const referencedSeries = referencedSeriesSequence[0]; // 得到Referenced Series

  // 将Reference属性加入到displaySet
  displaySet.referencedImages = instance.ReferencedSeriesSequence.ReferencedInstanceSequence;
  displaySet.referencedSeriesInstanceUID = referencedSeries.SeriesInstanceUID;

  // 向displaySet加入获得参考Image影像的(reference)displaySet的函数，得到SEG文件参考Image文件的displaySet
  // SEG文件里的"ReferencedSeriesSequence"里的"SeriesInstanceUID"记录的就是参照影像的UID
  displaySet.getReferenceDisplaySet = () => {
    const { displaySetService } = servicesManager.services;
    const referencedDisplaySets = displaySetService.getDisplaySetsForSeries(
      displaySet.referencedSeriesInstanceUID
    );

    if (!referencedDisplaySets || referencedDisplaySets.length === 0) {
      throw new Error('Referenced DisplaySet is missing for the SEG');
    }

    const referencedDisplaySet = referencedDisplaySets[0];

    displaySet.referencedDisplaySetInstanceUID =
      referencedDisplaySet.displaySetInstanceUID;

    // Todo: this needs to be able to work with other reference volumes (other than streaming) such as nifti, etc.
    displaySet.referencedVolumeURI = referencedDisplaySet.displaySetInstanceUID;
    const referencedVolumeId = `cornerstoneStreamingImageVolume:${displaySet.referencedVolumeURI}`;
    displaySet.referencedVolumeId = referencedVolumeId;

    return referencedDisplaySet;
  };

  // 向displaySet加入**必要的**load函数，其异步，指向内部的_load函数
  displaySet.load = async ({ headers }) =>
    await _load(displaySet, servicesManager, extensionManager, headers);

  return [displaySet];
}

/* 以下是具体读取Segment的函数 */

// 1. 应该是将要获得的SEG的DisplaySet中，重要的"segments"属性给加载出来
//    但这里会先考虑有没有缓存，真正的读取是在第3个函数里
function _load(segDisplaySet, servicesManager, extensionManager, headers) {
  const { SOPInstanceUID } = segDisplaySet;
  if ( // 正在加载或加载完毕、且存在于这儿的loadPromises
    (segDisplaySet.loading || segDisplaySet.isLoaded) &&
    loadPromises[SOPInstanceUID]
  ) {
    return loadPromises[SOPInstanceUID];
  }

  segDisplaySet.loading = true; // 👉Load，开始！！！……

  // We don't want to fire multiple loads, so we'll wait for the first to finish
  // and also return the same promise to any other callers.
  loadPromises[SOPInstanceUID] = new Promise(async (resolve, reject) => {
    const { segmentationService } = servicesManager.services;

    // 如果缓存里有，那就886
    if (_segmentationExistsInCache(segDisplaySet, segmentationService)) {
      return;
    }

    // 如果segments这个属性还没有加载出来，那就加载！转进，步骤2
    if (
      !segDisplaySet.segments ||
      Object.keys(segDisplaySet.segments).length === 0
    ) {
      const segments = await _loadSegments(
        extensionManager,
        segDisplaySet,
        headers
      );

      segDisplaySet.segments = segments;
    }
    // 回到这里，已经在这里处理好了所有segments
    const suppressEvents = true;
    segmentationService.createSegmentationForSEGDisplaySet(
      segDisplaySet,
      null,
      suppressEvents
    )
      .then(() => {
        segDisplaySet.loading = false;
        resolve();
      })
      .catch(error => {
        segDisplaySet.loading = false;
        reject(error);
      });
  });

  return loadPromises[SOPInstanceUID];
}

// 2. 真正的获得"segments"属性
async function _loadSegments(extensionManager, segDisplaySet, headers) {
  const utilityModule = extensionManager.getModuleEntry(
    '@ohif/extension-cornerstone.utilityModule.common'
  );

  const { dicomLoaderService } = utilityModule.exports;
  // 可以看到，这里就要调之前哪个出错的函数，也就是要发API得到DICOM格式数据
  // 但这里得到的只是字节流
  const segArrayBuffer = await dicomLoaderService.findDicomDataPromise(
    segDisplaySet,
    null,
    headers
  );

  // 这里应该可以转化为dicomData
  const dicomData = DicomMessage.readFile(segArrayBuffer);
  const dataset = DicomMetaDictionary.naturalizeDataset(dicomData.dict); // 这一步后就转化为常见的dataset，也就是各种metadata（有些可能不是metadata的属性），以及pixelData等
  dataset._meta = DicomMetaDictionary.namifyDataset(dicomData.meta); // 这应该是添加metadata的吧

  if (!Array.isArray(dataset.SegmentSequence)) {
    dataset.SegmentSequence = [dataset.SegmentSequence];
  }

  const segments = _getSegments(dataset); // 👉又调用步骤3，把转换后的dataset(类似OHIF-Instance-Metadata)传过去
  return segments;
}

// 3. 然后是调用这个，把转换后的dataset传过来
function _getSegments(dataset) {
  const segments = {};

  // SegmentSequence序列里就是所有的标签数，这里对每一个标签进行下述操作
  dataset.SegmentSequence.forEach(segment => {
    const cielab = segment.RecommendedDisplayCIELabValue;
    /// √关键错误原因：这里的函数出错，应该是没定义标签或颜色？
    /// 刘云杰那边没定义【已修复
    const rgba = dcmjs.data.Colors.dicomlab2RGB(cielab).map(x =>
      Math.round(x * 255)
    );

    rgba.push(255);
    const segmentNumber = segment.SegmentNumber;

    // 生成一个segment的关键信息，这里只赋了color和label
    segments[segmentNumber] = {
      color: rgba,
      functionalGroups: [],
      offset: null,
      size: null,
      pixelData: null,
      label: segment.SegmentLabel,
    };
  });
  // 到这里，segment根据dataset.SegmentSequence每一项，已经生成完成
  // make a list of functional groups per segment
  // functional groups可能就是参照影像的数组
  dataset.PerFrameFunctionalGroupsSequence.forEach(functionalGroup => {
    const segmentNumber = functionalGroup.SegmentIdentificationSequence.ReferencedSegmentNumber;
    segments[segmentNumber].functionalGroups.push(functionalGroup);
  });

  return _getPixelData(dataset, segments);
}

// 4. 将 dataset 的 PixelData 转化为每一个 segment 里的 pixelData
function _getPixelData(dataset, segments) {
  let frameSize = Math.ceil((dataset.Rows * dataset.Columns) / 8);
  let nextOffset = 0;

  // 这里应该是对字节进行操作，解码
  Object.keys(segments).forEach(segmentKey => {
    const segment = segments[segmentKey];
    segment.numberOfFrames = segment.functionalGroups.length;
    segment.size = segment.numberOfFrames * frameSize;
    segment.offset = nextOffset;
    nextOffset = segment.offset + segment.size;
    const packedSegment = dataset.PixelData[0].slice(
      segment.offset,
      nextOffset
    );

    segment.pixelData = dcmjs.data.BitArray.unpack(packedSegment);
    segment.geometry = geometryFromFunctionalGroups(
      dataset,
      segment.functionalGroups
    );
  });

  return segments;
}

// 判断segmentation是不是已经在缓存里了
function _segmentationExistsInCache(segDisplaySet, segmentationService) {
  // This should be abstracted with the CornerstoneCacheService
  const labelmapVolumeId = segDisplaySet.displaySetInstanceUID;
  const segVolume = segmentationService.getLabelmapVolume(labelmapVolumeId);

  return segVolume !== undefined;
}

// 生成一些几何信息
function geometryFromFunctionalGroups(dataset, perFrame) {
  let pixelMeasures =
    dataset.SharedFunctionalGroupsSequence.PixelMeasuresSequence;
  let planeOrientation =
    dataset.SharedFunctionalGroupsSequence.PlaneOrientationSequence;
  let planePosition = perFrame[0].PlanePositionSequence; // TODO: assume sorted frames!

  const geometry = {};

  // NB: DICOM PixelSpacing is defined as Row then Column,
  // unlike ImageOrientationPatient
  let spacingBetweenSlices = pixelMeasures.SpacingBetweenSlices;
  if (!spacingBetweenSlices) {
    if (pixelMeasures.SliceThickness) {
      console.log('Using SliceThickness as SpacingBetweenSlices');
      spacingBetweenSlices = pixelMeasures.SliceThickness;
    }
  }
  geometry.spacing = [
    pixelMeasures.PixelSpacing[1],
    pixelMeasures.PixelSpacing[0],
    spacingBetweenSlices,
  ].map(Number);

  geometry.dimensions = [dataset.Columns, dataset.Rows, perFrame.length].map(
    Number
  );

  let orientation = planeOrientation.ImageOrientationPatient.map(Number);
  const columnStepToPatient = orientation.slice(0, 3);
  const rowStepToPatient = orientation.slice(3, 6);
  geometry.planeNormal = [];
  vtkMath.cross(columnStepToPatient, rowStepToPatient, geometry.planeNormal);

  let firstPosition = perFrame[0].PlanePositionSequence.ImagePositionPatient.map(
    Number
  );
  let lastPosition = perFrame[
    perFrame.length - 1
  ].PlanePositionSequence.ImagePositionPatient.map(Number);
  geometry.sliceStep = [];
  vtkMath.subtract(lastPosition, firstPosition, geometry.sliceStep);
  vtkMath.normalize(geometry.sliceStep);
  geometry.direction = columnStepToPatient
    .concat(rowStepToPatient)
    .concat(geometry.sliceStep);
  geometry.origin = planePosition.ImagePositionPatient.map(Number);

  return geometry;
}

function getSopClassHandlerModule({ servicesManager, extensionManager }) {
  const getDisplaySetsFromSeries = instances => {
    return _getDisplaySetsFromSeries(
      instances,
      servicesManager,
      extensionManager
    );
  };

  return [
    {
      name: 'dicom-seg',
      sopClassUids,
      getDisplaySetsFromSeries,
    },
  ];
}

export default getSopClassHandlerModule;
