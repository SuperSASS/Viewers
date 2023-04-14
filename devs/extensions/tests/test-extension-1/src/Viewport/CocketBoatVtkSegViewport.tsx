
import React, { useState, useRef, useEffect, Component, useCallback } from 'react';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkConeSource from '@kitware/vtk.js/Filters/Sources/ConeSource';
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData.js';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray.js';

import { eventTarget, EVENTS } from '@cornerstonejs/core';


import { View3D, getImageData, loadImageData } from "react-vtkjs-viewport";
import { api } from 'dicomweb-client';

import presets from './presets.js';
import "./initCorenerstone.js"
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction.js';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction.js';

import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';

import { DicomMetadataStore } from '@ohif/core';

/*
Api里的东西：
        genericRenderWindow: this.genericRenderWindow,
        widgetManager: this.widgetManager,
        container: this.container.current,
        widgets,
        filters,
        actors,
        volumes,
*/

// 根据imageData，创建Actor和Mapper
function _createActorMapper(imageData: any) {
  const mapper = vtkVolumeMapper.newInstance();
  mapper.setInputData(imageData);

  const actor = vtkVolume.newInstance();
  actor.setMapper(mapper);

  return {
    actor,
    mapper,
  };
}

// 获得颜色变化区间 一个小工具
function getShiftRange(colorTransferArray: string | any[]) {
  // Credit to paraview-glance
  // https://github.com/Kitware/paraview-glance/blob/3fec8eeff31e9c19ad5b6bff8e7159bd745e2ba9/src/components/controls/ColorBy/script.js#L133

  // shift range is original rgb/opacity range centered around 0
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < colorTransferArray.length; i += 4) {
    min = Math.min(min, colorTransferArray[i]);
    max = Math.max(max, colorTransferArray[i]);
  }

  const center = (max - min) / 2;

  return {
    shiftRange: [-center, center],
    min,
    max,
  };
}

// 应用颜色Preset设置
function applyPointsToRGBFunction(points: [any, any, any, any][], range: number[], cfun: vtkColorTransferFunction) {
  const width = range[1] - range[0];
  const rescaled = points.map(([x, r, g, b]) => [
    x * width + range[0],
    r,
    g,
    b,
  ]);

  // 这个应该对应3D Slicer或ITK-SNAP那个颜色变化区间的若干点
  cfun.removeAllPoints();
  rescaled.forEach(([x, r, g, b]) => cfun.addRGBPoint(x, r, g, b));

  return rescaled;
}

// 应用透明Preset设置
function applyPointsToPiecewiseFunction(points, range, pwf) {
  const width = range[1] - range[0];
  const rescaled = points.map(([x, y]) => [x * width + range[0], y]);

  pwf.removeAllPoints();
  rescaled.forEach(([x, y]) => pwf.addPoint(x, y));

  return rescaled;
}

// 应用所选择的Preset【三维重建的渲染方式
function applyPreset(actor: vtkVolume, preset: PresetType) {
  // Create color transfer function
  const colorTransferArray = preset.colorTransfer.split(' ').splice(1).map(parseFloat);
  // 获得颜色变化区间
  const { shiftRange } = getShiftRange(colorTransferArray);
  // const width = max - min;
  let min = shiftRange[0];
  const width = shiftRange[1] - shiftRange[0];
  // 创建ColorTransfer函数
  const cfun = vtkColorTransferFunction.newInstance();
  const normColorTransferValuePoints: Array<[number, number, number, number]> = [];
  for (let i = 0; i < colorTransferArray.length; i += 4) {
    let value = colorTransferArray[i];
    const r = colorTransferArray[i + 1];
    const g = colorTransferArray[i + 2];
    const b = colorTransferArray[i + 3];

    value = (value - min) / width;
    normColorTransferValuePoints.push([value, r, g, b]);
  }

  applyPointsToRGBFunction(normColorTransferValuePoints, shiftRange, cfun);

  actor.getProperty().setRGBTransferFunction(0, cfun);

  // Create scalar opacity function
  const scalarOpacityArray = preset.scalarOpacity
    .split(' ')
    .splice(1)
    .map(parseFloat);

  const ofun = vtkPiecewiseFunction.newInstance();
  const normPoints: [number, number][] = [];
  for (let i = 0; i < scalarOpacityArray.length; i += 2) {
    let value = scalarOpacityArray[i];
    const opacity = scalarOpacityArray[i + 1];

    value = (value - min) / width;

    normPoints.push([value, opacity]);
  }

  applyPointsToPiecewiseFunction(normPoints, shiftRange, ofun);

  actor.getProperty().setScalarOpacity(0, ofun);

  const [
    gradientMinValue,
    gradientMinOpacity,
    gradientMaxValue,
    gradientMaxOpacity,
  ] = preset.gradientOpacity.split(' ').splice(1).map(parseFloat);

  actor.getProperty().setUseGradientOpacity(0, true);
  actor.getProperty().setGradientOpacityMinimumValue(0, gradientMinValue);
  actor.getProperty().setGradientOpacityMinimumOpacity(0, gradientMinOpacity);
  actor.getProperty().setGradientOpacityMaximumValue(0, gradientMaxValue);
  actor.getProperty().setGradientOpacityMaximumOpacity(0, gradientMaxOpacity);

  switch (preset.interpolation) {
    case 'FastLinear':
      actor.getProperty().setInterpolationTypeToFastLinear();
      break;
    case 'Linear':
      actor.getProperty().setInterpolationTypeToLinear();
      break;
    case 'Nearest':
      actor.getProperty().setInterpolationTypeToNearest();
      break;
    default:
      actor.getProperty().setInterpolationTypeToFastLinear();
      break;
  }

  const ambient = parseFloat(preset.ambient);
  const diffuse = parseFloat(preset.diffuse);
  const specular = parseFloat(preset.specular);
  const specularPower = parseFloat(preset.specularPower);
  const shade = preset.shade === '1'

  actor.getProperty().setAmbient(ambient); // 环境光
  actor.getProperty().setDiffuse(diffuse); // 漫反射光
  actor.getProperty().setSpecular(specular); // 镜面反射光
  actor.getProperty().setSpecularPower(specularPower); // 镜面反射系数
  actor.getProperty().setShade(false)
}

