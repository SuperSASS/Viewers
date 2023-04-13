import dcmjs from 'dcmjs';

import pubSubServiceInterface from '../_shared/pubSubServiceInterface';
import createStudyMetadata from './createStudyMetadata';

const EVENTS = {
  STUDY_ADDED: 'event::dicomMetadataStore:studyAdded',
  INSTANCES_ADDED: 'event::dicomMetadataStore:instancesAdded',
  SERIES_ADDED: 'event::dicomMetadataStore:seriesAdded',
  SERIES_UPDATED: 'event::dicomMetadataStore:seriesUpdated',
};

/**
 * @example
 * studies: [
 *   {
 *     // Study层级属性
 *     StudyInstanceUID: string,
 *     StudyDescription: string | undefined
 *     isLoaded: boolean, // 是否加载完成吧
 *     ModalitiesInstudy: Array<string>, // 拥有的所有影像类型
 *     NumberOfStudyRelatedSeries: number, // 应该是Series数量吧
 *     // 函数
 *     setSeriesMetadata: function(SeriesInstanceUID, seriesMetadata), // 就是设置指定SeriesUid为OHIF-Series-Metadata
 *     addInstance(s)ToSeries: function(instance(s)), // 把OHIF-Instance-Metadata加入到该Study下的对应Sereis
 *     // 该Study所有的Series
 *     series: [
 *       {
 *         // Study层级属性
 *         StudyInstanceUID: string,
 *         StudyDescription: string | undefined,
 *         // Series层级属性
 *         SeriesInstanceUID: string,
 *         SeriesDescription: string | undefined,
 *         SOPClassUID
 *         SeriesNumber: number | null,
 *         SeriesTime: string,
 *         Modality: string,
 *         // OHIF专属属性
 *         ProtocolName: string | undefined,
 *         // 该Series所有的Instances
 *         instances: [
 *           {
 *             // 类型为OHIF-Instance-Metadata(naturalized instance metadata)
 *             SOPInstanceUID: string,
 *             SOPClassUID: string,
 *             Rows: number,
 *             Columns: number,
 *             PatientSex: string,
 *             Modality: string,
 *             InstanceNumber: string,
 *             imageId: string,
 *             PixelData: object,
 *             ...
 *           },
 *           {
 *             // instance 2
 *           },
 *         ],
 *       },
 *       {
 *         // series 2
 *       },
 *     ],
 *   },
 *   { study 2 }
 * ],
 */
const _model = {
  studies: [],
};

// 得到存储的所有StudyInstanceUIDs
function _getStudyInstanceUIDs() {
  return _model.studies.map(aStudy => aStudy.StudyInstanceUID);
}

// 根据StudyInstanceUID，得到对应的OHIF-Study-Metadata
function _getStudy(StudyInstanceUID) {
  return _model.studies.find(
    aStudy => aStudy.StudyInstanceUID === StudyInstanceUID
  );
}

// 根据[Study+Series]InstanceUID，得到对应的OHIF-Series-Metadata
function _getSeries(StudyInstanceUID, SeriesInstanceUID) {
  const study = _getStudy(StudyInstanceUID);

  if (!study) {
    return;
  }

  return study.series.find(
    aSeries => aSeries.SeriesInstanceUID === SeriesInstanceUID
  );
}

// 根据[Study+Series+SOP]InstanceUID，得到对应的OHIF-Instance-Metadata
function _getInstance(StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID) {
  const series = _getSeries(StudyInstanceUID, SeriesInstanceUID);

  if (!series) {
    return;
  }

  return series.instances.find(
    instance => instance.SOPInstanceUID === SOPInstanceUID
  );
}

// 根据imageId，得到属于该imageId的OHIF-Instance-Metadata
function _getInstanceByImageId(imageId) {
  for (const study of _model.studies) {
    for (const series of study.series) {
      for (const instance of series.instances) {
        if (instance.imageId === imageId) {
          return instance;
        }
      }
    }
  }
}

/**
 * 更新某一特定Series（根据UID指定）的OHIF-eries-Metadata
 * 会广播事件：SERIES_UPDATED
 * Update the metadata of a specific series
 * @param {*} StudyInstanceUID StudyUID
 * @param {*} SeriesInstanceUID SeriesUID
 * @param {*} metadata 为OHIF-Series-Metadata格式
 * @returns none
 */
function _updateMetadataForSeries(
  StudyInstanceUID,
  SeriesInstanceUID,
  metadata
) {
  const study = _getStudy(StudyInstanceUID);

  if (!study) {
    return;
  }

  const series = study.series.find(
    aSeries => aSeries.SeriesInstanceUID === SeriesInstanceUID
  );

  const { instances } = series;
  // update all instances metadata for this series with the new metadata
  instances.forEach(instance => {
    Object.keys(metadata).forEach(key => {
      // if metadata[key] is an object, we need to merge it with the existing
      // metadata of the instance
      if (typeof metadata[key] === 'object') {
        instance[key] = { ...instance[key], ...metadata[key] };
      }
      // otherwise, we just replace the existing metadata with the new one
      else {
        instance[key] = metadata[key];
      }
    });
  });

  // broadcast the series updated event
  this._broadcastEvent(EVENTS.SERIES_UPDATED, {
    SeriesInstanceUID,
    StudyInstanceUID,
    madeInClient: true,
  });
}

