import React, { useEffect, useRef, useCallback, useState } from 'react';
import ReactResizeDetector from 'react-resize-detector';
import PropTypes from 'prop-types';
import * as cs3DTools from '@cornerstonejs/tools';
import {
  Enums,
  eventTarget,
  getEnabledElement,
  StackViewport,
  utilities as csUtils,
  CONSTANTS,
} from '@cornerstonejs/core';

import { setEnabledElement } from '../state';

import './OHIFCornerstoneViewport.css';
import CornerstoneOverlays from './Overlays/CornerstoneOverlays';
import {
  IStackViewport,
  IVolumeViewport,
} from '@cornerstonejs/core/dist/esm/types';
import getSOPInstanceAttributes from '../utils/measurementServiceMappings/utils/getSOPInstanceAttributes';
import { CinePlayer, useCine, useViewportGrid } from '@ohif/ui';

const STACK = 'stack';

function areEqual(prevProps, nextProps) {
  if (nextProps.needsRerendering) {
    return false;
  }

  if (prevProps.displaySets.length !== nextProps.displaySets.length) {
    return false;
  }

  if (
    prevProps.viewportOptions.orientation !==
    nextProps.viewportOptions.orientation
  ) {
    return false;
  }

  if (
    prevProps.viewportOptions.toolGroupId !==
    nextProps.viewportOptions.toolGroupId
  ) {
    return false;
  }

  if (
    prevProps.viewportOptions.viewportType !==
    nextProps.viewportOptions.viewportType
  ) {
    return false;
  }

  const prevDisplaySets = prevProps.displaySets;
  const nextDisplaySets = nextProps.displaySets;

  if (prevDisplaySets.length !== nextDisplaySets.length) {
    return false;
  }

  for (let i = 0; i < prevDisplaySets.length; i++) {
    const prevDisplaySet = prevDisplaySets[i];

    const foundDisplaySet = nextDisplaySets.find(
      nextDisplaySet =>
        nextDisplaySet.displaySetInstanceUID ===
        prevDisplaySet.displaySetInstanceUID
    );

    if (!foundDisplaySet) {
      return false;
    }

    // check they contain the same image
    if (foundDisplaySet.images?.length !== prevDisplaySet.images?.length) {
      return false;
    }

    // check if their imageIds are the same
    if (foundDisplaySet.images?.length) {
      for (let j = 0; j < foundDisplaySet.images.length; j++) {
        if (
          foundDisplaySet.images[j].imageId !== prevDisplaySet.images[j].imageId
        ) {
          return false;
        }
      }
    }
  }

  return true;
}

