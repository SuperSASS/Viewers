import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import OHIF, { utils } from '@ohif/core';
import {
  LoadingIndicatorProgress, Notification, useViewportDialog, useViewportGrid, ViewportActionBar
} from '@ohif/ui';
import createSEGToolGroupAndAddTools from '../utils/initSEGToolGroup';
import promptHydrateSEG from '../utils/promptHydrateSEG';
import hydrateSEGDisplaySet from '../utils/_hydrateSEG';
import _getStatusComponent from './_getStatusComponent';

const { formatDate } = utils;
const SEG_TOOLGROUP_BASE_NAME = 'SEGToolGroup';

function OHIFCornerstoneSEGViewport(props) {
  //#region 这一部分都是获取各种属性、上下文和服务的
  const {
    children,
    displaySets,
    viewportOptions,
    viewportIndex,
    viewportLabel,
    servicesManager,
    extensionManager,
  } = props;

  const { t } = useTranslation('SEGViewport');

  const {
    displaySetService,
    toolGroupService,
    segmentationService,
    uiNotificationService,
  } = servicesManager.services;

  const toolGroupId = `${SEG_TOOLGROUP_BASE_NAME}-${viewportIndex}`;

  // SEG viewport will always have a single display set
  if (displaySets.length > 1) {
    throw new Error('SEG viewport should only have a single display set');
  }

  const segDisplaySet = displaySets[0];

  const [viewportGrid, viewportGridService] = useViewportGrid(); // 有关viewportGrid的上下文，第二个就是viewportGirdService
  const [viewportDialogState, viewportDialogApi] = useViewportDialog(); // 有关viewportDialog的上下文，具体用法在UI中讲
  //#endregion

  //#region 状态
  // 有关ToolGroup的状态，但其实并没有读取
  const [isToolGroupCreated, setToolGroupCreated] = useState(false);
  // 选择的Segment
  const [selectedSegment, setSelectedSegment] = useState(1);

  // Hydration 意思就是把SEG打开(open)，会加载标签，也会被渲染到ReferenceSeries上（要有相同frameOfReferenceUID）
  // Hydration means that the SEG is opened and segments are loaded into the
  // segmentation panel, and SEG is also rendered on any viewport that is in the
  // same frameOfReferenceUID as the referencedSeriesUID of the SEG. However,
  // loading basically means SEG loading over network and bit unpacking of the
  // SEG data.
  const [isHydrated, setIsHydrated] = useState(segDisplaySet.isHydrated);
  // Load 读取意味着从网络上获取SEG文件的数据流，并进行解包
  const [segIsLoading, setSegIsLoading] = useState(!segDisplaySet.isLoaded);
  // 啥？
  const [element, setElement] = useState(null);
  // 有关标签文件加载的进度状态
  const [processingProgress, setProcessingProgress] = useState({
    segmentIndex: 1,
    totalSegments: null,
  });
  //#endregion

  //#region Ref
  // 应该是指向SEG参照影像
  const referencedDisplaySetRef = useRef(null);
  //#endregion

  //#region 常量、回调函数
  const { viewports, activeViewportIndex } = viewportGrid;

  // 获取该SEG的Referenced影像的DisplaySet、以及一个临时的ReferencedDisplaySetMetadata类型变量
  const referencedDisplaySet = segDisplaySet.getReferenceDisplaySet();
  const referencedDisplaySetMetadata = _getReferencedDisplaySetMetadata(referencedDisplaySet);

  // 修改Ref，时期指向被参考的DisplaySet
  referencedDisplaySetRef.current = {
    displaySet: referencedDisplaySet,
    metadata: referencedDisplaySetMetadata,
  };

  /**
   * 跟HTML的Element有关，启用后会setElement为启用的HTML Element
   * 但暂时不了解深层，可能不是重点
   * OnElementEnabled callback which is called after the cornerstoneExtension
   * has enabled the element. Note: we delegate all the image rendering to
   * cornerstoneExtension, so we don't need to do anything here regarding
   * the image rendering, element enabling etc.
   */
  const onElementEnabled = evt => {
    setElement(evt.detail.element);
  };
  const onElementDisabled = () => {
    setElement(null);
  };
  //#endregion

  //#region Hook - 回调
  // 获得Cornerstone的Viewport，用来实际呈现【SEGViewport本身不提供Viewport定义，只负责数据处理传递
  const getCornerstoneViewport = useCallback(() => {
    const { component: Component } = extensionManager.getModuleEntry(
      '@ohif/extension-cornerstone.viewportModule.cornerstone'
    );

    const {
      displaySet: referencedDisplaySet, // 得到reference的displaySet
    } = referencedDisplaySetRef.current;

    // Todo: jump to the center of the first segment
    return (
      <Component
        {...props}
        displaySets={[referencedDisplaySet, segDisplaySet]} // ⭐这里就非常牛皮了：即传seg也穿reference的displaySet
        viewportOptions={{
          viewportType: 'volume',
          toolGroupId: toolGroupId,
          orientation: viewportOptions.orientation,
          viewportId: viewportOptions.viewportId,
        }}
        onElementEnabled={onElementEnabled}
        onElementDisabled={onElementDisabled}
      // initialImageIndex={initialImageIndex}
      ></Component>
    );
  }, [viewportIndex, segDisplaySet, toolGroupId]);

  const onSegmentChange = useCallback(
    direction => {
      direction = direction === 'left' ? -1 : 1;
      const segmentationId = segDisplaySet.displaySetInstanceUID;
      const segmentation = segmentationService.getSegmentation(segmentationId);

      const { segments } = segmentation;

      const numberOfSegments = Object.keys(segments).length;

      let newSelectedSegmentIndex = selectedSegment + direction;

      if (newSelectedSegmentIndex > numberOfSegments - 1) {
        newSelectedSegmentIndex = 1;
      } else if (newSelectedSegmentIndex === 0) {
        newSelectedSegmentIndex = numberOfSegments - 1;
      }

      segmentationService.jumpToSegmentCenter(
        segmentationId,
        newSelectedSegmentIndex,
        toolGroupId
      );
      setSelectedSegment(newSelectedSegmentIndex);
    },
    [selectedSegment]
  );
  //#endregion

  //#region Hook - 副作用/监听/初始化
  // 弹出是否要加载标签那个Notification的
  useEffect(() => {
    if (segIsLoading) { // 在还在加载的时候，不弹出
      return;
    }

    promptHydrateSEG({
      servicesManager,
      viewportIndex,
      segDisplaySet,
    }).then(isHydrated => {
      if (isHydrated) {
        setIsHydrated(true);
      }
    });
  }, [servicesManager, viewportIndex, segDisplaySet, segIsLoading]);

  // 监听segmentationService的SEGMENTATION_PIXEL_DATA_CREATED（加载完Segmentation）
  // 当加载好Segmentation（各个标签(Segment)父集合）后，设置SegIsLoading = false，完成Seg加载结束等待
  useEffect(() => {
    const { unsubscribe } = segmentationService.subscribe(
      segmentationService.EVENTS.SEGMENTATION_PIXEL_DATA_CREATED,
      evt => {
        if (evt.segDisplaySet.displaySetInstanceUID === segDisplaySet.displaySetInstanceUID) {
          setSegIsLoading(false);
        }
        if (evt.overlappingSegments) {
          uiNotificationService.show({
            title: 'Overlapping Segments',
            message:
              'Overlapping segments detected which is not currently supported',
            type: 'warning',
          });
        }
        /// #+核心代码修改
        const t = evt.derivedVolume;
        /// #-
      }
    );

    return () => {
      unsubscribe();
    };
  }, [segDisplaySet]);

  // 监听segmentationService的SEGMENT_PIXEL_DATA_CREATED（加载完某一个Segment）
  // 当加载每一个Segment时，调用，会更新加载数量(segmentIndex / totalSegments)，从而更新加载进度条
  useEffect(() => {
    const { unsubscribe } = segmentationService.subscribe(
      segmentationService.EVENTS.SEGMENT_PIXEL_DATA_CREATED,
      ({ segmentIndex, numSegments }) => {
        setProcessingProgress({
          segmentIndex,
          totalSegments: numSegments,
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [segDisplaySet]);

  /**
   * 订阅displaySetService事件DISPLAY_SETS_REMOVED
   * 当DisplaySet（暂时不清楚是不是只指SEG的，但感觉应该不是）被移除后，
   * 会使得当前viewport（viweports[activeViewportIndex]））更新（移除）Display（感觉好像是完全不显示）
   * Cleanup the SEG viewport when the viewport is destroyed
   */
  useEffect(() => {
    const onDisplaySetsRemovedSubscription = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_REMOVED,
      ({ displaySetInstanceUIDs }) => {
        const activeViewport = viewports[activeViewportIndex];
        if (
          displaySetInstanceUIDs.includes(activeViewport.displaySetInstanceUID)
        ) {
          viewportGridService.setDisplaySetsForViewport({
            viewportIndex: activeViewportIndex,
            displaySetInstanceUIDs: [],
          });
        }
      }
    );

    return () => {
      onDisplaySetsRemovedSubscription.unsubscribe();
    };
  }, []);

  // 注册工具组
  /// 如果存在，就return；否则按util/createSEGToolGroupAndAddTools注册三个工具：WL/Zoom/Pan
  useEffect(() => {
    let toolGroup = toolGroupService.getToolGroup(toolGroupId);

    if (toolGroup) {
      return;
    }

    // This creates a custom tool group which has the lifetime of this view
    // only, and does NOT interfere with currently displayed segmentations.
    toolGroup = createSEGToolGroupAndAddTools(
      toolGroupService,
      toolGroupId,
      extensionManager
    );

    setToolGroupCreated(true);

    return () => {
      // remove the segmentation representations if seg displayset changed
      segmentationService.removeSegmentationRepresentationFromToolGroup(
        toolGroupId
      );

      // Only destroy the viewport specific implementation
      toolGroupService.destroyToolGroup(toolGroupId);
    };
  }, []);

  // 监听segDisplaySet是否发生改变【但我觉得应该不会变吧
  useEffect(() => {
    setIsHydrated(segDisplaySet.isHydrated);

    return () => {
      // remove the segmentation representations if seg displayset changed
      // 如果segDisplaySet，应当要移除原来的Segmentation Representations
      segmentationService.removeSegmentationRepresentationFromToolGroup(
        toolGroupId
      );
      referencedDisplaySetRef.current = null;
    };
  }, [segDisplaySet]);
  //#endregion

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  let childrenWithProps = null;

  // 影像参考配对有问题，会导致无法显示，故直接return
  if (
    !referencedDisplaySetRef.current ||
    referencedDisplaySet.displaySetInstanceUID !== referencedDisplaySetRef.current.displaySet.displaySetInstanceUID
  ) {
    return null;
  }

  // 渲染children元素
  if (children && children.length) {
    childrenWithProps = children.map((child, index) => {
      return (
        child &&
        React.cloneElement(child, {
          viewportIndex,
          key: index,
        })
      );
    });
  }

  const {
    PatientID,
    PatientName,
    PatientSex,
    PatientAge,
    SliceThickness,
    ManufacturerModelName,
    StudyDate,
    SeriesDescription,
    SpacingBetweenSlices,
  } = referencedDisplaySetRef.current.metadata;

  // 状态栏的LOAD按钮的处理函数
  const onStatusClick = async () => {
    const isHydrated = await hydrateSEGDisplaySet({
      segDisplaySet,
      viewportIndex,
      servicesManager,
    });

    setIsHydrated(isHydrated);
  };

  return (
    <>
      {/* 上方状态栏 */}
      <ViewportActionBar
        onDoubleClick={evt => {
          evt.stopPropagation();
          evt.preventDefault();
        }}
        onArrowsClick={onSegmentChange}
        // 这个是获取状态来的（比如有那个LOAD按钮）
        getStatusComponent={() => {
          return _getStatusComponent({
            isHydrated,
            onStatusClick, // 这个是点击那个LOAD按钮后，执行的操作(hydrateSEGDisplaySet)
          });
        }}
        studyData={{
          label: viewportLabel,
          useAltStyling: true,
          studyDate: formatDate(StudyDate),
          seriesDescription: `SEG Viewport ${SeriesDescription}`,
          patientInformation: {
            patientName: PatientName
              ? OHIF.utils.formatPN(PatientName.Alphabetic)
              : '',
            patientSex: PatientSex || '',
            patientAge: PatientAge || '',
            MRN: PatientID || '',
            thickness: SliceThickness ? `${SliceThickness.toFixed(2)}mm` : '',
            spacing:
              SpacingBetweenSlices !== undefined
                ? `${SpacingBetweenSlices.toFixed(2)}mm`
                : '',
            scanner: ManufacturerModelName || '',
          },
        }}
      />

      <div className="relative flex flex-row w-full h-full overflow-hidden">
        {segIsLoading && (
          <LoadingIndicatorProgress
            className="w-full h-full"
            progress={
              processingProgress.totalSegments !== null
                ? ((processingProgress.segmentIndex + 1) /
                  processingProgress.totalSegments) *
                100
                : null
            }
            textBlock={
              !processingProgress.totalSegments ? (
                // 这是最开始的时候，此时processingProgress还未被设置（没有一个segment被SegmentationService加载），出现的Loading SEG...
                <span className="text-white text-sm">Loading SEG ...</span>
              ) : (
                // 这是过一会，正在加载每个Segement
                <span className="text-white text-sm flex items-baseline space-x-2">
                  <div>Loading Segment</div>
                  <div className="w-3">{`${processingProgress.segmentIndex}`}</div>
                  <div>/</div>
                  <div>{`${processingProgress.totalSegments}`}</div>
                </span>
              )
            }
          />
        )}
        {/* 这里关键！其实是内嵌了CornerstoneViewport的，但！与直接用csVP不同：这里传了本身seg以及reference的displaySet，比起直接用不会报错 */}
        {getCornerstoneViewport()}
        <div className="absolute w-full">
          {viewportDialogState.viewportIndex === viewportIndex && (
            <Notification
              id="viewport-notification"
              message={viewportDialogState.message}
              type={viewportDialogState.type}
              actions={viewportDialogState.actions}
              onSubmit={viewportDialogState.onSubmit}
              onOutsideClick={viewportDialogState.onOutsideClick}
            />
          )}
        </div>
        {childrenWithProps}
      </div>
    </>
  );
}

OHIFCornerstoneSEGViewport.propTypes = {
  displaySets: PropTypes.arrayOf(PropTypes.object),
  viewportIndex: PropTypes.number.isRequired,
  dataSource: PropTypes.object,
  children: PropTypes.node,
  customProps: PropTypes.object,
};

OHIFCornerstoneSEGViewport.defaultProps = {
  customProps: {},
};

function _getReferencedDisplaySetMetadata(referencedDisplaySet) {
  const image0 = referencedDisplaySet.images[0];
  const referencedDisplaySetMetadata = {
    PatientID: image0.PatientID,
    PatientName: image0.PatientName,
    PatientSex: image0.PatientSex,
    PatientAge: image0.PatientAge,
    SliceThickness: image0.SliceThickness,
    StudyDate: image0.StudyDate,
    SeriesDescription: image0.SeriesDescription,
    SeriesInstanceUID: image0.SeriesInstanceUID,
    SeriesNumber: image0.SeriesNumber,
    ManufacturerModelName: image0.ManufacturerModelName,
    SpacingBetweenSlices: image0.SpacingBetweenSlices,
  };

  return referencedDisplaySetMetadata;
}

export default OHIFCornerstoneSEGViewport;
