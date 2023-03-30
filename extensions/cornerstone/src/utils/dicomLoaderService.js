import { imageLoader } from '@cornerstonejs/core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import { api } from 'dicomweb-client';
import { DICOMWeb, errorHandler } from '@ohif/core';

const getImageId = imageObj => {
  if (!imageObj) {
    return;
  }

  return typeof imageObj.getImageId === 'function'
    ? imageObj.getImageId()
    : imageObj.url;
};

const findImageIdOnStudies = (studies, displaySetInstanceUID) => {
  const study = studies.find(study => {
    const displaySet = study.displaySets.some(
      displaySet => displaySet.displaySetInstanceUID === displaySetInstanceUID
    );
    return displaySet;
  });
  const { series = [] } = study;
  const { instances = [] } = series[0] || {};
  const instance = instances[0];

  return getImageId(instance);
};

const someInvalidStrings = strings => {
  const stringsArray = Array.isArray(strings) ? strings : [strings]; // 判断参数是否是字符串，如果是的话就直接作为参数；否则变为数组
  /// //~危险修改：由于本项目中URL应当为空('')，故用!string会被判定为非法，所以应当加一个string===''
  const emptyString = string => !string; // 一个匿名函数，如果有元素为空，则非法！
  let invalid = stringsArray.some(emptyString); // 开找！
  return invalid;
};

const getImageInstance = dataset => {
  return dataset && dataset.images && dataset.images[0];
};

const getNonImageInstance = dataset => {
  return dataset && dataset.instance;
};

const getImageInstanceId = imageInstance => {
  return getImageId(imageInstance);
};

const fetchIt = (url, headers = DICOMWeb.getAuthorizationHeader()) => {
  return fetch(url, headers).then(response => response.arrayBuffer());
};

const cornerstoneRetriever = imageId => {
  return imageLoader.loadAndCacheImage(imageId).then(image => {
    return image && image.data && image.data.byteArray.buffer;
  });
};

const wadorsRetriever = (
  url,
  studyInstanceUID,
  seriesInstanceUID,
  sopInstanceUID,
  headers = DICOMWeb.getAuthorizationHeader(),
  errorInterceptor = errorHandler.getHTTPErrorHandler()
) => {
  const config = {
    url,
    headers,
    errorInterceptor,
  };
  const dicomWeb = new api.DICOMwebClient(config);

  return dicomWeb.retrieveInstance({
    studyInstanceUID,
    seriesInstanceUID,
    sopInstanceUID,
  });
};

const getImageLoaderType = imageId => {
  const loaderRegExp = /^\w+\:/;
  const loaderType = loaderRegExp.exec(imageId);

  return (
    (loaderRegExp.lastIndex === 0 &&
      loaderType &&
      loaderType[0] &&
      loaderType[0].replace(':', '')) ||
    ''
  );
};

// 这个类目前可能只有被seg文件调用，因此只记这类文件
class DicomLoaderService {
  // 获得本地的data（imageID开头要为dicomfile）
  // 故一般这里不会成功
  getLocalData(dataset, studies) {
    // Use referenced imageInstance
    const imageInstance = getImageInstance(dataset);
    const nonImageInstance = getNonImageInstance(dataset);

    if (
      (!imageInstance && !nonImageInstance) ||
      !nonImageInstance.imageId.startsWith('dicomfile')
    ) {
      return;
    }

    const instance = imageInstance || nonImageInstance;

    let imageId = getImageInstanceId(instance);

    // or Try to get it from studies
    if (someInvalidStrings(imageId)) {
      imageId = findImageIdOnStudies(studies, dataset.displaySetInstanceUID);
    }

    if (!someInvalidStrings(imageId)) {
      return cornerstoneWADOImageLoader.wadouri.loadFileRequest(imageId);
    }
  }

  // 如果是ImageType（也就是CT那些才有用）
  // 所以这里也是直接返回
  getDataByImageType(dataset) {
    const imageInstance = getImageInstance(dataset);

    if (imageInstance) {
      const imageId = getImageInstanceId(imageInstance);
      let getDicomDataMethod = fetchIt;
      const loaderType = getImageLoaderType(imageId);

      switch (loaderType) {
        case 'dicomfile':
          getDicomDataMethod = cornerstoneRetriever.bind(this, imageId);
          break;
        case 'wadors':
          const url = imageInstance.getData().wadoRoot;
          const studyInstanceUID = imageInstance.getStudyInstanceUID();
          const seriesInstanceUID = imageInstance.getSeriesInstanceUID();
          const sopInstanceUID = imageInstance.getSOPInstanceUID();
          const invalidParams = someInvalidStrings([
            url,
            studyInstanceUID,
            seriesInstanceUID,
            sopInstanceUID,
          ]);
          if (invalidParams) {
            return;
          }

          getDicomDataMethod = wadorsRetriever.bind(
            this,
            url,
            studyInstanceUID,
            seriesInstanceUID,
            sopInstanceUID
          );
          break;
        case 'wadouri':
          // Strip out the image loader specifier
          imageId = imageId.substring(imageId.indexOf(':') + 1);

          if (someInvalidStrings(imageId)) {
            return;
          }
          getDicomDataMethod = fetchIt.bind(this, imageId);
          break;
        default:
          throw new Error(
            `Unsupported image type: ${loaderType} for imageId: ${imageId}`
          );
      }

      return getDicomDataMethod();
    }
  }

  getDataByDatasetType(dataset) {
    const {
      StudyInstanceUID,
      SeriesInstanceUID,
      SOPInstanceUID,
      authorizationHeaders,
      wadoRoot,
      wadoUri,
    } = dataset;
    // Retrieve wadors or just try to fetch wadouri
    // 这里会进行一个Invalid字段验证，可能是这里出问题！
    // 就是这出问题了！！！！！！！！……
    /// √关键错误原因：没有wadoRoot！……
    if (!someInvalidStrings(wadoRoot)) {
      return wadorsRetriever(
        wadoRoot,
        StudyInstanceUID,
        SeriesInstanceUID,
        SOPInstanceUID,
        authorizationHeaders
      );
    } else if (!someInvalidStrings(wadoUri)) {
      return fetchIt(wadoUri, { headers: authorizationHeaders });
    }
  }

  *getLoaderIterator(dataset, studies, headers) {
    yield this.getLocalData(dataset, studies);
    yield this.getDataByImageType(dataset);
    yield this.getDataByDatasetType(dataset);
  }

  findDicomDataPromise(dataset, studies, headers) {
    dataset.authorizationHeaders = headers;
    /// ~危险修改：临时添了个wadoRoot……
    /// ?错误原因：SEG的instance里就没有wadoRoot，详细可见"错误原因#1"
    dataset.wadoRoot = "/dicom-web";
    /// ~
    const loaderIterator = this.getLoaderIterator(dataset, studies);
    // it returns first valid retriever method.
    for (const loader of loaderIterator) {
      if (loader) {
        return loader;
      }
    }

    // in case of no valid loader
    throw new Error('Invalid dicom data loader');
  }
}

const dicomLoaderService = new DicomLoaderService();

export default dicomLoaderService;