// Todo: This should be done with expose of internal API similar to react-vtkjs-viewport
// Then we don't need to worry about the re-renders if the props change.
const OHIFCornerstoneViewport = React.memo(props => {
  const {
    viewportIndex,
    displaySets,
    dataSource,
    viewportOptions,
    displaySetOptions,
    servicesManager,
    onElementEnabled,
    onElementDisabled,
    // Note: you SHOULD NOT use the initialImageIdOrIndex for manipulation
    // of the imageData in the OHIFCornerstoneViewport. This prop is used
    // to set the initial state of the viewport's first image to render
    initialImageIndex,
  } = props;

  const [scrollbarHeight, setScrollbarHeight] = useState('100px');
  const [{ isCineEnabled, cines }, cineService] = useCine();
  const [{ activeViewportIndex }] = useViewportGrid();
  const [enabledVPElement, setEnabledVPElement] = useState(null); // 这个也只跟Cine有关

  const elementRef = useRef(); // 这个才是最终展示的影像数据

  const {
    measurementService,
    displaySetService,
    toolbarService,
    toolGroupService,
    syncGroupService,
    cornerstoneViewportService,
    cornerstoneCacheService,
    viewportGridService,
    stateSyncService,
  } = servicesManager.services;

  //#region 应该都是有关Cines播放的
  const cineHandler = () => {
    if (!cines || !cines[viewportIndex] || !enabledVPElement) {
      return;
    }

    const cine = cines[viewportIndex];
    const isPlaying = cine.isPlaying || false;
    const frameRate = cine.frameRate || 24;

    const validFrameRate = Math.max(frameRate, 1);

    if (isPlaying) {
      cineService.playClip(enabledVPElement, {
        framesPerSecond: validFrameRate,
      });
    } else {
      cineService.stopClip(enabledVPElement);
    }
  };

  useEffect(() => {
    eventTarget.addEventListener(
      Enums.Events.STACK_VIEWPORT_NEW_STACK,
      cineHandler
    );

    return () => {
      cineService.setCine({ id: viewportIndex, isPlaying: false });
      eventTarget.removeEventListener(
        Enums.Events.STACK_VIEWPORT_NEW_STACK,
        cineHandler
      );
    };
  }, [enabledVPElement]);

  useEffect(() => {
    if (!cines || !cines[viewportIndex] || !enabledVPElement) {
      return;
    }

    cineHandler();

    return () => {
      if (enabledVPElement && cines?.[viewportIndex]?.isPlaying) {
        cineService.stopClip(enabledVPElement);
      }
    };
  }, [cines, viewportIndex, cineService, enabledVPElement, cineHandler]);

  const cine = cines[viewportIndex];
  const isPlaying = (cine && cine.isPlaying) || false;

  const handleCineClose = () => {
    toolbarService.recordInteraction({
      groupId: 'MoreTools',
      itemId: 'cine',
      interactionType: 'toggle',
      commands: [
        {
          commandName: 'toggleCine',
          commandOptions: {},
          context: 'CORNERSTONE',
        },
      ],
    });
  };
  //#endregion

  // useCallback for scroll bar height calculation
  // （无需认识）与右侧滑动条有关的
  const setImageScrollBarHeight = useCallback(() => {
    const scrollbarHeight = `${elementRef.current.clientHeight - 20}px`;
    setScrollbarHeight(scrollbarHeight);
  }, [elementRef]);

  // useCallback for onResize
  // （应该不需要）当尺寸变化时调用，重设尺寸
  const onResize = useCallback(() => {
    if (elementRef.current) {
      cornerstoneViewportService.resize();
      setImageScrollBarHeight();
    }
  }, [elementRef]);

  // （应该不需要）存储展示方式的(LUT, Position)
  const storePresentation = () => {
    const currentPresentation = cornerstoneViewportService.getPresentation(
      viewportIndex
    );
    if (!currentPresentation || !currentPresentation.presentationIds) return;
    const {
      lutPresentationStore,
      positionPresentationStore,
    } = stateSyncService.getState();
    const { presentationIds } = currentPresentation;
    const { lutPresentationId, positionPresentationId } = presentationIds || {};
    const storeState = {};
    if (lutPresentationId) {
      storeState.lutPresentationStore = {
        ...lutPresentationStore,
        [lutPresentationId]: currentPresentation,
      };
    }
    if (positionPresentationId) {
      storeState.positionPresentationStore = {
        ...positionPresentationStore,
        [positionPresentationId]: currentPresentation,
      };
    }
    stateSyncService.store(storeState);
  };

  // （应该不需要）清理服务的：toolGroupService、syncGroupService（这个只是删除同步，而没有删除同步的数据）
  const cleanUpServices = useCallback(() => {
    const viewportInfo = cornerstoneViewportService.getViewportInfoByIndex(
      viewportIndex
    );

    if (!viewportInfo) {
      return;
    }

    const viewportId = viewportInfo.getViewportId();
    const renderingEngineId = viewportInfo.getRenderingEngineId();
    const syncGroups = viewportInfo.getSyncGroups();

    toolGroupService.removeViewportFromToolGroup(viewportId, renderingEngineId);

    syncGroupService.removeViewportFromSyncGroup(
      viewportId,
      renderingEngineId,
      syncGroups
    );
  }, [viewportIndex, viewportOptions.viewportId]);

  // （应该不需要）当这个Viewport启动(.enable)后调用，主要的副作用有：注册toolGroupService、toolGroupService
  const elementEnabledHandler = useCallback(
    evt => {
      // check this is this element reference and return early if doesn't match
      if (evt.detail.element !== elementRef.current) {
        return;
      }

      const { viewportId, element } = evt.detail;
      const viewportInfo = cornerstoneViewportService.getViewportInfo(
        viewportId
      );
      const viewportIndex = viewportInfo.getViewportIndex();

      setEnabledElement(viewportIndex, element);
      setEnabledVPElement(element);

      const renderingEngineId = viewportInfo.getRenderingEngineId();
      const toolGroupId = viewportInfo.getToolGroupId();
      const syncGroups = viewportInfo.getSyncGroups();

      toolGroupService.addViewportToToolGroup(
        viewportId,
        renderingEngineId,
        toolGroupId
      );

      syncGroupService.addViewportToSyncGroup(
        viewportId,
        renderingEngineId,
        syncGroups
      );

      if (onElementEnabled) {
        onElementEnabled(evt);
      }
    },
    [viewportIndex, onElementEnabled, toolGroupService]
  );

  // （应该不需要，但为了enableViewport需要加一个ref和调这个）应该是把Viewport和HTML DOM元素(element)建立关联
  // disable the element upon unmounting
  useEffect(() => {
    cornerstoneViewportService.enableViewport(
      viewportIndex,
      viewportOptions,
      elementRef.current
    );

    eventTarget.addEventListener(
      Enums.Events.ELEMENT_ENABLED,
      elementEnabledHandler
    );

    setImageScrollBarHeight();

    // 清除副作用
    return () => {
      storePresentation(); // 这里还要先保存Presentation，调用stateSyncService

      cleanUpServices(); // 然后紧接着清除服务的连接（但没清楚数据）

      cornerstoneViewportService.disableElement(viewportIndex); // 断开Viewport与Element的连接

      if (onElementDisabled) { // 如果调组件传了该回调，调
        const viewportInfo = cornerstoneViewportService.getViewportInfoByIndex(
          viewportIndex
        );

        onElementDisabled(viewportInfo);
      }

      eventTarget.removeEventListener( // 移除ELEMENT_ENABLED监听
        Enums.Events.ELEMENT_ENABLED,
        elementEnabledHandler
      );
    };
  }, []);

  // （应该不需要）订阅DisplaySet服务的DISPLAY_SET_SERIES_METADATA_INVALIDATED(Metadata失效（或说更新）)
  // 【根本不知道什么时候会调用……
  // 如果元数据发生变化，需要重新渲染显示集，使其在视口中生效。
  // 但因为在加载中处理了缩放（？），需要从缓存中删除旧的Volume，并让Viewport重新添加它，这才能使用新的元数据
  // 否则视口将使用缓存的Volume，而新的Metadata（以及对应的Volume）将不会被使用
  // subscribe to displaySet metadata invalidation (updates)
  // Currently, if the metadata changes we need to re-render the display set
  // for it to take effect in the viewport. As we deal with scaling in the loading,
  // we need to remove the old volume from the cache, and let the
  // viewport to re-add it which will use the new metadata. Otherwise, the
  // viewport will use the cached volume and the new metadata will not be used.
  // Note: this approach does not actually end of sending network requests
  // and it uses the network cache
  useEffect(() => {
    const { unsubscribe } = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SET_SERIES_METADATA_INVALIDATED,
      async invalidatedDisplaySetInstanceUID => {
        // 获得新的ViewportInfo，其中包含新的ViewportData
        const viewportInfo = cornerstoneViewportService.getViewportInfoByIndex(
          viewportIndex
        );

        if (viewportInfo.hasDisplaySet(invalidatedDisplaySetInstanceUID)) {
          const viewportData = viewportInfo.getViewportData();
          // 调用cornerstoneCacheService的“失效ViewportData（实际上是更新新的ViewportData）函数”
          const newViewportData = await cornerstoneCacheService.invalidateViewportData(
            viewportData,
            invalidatedDisplaySetInstanceUID,
            dataSource,
            displaySetService
          );

          const keepCamera = true;
          // 更新新的ViewportData
          cornerstoneViewportService.updateViewport(
            viewportIndex,
            newViewportData,
            keepCamera
          );
        }
      }
    );
    return () => {
      unsubscribe();
    };
  }, [viewportIndex]);

  // ⭐这个应该是管理Viewport数据加载的
  // 在创建Viewport组建后，就会执行这里的东西，然后加载ViewportData！
  useEffect(() => {
    // 没给ViewportType，则默认定为STACK
    // handle the default viewportType to be stack
    if (!viewportOptions.viewportType) {
      viewportOptions.viewportType = STACK;
    }

    const loadViewportData = async () => {
      // 在这里只是创建了ViewportData，但对于非SEG类型，还没有读取像素数据
      const viewportData = await cornerstoneCacheService.createViewportData(
        displaySets,
        viewportOptions,
        dataSource,
        initialImageIndex
      );

      storePresentation();

      const {
        lutPresentationStore,
        positionPresentationStore,
      } = stateSyncService.getState();
      const { presentationIds } = viewportOptions;
      const presentations = {
        positionPresentation:
          positionPresentationStore[presentationIds?.positionPresentationId],
        lutPresentation:
          lutPresentationStore[presentationIds?.lutPresentationId],
      };

      // 这里面会运行具体的挂片协议的加载策略，从而进行像素数据的异步逐渐读取
      cornerstoneViewportService.setViewportData(
        viewportIndex,
        viewportData,
        viewportOptions,
        displaySetOptions,
        presentations
      );
    };

    loadViewportData();
  }, [viewportOptions, displaySets, dataSource]);

  // （用不到）有关Measurement跳转的
  /**
   * There are two scenarios for jump to click
   * 1. Current viewports contain the displaySet that the annotation was drawn on
   * 2. Current viewports don't contain the displaySet that the annotation was drawn on
   * and we need to change the viewports displaySet for jumping.
   * Since measurement_jump happens via events and listeners, the former case is handled
   * by the measurement_jump direct callback, but the latter case is handled first by
   * the viewportGrid to set the correct displaySet on the viewport, AND THEN we check
   * the cache for jumping to see if there is any jump queued, then we jump to the correct slice.
   */
  useEffect(() => {
    const unsubscribeFromJumpToMeasurementEvents = _subscribeToJumpToMeasurementEvents(
      measurementService,
      displaySetService,
      elementRef,
      viewportIndex,
      displaySets,
      viewportGridService,
      cornerstoneViewportService
    );

    _checkForCachedJumpToMeasurementEvents(
      measurementService,
      displaySetService,
      elementRef,
      viewportIndex,
      displaySets,
      viewportGridService,
      cornerstoneViewportService
    );

    return () => {
      unsubscribeFromJumpToMeasurementEvents();
    };
  }, [displaySets, elementRef, viewportIndex]);

  return (
    <div className="viewport-wrapper">
      <ReactResizeDetector
        handleWidth
        handleHeight
        skipOnMount={true} // Todo: make these configurable
        refreshMode={'debounce'}
        refreshRate={200} // transition amount in side panel
        onResize={onResize}
        targetRef={elementRef.current}
      />
      <div
        className="cornerstone-viewport-element"
        style={{ height: '100%', width: '100%' }}
        onContextMenu={e => e.preventDefault()}
        onMouseDown={e => e.preventDefault()}
        ref={elementRef}
      ></div>
      <CornerstoneOverlays
        viewportIndex={viewportIndex}
        toolbarService={toolbarService}
        element={elementRef.current}
        scrollbarHeight={scrollbarHeight}
        servicesManager={servicesManager}
      />
      {isCineEnabled && (
        <CinePlayer
          className="absolute left-1/2 -translate-x-1/2 bottom-3"
          isPlaying={isPlaying}
          onClose={handleCineClose}
          onPlayPauseChange={isPlaying =>
            cineService.setCine({
              id: activeViewportIndex,
              isPlaying,
            })
          }
          onFrameRateChange={frameRate =>
            cineService.setCine({
              id: activeViewportIndex,
              frameRate,
            })
          }
        />
      )}
    </div>
  );
}, areEqual);

