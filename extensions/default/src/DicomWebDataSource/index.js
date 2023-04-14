import { api } from 'dicomweb-client';
import {
  DicomMetadataStore,
  IWebApiDataSource,
  utils,
  errorHandler,
  classes,
} from '@ohif/core';

import {
  mapParams,
  search as qidoSearch,
  seriesInStudy,
  processResults,
  processSeriesResults,
} from './qido.js';
import dcm4cheeReject from './dcm4cheeReject';

import getImageId from './utils/getImageId';
import dcmjs from 'dcmjs';
import {
  retrieveStudyMetadata,
  deleteStudyMetadataPromise,
} from './retrieveStudyMetadata.js';
import StaticWadoClient from './utils/StaticWadoClient.js';
import getDirectURL from '../utils/getDirectURL.js';

const { DicomMetaDictionary, DicomDict } = dcmjs.data;

const { naturalizeDataset, denaturalizeDataset } = DicomMetaDictionary;

const ImplementationClassUID =
  '2.25.270695996825855179949881587723571202391.2.0.0';
const ImplementationVersionName = 'OHIF-VIEWER-2.0.0';
const EXPLICIT_VR_LITTLE_ENDIAN = '1.2.840.10008.1.2.1';

const metadataProvider = classes.MetadataProvider;

/**
 *
 * @param {string} name - Data source name
 * @param {string} wadoUriRoot - Legacy? (potentially unused/replaced)
 * @param {string} qidoRoot - Base URL to use for QIDO requests
 * @param {string} wadoRoot - Base URL to use for WADO requests
 * @param {boolean} qidoSupportsIncludeField - Whether QIDO supports the "Include" option to request additional fields in response
 * @param {string} imageRengering - wadors | ? (unsure of where/how this is used)
 * @param {string} thumbnailRendering - wadors | ? (unsure of where/how this is used)
 * @param {bool} supportsReject - Whether the server supports reject calls (i.e. DCM4CHEE)
 * @param {bool} lazyLoadStudy - "enableStudyLazyLoad"; Request series meta async instead of blocking
 * @param {string|bool} singlepart - indicates of the retrieves can fetch singlepart.  Options are bulkdata, video, image or boolean true
 */