const BaseImplementation = {
  EVENTS,
  listeners: {},
  // 增加Instance，感觉格式为Raw-Instance-Metadata?
  // 由于不清楚参数格式，所以暂不详细理解
  addInstance(dicomJSONDatasetOrP10ArrayBuffer) {
    let dicomJSONDataset;

    // If Arraybuffer, parse to DICOMJSON before naturalizing.
    if (dicomJSONDatasetOrP10ArrayBuffer instanceof ArrayBuffer) {
      const dicomData = dcmjs.data.DicomMessage.readFile(
        dicomJSONDatasetOrP10ArrayBuffer
      );

      dicomJSONDataset = dicomData.dict;
    } else {
      dicomJSONDataset = dicomJSONDatasetOrP10ArrayBuffer;
    }

    let naturalizedDataset;

    if (dicomJSONDataset['SeriesInstanceUID'] === undefined) {
      naturalizedDataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(
        dicomJSONDataset
      );
    } else {
      naturalizedDataset = dicomJSONDataset;
    }

    const { StudyInstanceUID } = naturalizedDataset;

    let study = _model.studies.find(
      study => study.StudyInstanceUID === StudyInstanceUID
    );

    if (!study) {
      _model.studies.push(createStudyMetadata(StudyInstanceUID));
      study = _model.studies[_model.studies.length - 1];
    }

    study.addInstanceToSeries(naturalizedDataset);
  },
  // 增加一系列Instances，格式就为Array<OHIF-Instance-Metadata>
  // 会执行操作：把Instances添加到_model中对应的Series里
  // 会发布事件：INSTANCES_ADDED（注意有S哈，实际上应该是SERIES(单数)_ADDED）
  addInstances(instances, madeInClient = false) {
    const { StudyInstanceUID, SeriesInstanceUID } = instances[0];

    let study = _model.studies.find(
      study => study.StudyInstanceUID === StudyInstanceUID
    );

    if (!study) {
      _model.studies.push(createStudyMetadata(StudyInstanceUID));

      study = _model.studies[_model.studies.length - 1];
    }

    study.addInstancesToSeries(instances);

    // Broadcast an event even if we used cached data.
    // This is because the mode needs to listen to instances that are added to build up its active displaySets.
    // It will see there are cached displaySets and end early if this Series has already been fired in this
    // Mode session for some reason.
    this._broadcastEvent(EVENTS.INSTANCES_ADDED, {
      StudyInstanceUID,
      SeriesInstanceUID,
      madeInClient,
    });
  },
  addSeriesMetadata(seriesSummaryMetadata, madeInClient = false) {
    const { StudyInstanceUID } = seriesSummaryMetadata[0];
    let study = _getStudy(StudyInstanceUID);
    if (!study) {
      study = createStudyMetadata(StudyInstanceUID);
      // Will typically be undefined with a compliant DICOMweb server, reset later
      study.StudyDescription = seriesSummaryMetadata[0].StudyDescription;
      seriesSummaryMetadata.forEach(item => {
        if (study.ModalitiesInStudy.indexOf(item.Modality) === -1) {
          study.ModalitiesInStudy.push(item.Modality);
        }
      });
      study.NumberOfStudyRelatedSeries = seriesSummaryMetadata.length;
      _model.studies.push(study);
    }

    seriesSummaryMetadata.forEach(series => {
      const { SeriesInstanceUID } = series;

      study.setSeriesMetadata(SeriesInstanceUID, series);
    });

    this._broadcastEvent(EVENTS.SERIES_ADDED, {
      StudyInstanceUID,
      madeInClient,
    });
  },
  addStudy(study) {
    const { StudyInstanceUID } = study;

    const existingStudy = _model.studies.find(
      study => study.StudyInstanceUID === StudyInstanceUID
    );

    if (!existingStudy) {
      const newStudy = createStudyMetadata(StudyInstanceUID);

      newStudy.PatientID = study.PatientID;
      newStudy.PatientName = study.PatientName;
      newStudy.StudyDate = study.StudyDate;
      newStudy.ModalitiesInStudy = study.ModalitiesInStudy;
      newStudy.StudyDescription = study.StudyDescription;
      newStudy.AccessionNumber = study.AccessionNumber;
      newStudy.NumInstances = study.NumInstances; // todo: Correct naming?

      _model.studies.push(newStudy);
    }
  },
  getStudyInstanceUIDs: _getStudyInstanceUIDs,
  getStudy: _getStudy,
  getSeries: _getSeries,
  getInstance: _getInstance,
  getInstanceByImageId: _getInstanceByImageId,
  updateMetadataForSeries: _updateMetadataForSeries,
};
const DicomMetadataStore = Object.assign(
  // get study

  // iterate over all series

  {},
  BaseImplementation,
  pubSubServiceInterface
);

export { DicomMetadataStore };
export default DicomMetadataStore;