// （用不到）订阅measurementService的JUMP_TO_MEASUREMENT事件
function _subscribeToJumpToMeasurementEvents(
  measurementService,
  displaySetService,
  elementRef,
  viewportIndex,
  displaySets,
  viewportGridService,
  cornerstoneViewportService
) {
  const displaysUIDs = displaySets.map(
    displaySet => displaySet.displaySetInstanceUID
  );
  const { unsubscribe } = measurementService.subscribe(
    measurementService.EVENTS.JUMP_TO_MEASUREMENT,
    ({ measurement }) => {
      if (!measurement) return;

      // Jump the the measurement if the viewport contains the displaySetUID (fusion)
      if (displaysUIDs.includes(measurement.displaySetInstanceUID)) {
        _jumpToMeasurement(
          measurement,
          elementRef,
          viewportIndex,
          measurementService,
          displaySetService,
          viewportGridService,
          cornerstoneViewportService
        );
      }
    }
  );

  return unsubscribe;
}

// （用不到）检查是否存在在队列中的"JumpToMeasurement"Event
// Check if there is a queued jumpToMeasurement event
function _checkForCachedJumpToMeasurementEvents(
  measurementService,
  displaySetService,
  elementRef,
  viewportIndex,
  displaySets,
  viewportGridService,
  cornerstoneViewportService
) {
  const displaysUIDs = displaySets.map(
    displaySet => displaySet.displaySetInstanceUID
  );

  const measurementIdToJumpTo = measurementService.getJumpToMeasurement(
    viewportIndex
  );

  if (measurementIdToJumpTo && elementRef) {
    // Jump to measurement if the measurement exists
    const measurement = measurementService.getMeasurement(
      measurementIdToJumpTo
    );

    if (displaysUIDs.includes(measurement.displaySetInstanceUID)) {
      _jumpToMeasurement(
        measurement,
        elementRef,
        viewportIndex,
        measurementService,
        displaySetService,
        viewportGridService,
        cornerstoneViewportService
      );
    }
  }
}