function createDicomWebApi(dicomWebConfig, userAuthenticationService) {
  const {
    qidoRoot,
    wadoRoot,
    enableStudyLazyLoad,
    supportsFuzzyMatching,
    supportsWildcard,
    supportsReject,
    staticWado,
    singlepart,
  } = dicomWebConfig;

  const qidoConfig = {
    url: qidoRoot,
    staticWado,
    singlepart,
    headers: userAuthenticationService.getAuthorizationHeader(),
    errorInterceptor: errorHandler.getHTTPErrorHandler(),
  };

  const wadoConfig = {
    url: wadoRoot,
    staticWado,
    singlepart,
    headers: userAuthenticationService.getAuthorizationHeader(),
    errorInterceptor: errorHandler.getHTTPErrorHandler(),
  };

  // TODO -> Two clients sucks, but its better than 1000.
  // TODO -> We'll need to merge auth later.
  const qidoDicomWebClient = staticWado
    ? new StaticWadoClient(qidoConfig)
    : new api.DICOMwebClient(qidoConfig);

  const wadoDicomWebClient = staticWado
    ? new StaticWadoClient(wadoConfig)
    : new api.DICOMwebClient(wadoConfig);

  const implementation = {
    // 这个会根据URL来返回一个请求的StudyInstanceUIDs【但感觉URL上应该只会请求一个，所以这里数组应当只有一个元素……
    initialize: ({ params, query }) => {
      const { StudyInstanceUIDs: paramsStudyInstanceUIDs } = params;
      const queryStudyInstanceUIDs = query.getAll('StudyInstanceUIDs');

      const StudyInstanceUIDs =
        (queryStudyInstanceUIDs.length && queryStudyInstanceUIDs) ||
        paramsStudyInstanceUIDs;
      const StudyInstanceUIDsAsArray =
        StudyInstanceUIDs && Array.isArray(StudyInstanceUIDs)
          ? StudyInstanceUIDs
          : [StudyInstanceUIDs];
      return StudyInstanceUIDsAsArray;
    },
    query: {
      studies: {
        mapParams: mapParams.bind(),
        search: async function (origParams) {
          const headers = userAuthenticationService.getAuthorizationHeader();
          if (headers) {
            qidoDicomWebClient.headers = headers;
          }

          const { studyInstanceUid, seriesInstanceUid, ...mappedParams } =
            mapParams(origParams, {
              supportsFuzzyMatching,
              supportsWildcard,
            }) || {};

          const results = await qidoSearch(
            qidoDicomWebClient,
            undefined,
            undefined,
            mappedParams
          );

          return processResults(results);
        },
        processResults: processResults.bind(),
      },
      series: {
        // mapParams: mapParams.bind(),
        search: async function (studyInstanceUid) {
          const headers = userAuthenticationService.getAuthorizationHeader();
          if (headers) {
            qidoDicomWebClient.headers = headers;
          }

          const results = await seriesInStudy(
            qidoDicomWebClient,
            studyInstanceUid
          );

          return processSeriesResults(results);
        },
        // processResults: processResults.bind(),
      },
      instances: {
        search: (studyInstanceUid, queryParameters) => {
          const headers = userAuthenticationService.getAuthorizationHeader();
          if (headers) {
            qidoDicomWebClient.headers = headers;
          }

          qidoSearch.call(
            undefined,
            qidoDicomWebClient,
            studyInstanceUid,
            null,
            queryParameters
          );
        },
      },
    },
    retrieve: {
      /**
       * Generates a URL that can be used for direct retrieve of the bulkdata
       *
       * @param {object} params
       * @param {string} params.tag is the tag name of the URL to retrieve
       * @param {object} params.instance is the instance object that the tag is in
       * @param {string} params.defaultType is the mime type of the response
       * @param {string} params.singlepart is the type of the part to retrieve
       * @returns an absolute URL to the resource, if the absolute URL can be retrieved as singlepart,
       *    or is already retrieved, or a promise to a URL for such use if a BulkDataURI
       */
      directURL: params => {
        return getDirectURL(wadoRoot, params);
      },
      // 这个指的是获取指定StudyInstanceUID下的所有Series
      series: {
        metadata: async ({
          StudyInstanceUID,
          filters,
          sortCriteria,
          sortFunction,
          madeInClient = false,
        } = {}) => {
          const headers = userAuthenticationService.getAuthorizationHeader();
          if (headers) {
            wadoDicomWebClient.headers = headers;
          }

          if (!StudyInstanceUID) {
            throw new Error(
              'Unable to query for SeriesMetadata without StudyInstanceUID'
            );
          }

          // 根据是否懒加载，调用异步或同步（阻塞式）查询SeriesMetadata
          if (enableStudyLazyLoad) {
            return implementation._retrieveSeriesMetadataAsync(
              StudyInstanceUID,
              filters,
              sortCriteria,
              sortFunction,
              madeInClient
            );
          }

          return implementation._retrieveSeriesMetadataSync(
            StudyInstanceUID,
            filters,
            sortCriteria,
            sortFunction,
            madeInClient
          );
        },
      },
    },

    store: {
      dicom: async dataset => {
        const headers = userAuthenticationService.getAuthorizationHeader();
        if (headers) {
          wadoDicomWebClient.headers = headers;
        }

        const meta = {
          FileMetaInformationVersion:
            dataset._meta.FileMetaInformationVersion.Value,
          MediaStorageSOPClassUID: dataset.SOPClassUID,
          MediaStorageSOPInstanceUID: dataset.SOPInstanceUID,
          TransferSyntaxUID: EXPLICIT_VR_LITTLE_ENDIAN,
          ImplementationClassUID,
          ImplementationVersionName,
        };

        const denaturalized = denaturalizeDataset(meta);
        const dicomDict = new DicomDict(denaturalized);

        dicomDict.dict = denaturalizeDataset(dataset);

        const part10Buffer = dicomDict.write();

        const options = {
          datasets: [part10Buffer],
        };

        await wadoDicomWebClient.storeInstances(options);
      },
    },
    // 获取指定StudyInstanceUID下的所有Series的Metadata，为同步式
    /// 即要等获取完，得到最终的**所有Series**结合在一起Metadata，存放到下面的data
    /// 【所有即指：该Study有3个Series，1个90Instance的CT、2个1Instance的SEG，则data.lenth = 92
    // 副作用：会将获取到的该Study所有的OHIF-Instances-Metadata存到DicomMetadataStore中
    _retrieveSeriesMetadataSync: async (
      StudyInstanceUID,
      filters,
      sortCriteria,
      sortFunction,
      madeInClient
    ) => {
      const enableStudyLazyLoad = false;

      // data is all SOPInstanceUIDs
      // data是该Study的所有SOPInstanceUIDs
      /// 格式：纯Metadata（DICOM格式Metadata），如data[0] = {00080008: {}, 00080012: {}, ...}
      const data = await retrieveStudyMetadata(
        wadoDicomWebClient,
        StudyInstanceUID,
        enableStudyLazyLoad,
        filters,
        sortCriteria,
        sortFunction
      );

      // first naturalize the data
      // 首先归一化（标准化？或者说OHIF化）Metadata
      /// 格式：OHIF式Metadata，如...[0] = {imageId: '...', Modality: "CT", SOPInstanceUID: "...", ...}
      const naturalizedInstancesMetadata = data.map(naturalizeDataset);

      const seriesSummaryMetadata = {}; // 有关这个series的简介metadata
      const instancesPerSeries = {}; // 将上面获取转化的OHIF式metadata，按照SeriesUid归类好，相当于每一个Series下具体的Instance-OHIF-Metadata

      naturalizedInstancesMetadata.forEach(instance => {
        if (!seriesSummaryMetadata[instance.SeriesInstanceUID]) { // 如果这个Instance所属的Series，没有简介metadata，那就创建，以其SeriesUID为索引
          seriesSummaryMetadata[instance.SeriesInstanceUID] = {
            StudyInstanceUID: instance.StudyInstanceUID,
            StudyDescription: instance.StudyDescription,
            SeriesInstanceUID: instance.SeriesInstanceUID,
            SeriesDescription: instance.SeriesDescription,
            SeriesNumber: instance.SeriesNumber,
            SeriesTime: instance.SeriesTime,
            SOPClassUID: instance.SOPClassUID,
            ProtocolName: instance.ProtocolName,
            Modality: instance.Modality,
          };
        }

        if (!instancesPerSeries[instance.SeriesInstanceUID]) {
          instancesPerSeries[instance.SeriesInstanceUID] = [];
        }

        // 获取那个imageId
        const imageId = implementation.getImageIdsForInstance({
          instance,
        });

        instance.imageId = imageId;

        // 暂时不明白干嘛的，可能是建立imageId与{Study+Seires+Instance}Uid的关系的？
        metadataProvider.addImageIdToUIDs(imageId, {
          StudyInstanceUID,
          SeriesInstanceUID: instance.SeriesInstanceUID,
          SOPInstanceUID: instance.SOPInstanceUID,
        });

        instancesPerSeries[instance.SeriesInstanceUID].push(instance); // 按SeriesUid归类
      });

      // grab all the series metadata
      // 存储这个Series的Metadata
      const seriesMetadata = Object.values(seriesSummaryMetadata); // 会把以SeriesUid为索引的seriesSummaryMetadata，转换为seriesMetadata数组
      DicomMetadataStore.addSeriesMetadata(seriesMetadata, madeInClient); // 调DicomMetadataStore服务，添加该Sereid的Metadata，参数为OHIF格式Metadata的数组

      // 添加每一个Instance-OHIF-Metadata
      /// 在这其中会广播DicomMetadataStore服务的INSTANCES_ADDED事件，会导致Mode的defaultRouteInit中订阅该事件的处理函数激活
      Object.keys(instancesPerSeries).forEach(seriesInstanceUID =>
        DicomMetadataStore.addInstances(
          instancesPerSeries[seriesInstanceUID],
          madeInClient
        )
      );
    },

    _retrieveSeriesMetadataAsync: async (
      StudyInstanceUID,
      filters,
      sortCriteria,
      sortFunction,
      madeInClient = false
    ) => {
      const enableStudyLazyLoad = true;
      // Get Series
      const {
        preLoadData: seriesSummaryMetadata,
        promises: seriesPromises,
      } = await retrieveStudyMetadata(
        wadoDicomWebClient,
        StudyInstanceUID,
        enableStudyLazyLoad,
        filters,
        sortCriteria,
        sortFunction
      );

      /**
       * naturalizes the dataset, and adds a retrieve bulkdata method
       * to any values containing BulkDataURI.
       * @param {*} instance
       * @returns naturalized dataset, with retrieveBulkData methods
       */
      const addRetrieveBulkData = instance => {
        const naturalized = naturalizeDataset(instance);
        Object.keys(naturalized).forEach(key => {
          const value = naturalized[key];
          // The value.Value will be set with the bulkdata read value
          // in which case it isn't necessary to re-read this.
          if (value && value.BulkDataURI && !value.Value) {
            // Provide a method to fetch bulkdata
            value.retrieveBulkData = () => {
              const options = {
                // The bulkdata fetches work with either multipart or
                // singlepart, so set multipart to false to let the server
                // decide which type to respond with.
                multipart: false,
                BulkDataURI: value.BulkDataURI,
                // The study instance UID is required if the bulkdata uri
                // is relative - that isn't disallowed by DICOMweb, but
                // isn't well specified in the standard, but is needed in
                // any implementation that stores static copies of the metadata
                StudyInstanceUID: naturalized.StudyInstanceUID,
              };
              // Todo: this needs to be from wado dicom web client
              return qidoDicomWebClient.retrieveBulkData(options).then(val => {
                const ret = (val && val[0]) || undefined;
                value.Value = ret;
                return ret;
              });
            };
          }
        });
        return naturalized;
      };

      // Async load series, store as retrieved
      function storeInstances(instances) {
        const naturalizedInstances = instances.map(addRetrieveBulkData);

        // Adding instanceMetadata to OHIF MetadataProvider
        naturalizedInstances.forEach((instance, index) => {
          instance.wadoRoot = dicomWebConfig.wadoRoot;
          instance.wadoUri = dicomWebConfig.wadoUri;

          const imageId = implementation.getImageIdsForInstance({
            instance,
          });

          // Adding imageId to each instance
          // Todo: This is not the best way I can think of to let external
          // metadata handlers know about the imageId that is stored in the store
          instance.imageId = imageId;

          // Adding UIDs to metadataProvider
          // Note: storing imageURI in metadataProvider since stack viewports
          // will use the same imageURI
          metadataProvider.addImageIdToUIDs(imageId, {
            StudyInstanceUID,
            SeriesInstanceUID: instance.SeriesInstanceUID,
            SOPInstanceUID: instance.SOPInstanceUID,
          });
        });

        DicomMetadataStore.addInstances(naturalizedInstances, madeInClient);
      }

      function setSuccessFlag() {
        const study = DicomMetadataStore.getStudy(
          StudyInstanceUID,
          madeInClient
        );
        study.isLoaded = true;
      }

      // Google Cloud Healthcare doesn't return StudyInstanceUID, so we need to add
      // it manually here
      seriesSummaryMetadata.forEach(aSeries => {
        aSeries.StudyInstanceUID = StudyInstanceUID;
      });

      DicomMetadataStore.addSeriesMetadata(seriesSummaryMetadata, madeInClient);

      const seriesDeliveredPromises = seriesPromises.map(promise =>
        promise.then(instances => {
          storeInstances(instances);
        })
      );
      await Promise.all(seriesDeliveredPromises);
      setSuccessFlag();
    },
    deleteStudyMetadataPromise,
    getImageIdsForDisplaySet(displaySet) {
      const images = displaySet.images;
      const imageIds = [];

      if (!images) {
        return imageIds;
      }

      displaySet.images.forEach(instance => {
        const NumberOfFrames = instance.NumberOfFrames;

        if (NumberOfFrames > 1) {
          for (let frame = 1; frame <= NumberOfFrames; frame++) {
            const imageId = this.getImageIdsForInstance({
              instance,
              frame,
            });
            imageIds.push(imageId);
          }
        } else {
          const imageId = this.getImageIdsForInstance({ instance });
          imageIds.push(imageId);
        }
      });

      return imageIds;
    },
    getImageIdsForInstance({ instance, frame }) {
      const imageIds = getImageId({
        instance,
        frame,
        config: dicomWebConfig,
      });
      return imageIds;
    },
    /// #+核心代码修改：增加了获取studyMetadata的功能实现
    retrieveStudyMetadatas: async (StudyInstanceUID) => {
      return await retrieveStudyMetadata(
        wadoDicomWebClient,
        StudyInstanceUID,
        enableStudyLazyLoad,
      );
    }
    /// #-
  };

  if (supportsReject) {
    implementation.reject = dcm4cheeReject(wadoRoot);
  }

  return IWebApiDataSource.create(implementation);
}

export { createDicomWebApi };