/**
 * 生成CT 3D的管线，渲染用
 * @param imageData vtkImageData类型
 * @param ctTransferFunctionPresetId 对应Presets里的某一个id
 * @returns vtk里面的`actor`
 */
function _createCT3dPipeline(imageData: vtkImageData, ctTransferFunctionPresetId: string) {
  const { actor, mapper } = _createActorMapper(imageData);

  const sampleDistance = 1.2 * Math.sqrt(imageData.getSpacing().map((v: number) => v * v).reduce((a: any, b: any) => a + b, 0));
  const range = imageData.getPointData().getScalars().getRange();

  actor.getProperty().getRGBTransferFunction(0).setRange(range[0], range[1]);
  mapper.setSampleDistance(sampleDistance);

  const preset = presets.find(
    preset => preset.id === ctTransferFunctionPresetId
  );

  applyPreset(actor, preset as PresetType);

  actor.getProperty().setScalarOpacityUnitDistance(0, 2.5);

  return actor;
}


function CocketBoatViewport(props: { displaySets: any; viewportIndex: any; viewportLabel: any; dataSource: any; viewportOptions: any; displaySetOptions: any; needsRerendering: any; servicesManager: any; commandsManager: any; }) {
  // 解析props
  const {
    displaySets,
    viewportIndex,
    viewportLabel,
    dataSource,
    viewportOptions,
    displaySetOptions,
    needsRerendering,
    servicesManager,
    commandsManager,
  } = props;
  const {
    measurementService,
    displaySetService,
    toolbarService,
    toolGroupService,
    syncGroupService,
    cornerstoneViewportService,
    cornerstoneCacheService,
    segmentationService,
    viewportGridService,
    stateSyncService,
  } = servicesManager.services;

  const displaySet = displaySets[0];
  const modality = displaySet.Modality;
  const studyInstanceUID = displaySet.StudyInstanceUID;
  const seriesInstanceUID = displaySet.SeriesInstanceUID;
  const sopInstanceUID = modality == "SEG" ? displaySet.SOPInstanceUID : displaySet.images[0].SOPInstanceUID;
  const imageIds = modality == "SEG" ? [displaySet.instance.imageId] : dataSource.getImageIdsForDisplaySet(displaySet);
  const displaySetInstanceUid = `vtkDisplaySet-${displaySet.displaySetInstanceUID}`;
  // const instance = DicomMetadataStore.getInstance(studyInstanceUID, seriesInstanceUID, sopInstanceUID);


  // 这个实际上是actor？？
  const [volumeRenderingVolumes, setVolumeRenderingVolumes] = useState<[vtkVolume]>();
  const [ctTransferFunctionPresetId, setCtTransferFunctionPresetId] = useState('vtkMRMLVolumePropertyNode4');
  const [apis, setApis] = useState<Array<any>>([]);

  const init_Image = async () => {
    // apis = [];
    let studyRawMetadata = await dataSource.retrieveStudyMetadatas(studyInstanceUID);
    if (studyRawMetadata.promises) // 针对采用RetrieveMetadataLoaderAsync方式读取的措施
    {
      const newStudyRawMetadata: Array<any> = [];
      for (const promise of studyRawMetadata.promises) {
        const result = await promise;
        result.forEach(metadata => newStudyRawMetadata.push(metadata));
      }
      studyRawMetadata = newStudyRawMetadata;
    }
    const studyOHIFMetadata = DicomMetadataStore.getStudy(studyInstanceUID);
    const studyImageIds: Array<string> = [];
    studyOHIFMetadata.series.forEach(oneSeries => {
      oneSeries.instances.forEach(instance => {
        studyImageIds.push(instance.imageId);
      })
    })

    for (const index in studyImageIds) {
      cornerstoneWADOImageLoader.wadors.metaDataManager.add(
        studyImageIds[index],
        studyRawMetadata[index]
      );
    }

    const ctImageDataObject = loadDataset(imageIds, displaySetInstanceUid); // 后面传一个displaySetUid，主要是用来读缓存的
    const ctImageData: vtkImageData = ctImageDataObject.vtkImageData;

    const ctVolVR = _createCT3dPipeline(
      ctImageData,
      ctTransferFunctionPresetId
    );
    setVolumeRenderingVolumes([ctVolVR]);
  }

  const init_SEG = async () => {
    // 没给ViewportType，则默认定为STACK
    if (!viewportOptions.viewportType) {
      viewportOptions.viewportType = "stack";
    }
    const referencedDisplaySet = displaySet.getReferenceDisplaySet();

    const loadViewportData = async () => {
      // 由于是SEG类型，在create后就已经读取了像素数据，所以不需要像OHIFViewport那样之后还要setViewportData
      const viewportData = await cornerstoneCacheService.createViewportData(
        [referencedDisplaySet, displaySets[0]],
        viewportOptions,
        dataSource
      );
    };

    loadViewportData();
  }

  // 订阅SEG加载好后的事件
  useEffect(() => {
    const { unsubscribe } = segmentationService.subscribe(
      segmentationService.EVENTS.SEGMENTATION_PIXEL_DATA_CREATED,
      evt => {
        const derivedVolume = evt.derivedVolume;
        const segImageData: vtkImageData = derivedVolume.imageData;
        const ctVolVR = _createCT3dPipeline(
          segImageData,
          ctTransferFunctionPresetId
        );
        setVolumeRenderingVolumes([ctVolVR]);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setApis([]);
    if (modality == "SEG")
      init_SEG();
    else
      init_Image();
  }, []);

  const saveApiReference = useCallback((api) => {
    // apis = [api];
    setApis([api]);
    // api.genericRenderWindow.setBackground([1, 1, 1]);
  }, []);

  window.VPapi = apis[0];

  const handleChangeCTTransferFunction = event => {
    const ctTransferFunctionPresetId = event.target.value;
    const preset = presets.find(
      preset => preset.id === ctTransferFunctionPresetId
    );

    const actor = (volumeRenderingVolumes as [vtkVolume])[0];
    applyPreset(actor, preset as PresetType);
    rerenderAll();

    setCtTransferFunctionPresetId(ctTransferFunctionPresetId);
  };

  // 手动重新渲染所有Viewport
  const rerenderAll = () => {
    Object.keys(apis).forEach(viewportIndex => {
      const renderWindow = apis[
        viewportIndex
      ].genericRenderWindow.getRenderWindow();

      renderWindow.render();
    });
  };

  // 将imagesIds变为Dataset
  function loadDataset(imageIds, displaySetInstanceUid) {
    const imageDataObject = getImageData(imageIds, displaySetInstanceUid);
    loadImageData(imageDataObject);

    const onAllPixelDataInsertedCallback = () => {
      rerenderAll();
    };

    imageDataObject.onAllPixelDataInserted(onAllPixelDataInsertedCallback);

    return imageDataObject;
  }

  // 那个Preset下拉列表
  const ctTransferFunctionPresetOptions = presets.map(preset => {
    return (
      <option key={preset.id} value={preset.id}>
        {preset.name}
      </option>
    );
  });

  return (
    <div>
      <h4>Loading...</h4>
      {volumeRenderingVolumes && <div className="row">
        <div className="col-xs-12">
          <div>
            <label htmlFor="select_CT_xfer_fn">
              CT Transfer Function Preset (for Volume Rendering):{' '}
            </label>
            <select
              id="select_CT_xfer_fn"
              value={ctTransferFunctionPresetId}
              onChange={handleChangeCTTransferFunction}
            >
              {ctTransferFunctionPresetOptions}
            </select>
          </div>
        </div>
        <hr />
        <div className="col-xs-12 col-sm-6">
          <View3D
            volumes={volumeRenderingVolumes}
            onCreated={saveApiReference}
          />
        </div>
      </div>
      }
    </div>
  );
}

type PresetType = {
  name: string;
  gradientOpacity: string;
  specularPower: string;
  scalarOpacity: string;
  id: string;
  specular: string;
  shade: string;
  ambient: string;
  colorTransfer: string;
  selectable: string;
  diffuse: string;
  interpolation: string;
  effectiveRange: string;
  references?: undefined;
};


export default CocketBoatViewport;