// （用不到）应该是点击Measurement的时候跳转到对应位置
function _jumpToMeasurement(
  measurement,
  targetElementRef,
  viewportIndex,
  measurementService,
  displaySetService,
  viewportGridService,
  cornerstoneViewportService
) {
  const targetElement = targetElementRef.current;
  const { displaySetInstanceUID, SOPInstanceUID, frameNumber } = measurement;

  if (!SOPInstanceUID) {
    console.warn('cannot jump in a non-acquisition plane measurements yet');
  }

  const referencedDisplaySet = displaySetService.getDisplaySetByUID(
    displaySetInstanceUID
  );

  // Todo: setCornerstoneMeasurementActive should be handled by the toolGroupManager
  //  to set it properly
  // setCornerstoneMeasurementActive(measurement);

  viewportGridService.setActiveViewportIndex(viewportIndex);

  const enableElement = getEnabledElement(targetElement);

  const viewportInfo = cornerstoneViewportService.getViewportInfoByIndex(
    viewportIndex
  );

  if (enableElement) {
    // See how the jumpToSlice() of Cornerstone3D deals with imageIdx param.
    const viewport = enableElement.viewport as IStackViewport | IVolumeViewport;

    let imageIdIndex = 0;
    let viewportCameraDirectionMatch = true;

    if (viewport instanceof StackViewport) {
      const imageIds = viewport.getImageIds();
      imageIdIndex = imageIds.findIndex(imageId => {
        const {
          SOPInstanceUID: aSOPInstanceUID,
          frameNumber: aFrameNumber,
        } = getSOPInstanceAttributes(imageId);
        return (
          aSOPInstanceUID === SOPInstanceUID &&
          (!frameNumber || frameNumber === aFrameNumber)
        );
      });
    } else {
      // for volume viewport we can't rely on the imageIdIndex since it can be
      // a reconstructed view that doesn't match the original slice numbers etc.
      const { viewPlaneNormal } = measurement.metadata;
      imageIdIndex = referencedDisplaySet.images.findIndex(
        i => i.SOPInstanceUID === SOPInstanceUID
      );

      const { orientation } = viewportInfo.getViewportOptions();

      if (
        orientation &&
        viewPlaneNormal &&
        !csUtils.isEqual(
          CONSTANTS.MPR_CAMERA_VALUES[orientation]?.viewPlaneNormal,
          viewPlaneNormal
        )
      ) {
        viewportCameraDirectionMatch = false;
      }
    }

    if (!viewportCameraDirectionMatch || imageIdIndex === -1) {
      return;
    }

    cs3DTools.utilities.jumpToSlice(targetElement, {
      imageIndex: imageIdIndex,
    });

    cs3DTools.annotation.selection.setAnnotationSelected(measurement.uid);
    // Jump to measurement consumed, remove.
    measurementService.removeJumpToMeasurement(viewportIndex);
  }
}

// Component displayName
OHIFCornerstoneViewport.displayName = 'OHIFCornerstoneViewport';

OHIFCornerstoneViewport.propTypes = {
  viewportIndex: PropTypes.number.isRequired,
  displaySets: PropTypes.array.isRequired,
  dataSource: PropTypes.object.isRequired,
  viewportOptions: PropTypes.object,
  displaySetOptions: PropTypes.arrayOf(PropTypes.any),
  servicesManager: PropTypes.object.isRequired,
  onElementEnabled: PropTypes.func,
  // Note: you SHOULD NOT use the initialImageIdOrIndex for manipulation
  // of the imageData in the OHIFCornerstoneViewport. This prop is used
  // to set the initial state of the viewport's first image to render
  initialImageIdOrIndex: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
};

export default OHIFCornerstoneViewport;
