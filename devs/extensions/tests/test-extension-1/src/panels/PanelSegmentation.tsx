import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { SegmentationGroupTable, Button } from '@ohif/ui';

import { ApplyModelAllType } from "../Utils/api";
import callInputDialog from '../Utils/callInputDialog';
import api from "../Utils/api";
// import callColorPickerDialog from './callColorPickerDialog';

export default function PanelSegmentation({
  servicesManager,
  commandsManager,
  extensionManager,
}) {
  const {
    SegmentationService,
    UIDialogService,
    ViewportGridService,
    UINotificationService,
    DisplaySetService,
    ToolGroupService,
    CornerstoneViewportService,
  } = servicesManager.services;

  //#region 状态
  // 所选择的分割标签的ID
  const [selectedSegmentationId, setSelectedSegmentationId] = useState(null);
  // 初始化的分割配置（应该就是Appearance）
  const [initialSegmentationConfigurations, setInitialSegmentationConfigurations,] = useState(SegmentationService.getConfiguration());
  // 加载得到的segmentations数据
  const [segmentations, setSegmentations] = useState(() => SegmentationService.getSegmentations());
  // 最小化
  const [isMinimized, setIsMinimized] = useState({});
  //#endregion

  //#region 副作用（初始化/监听）
  // Only expand the last segmentation added to the list and collapse the rest
  useEffect(() => {
    const lastSegmentationId = segmentations[segmentations.length - 1]?.id;
    if (lastSegmentationId) {
      setIsMinimized(prevState => ({
        ...prevState,
        [lastSegmentationId]: false,
      }));
    }
  }, [segmentations, setIsMinimized]);

  // 初始化 - 订阅Segmentation服务的事件
  useEffect(() => {
    const subscriptions = [] as any[];
    const eventAdded = SegmentationService.EVENTS.SEGMENTATION_ADDED;
    const eventUpdated = SegmentationService.EVENTS.SEGMENTATION_UPDATED;
    const eventRemoved = SegmentationService.EVENTS.SEGMENTATION_REMOVED;

    [eventAdded, eventUpdated, eventRemoved].forEach(evt => {
      const { unsubscribe } = SegmentationService.subscribe(evt, () => {
        const segmentations = SegmentationService.getSegmentations();
        setSegmentations(segmentations);
      });
      subscriptions.push(unsubscribe);
    });

    return () => {
      subscriptions.forEach(unsub => {
        unsub();
      });
    };
  }, []);
  //#endregion

  //#region 回调函数 - SegmentationGroupTable - 有关Segmentation的
  // Segmentation组切换最小化
  const onToggleMinimizeSegmentation = useCallback(
    id => {
      setIsMinimized(prevState => ({
        ...prevState,
        [id]: !prevState[id],
      }));
    },
    [setIsMinimized]
  );

  // const onSegmentationClick = (segmentationId: string) => {
  //   SegmentationService.setActiveSegmentationForToolGroup(segmentationId);
  // };

  // Segmentation组删除
  const onSegmentationDelete = (segmentationId: string) => {
    SegmentationService.remove(segmentationId);
  };

  // Segmentation组修改名字
  const onSegmentationEdit = segmentationId => {
    const segmentation = SegmentationService.getSegmentation(segmentationId);
    const { label } = segmentation;

    callInputDialog(UIDialogService, label, (label, actionId) => {
      if (label === '') {
        return;
      }
      SegmentationService.addOrUpdateSegmentation(
        {
          id: segmentationId,
          label,
        },
        false, // suppress event
        true // notYetUpdatedAtSource
      );
    });
  };

  // 切换整个Segmentation的可见性
  const onToggleSegmentationVisibility = segmentationId => {
    SegmentationService.toggleSegmentationVisibility(segmentationId);
  };

  const setSegmentationConfiguration = useCallback(
    (segmentationId, key, value) => {
      SegmentationService.setConfiguration({
        segmentationId,
        [key]: value,
      });
    },
    [SegmentationService]
  );
  //#endregion

  //#region 回调函数 - SegmentationGroupTable - 有关Segment的
  // 点击后选中该Segment
  const onSegmentClick = (segmentationId, segmentIndex) => {
    SegmentationService.setActiveSegmentForSegmentation(
      segmentationId,
      segmentIndex
    );

    const toolGroupIds = getToolGroupIds(segmentationId);

    toolGroupIds.forEach(toolGroupId => {
      // const toolGroupId =
      SegmentationService.setActiveSegmentationForToolGroup(
        segmentationId,
        toolGroupId
      );
      SegmentationService.jumpToSegmentCenter(
        segmentationId,
        segmentIndex,
        toolGroupId
      );
    });
  };

  // const onSegmentationAdd = () => {
  //   SegmentationService.addOrUpdateSegmentation(
  //     {
  //       id: segmentations ? 0 : segmentations[segmentations.length - 1].id + 1,
  //       label: "新标签",
  //     },
  //     false, // suppress event
  //     true // notYetUpdatedAtSource
  //   );
  // };

  const onSegmentAdd = () => {
    const segmentations = SegmentationService.getSegmentations();
    const segmentationId = segmentations[0].id;
    let newSegmentIndex = 0;
    for (const segment of segmentations[0].segments) { // 求得最大的segmentIndex
      if (!segment)
        continue;
      newSegmentIndex = Math.max(segment.segmentIndex, newSegmentIndex);
    }
    const toolGroupIds = getToolGroupIds(segmentationId);
    SegmentationService.addSegment(
      segmentationId,
      newSegmentIndex + 1,
      toolGroupIds[0],
      {
        label: "新标签"
      }
    );
  }

  // 单个Segment编辑名字
  const onSegmentEdit = (segmentationId, segmentIndex) => {
    const segmentation = SegmentationService.getSegmentation(segmentationId);

    const segment = segmentation.segments[segmentIndex];
    const { label } = segment;

    callInputDialog(UIDialogService, label, (label, actionId) => {
      if (label === '') {
        return;
      }

      SegmentationService.setSegmentLabelForSegmentation(
        segmentationId,
        segmentIndex,
        label
      );
    });
  };

  // 单个Segment切换颜色
  const onSegmentColorClick = (segmentationId, segmentIndex) => {
    console.log(1);
    return;
  };

  // 单个Segment删除
  const onSegmentDelete = (segmentationId, segmentIndex) => {
    SegmentationService.removeSegment(
      segmentationId,
      segmentIndex
    );
    // console.warn('not implemented yet');
  };

  // 切换单个Segment的可见性
  const onToggleSegmentVisibility = (segmentationId, segmentIndex) => {
    const segmentation = SegmentationService.getSegmentation(segmentationId);
    const segmentInfo = segmentation.segments[segmentIndex];
    const isVisible = !segmentInfo.isVisible;
    const toolGroupIds = getToolGroupIds(segmentationId);

    // Todo: right now we apply the visibility to all tool groups
    toolGroupIds.forEach(toolGroupId => {
      SegmentationService.setSegmentVisibility(
        segmentationId,
        segmentIndex,
        isVisible,
        toolGroupId
      );
    });
  };
  //#endregion


  const getToolGroupIds = segmentationId => {
    const toolGroupIds = SegmentationService.getToolGroupIdsWithSegmentation(
      segmentationId
    );

    return toolGroupIds;
  };

  //#region 回调函数 - 应用模型分割
  const onApplyModelClick = async () => {
    const id = UINotificationService.show({
      title: "AI模型分割中……",
      message: "请稍等，当预测完成后，该窗口会自动关闭，且分割结果会自动添加到左侧研究栏中。",
      autoClose: false,
    })
    const viewportState = ViewportGridService.getState();
    const displaySetInstanceUID = viewportState.viewports[viewportState.activeViewportIndex].displaySetInstanceUIDs;
    const displaySet = DisplaySetService.getDisplaySetByUID(displaySetInstanceUID[0]);

    const studyUid = displaySet.StudyInstanceUID;
    const seriesUid = displaySet.SeriesInstanceUID;

    const data: ApplyModelAllType = {
      studyUid,
      seriesUid,
      segType: 0,
    };

    try {
      const resopnse = await api.ApplyModelAll(data);
      UINotificationService.hide(id);
      // 更新series
      const dataSource = extensionManager.getActiveDataSource()[0];
      dataSource.deleteStudyMetadataPromise(studyUid); // 先要删除缓存
      dataSource.retrieve.series.metadata({
        StudyInstanceUID: studyUid
      });
      setTimeout(() =>
        UINotificationService.show({
          title: "AI模型分割完毕",
          message: "请在左侧研究栏中查看分割结果。",
        })
        , 900);
    }
    catch (e) {
      UINotificationService.hide(id);
      setTimeout(() =>
        UINotificationService.show({
          title: "AI模型分割失败",
          message: e.message,
          type: "error",
        })
        , 900);
    }
  };
  //#endregion

  return (
    <div className="flex flex-col flex-auto min-h-0 mt-1">
      <div className="flex mx-4 my-4 space-x-4 justify-center">
        <Button onClick={onApplyModelClick} color="primary">
          应用模型分割
        </Button>
      </div>
      {/* show segmentation table */}
      <SegmentationGroupTable
        segmentations={segmentations}
        segmentationConfig={{
          initialConfig: initialSegmentationConfigurations,
          usePercentage: true,
        }}
        showAddSegmentation={false}
        showAddSegment={true}
        showDeleteSegment={true}
        isMinimized={isMinimized}
        // onSegmentationAdd={onSegmentationAdd}
        onSegmentationEdit={onSegmentationEdit}
        // activeSegmentationId={selectedSegmentationId}
        // onSegmentationClick={onSegmentationClick}
        onSegmentationDelete={onSegmentationDelete}
        onToggleSegmentationVisibility={onToggleSegmentationVisibility}
        onToggleMinimizeSegmentation={onToggleMinimizeSegmentation}
        onSegmentClick={onSegmentClick}
        onSegmentAdd={onSegmentAdd}
        onSegmentDelete={onSegmentDelete}
        onSegmentEdit={onSegmentEdit}
        onSegmentColorClick={onSegmentColorClick}
        onToggleSegmentVisibility={onToggleSegmentVisibility}
        setRenderOutline={value =>
          setSegmentationConfiguration(
            selectedSegmentationId,
            'renderOutline',
            value
          )
        }
        setOutlineOpacityActive={value =>
          setSegmentationConfiguration(
            selectedSegmentationId,
            'outlineOpacity',
            value
          )
        }
        setRenderFill={value =>
          setSegmentationConfiguration(
            selectedSegmentationId,
            'renderFill',
            value
          )
        }
        setRenderInactiveSegmentations={value =>
          setSegmentationConfiguration(
            selectedSegmentationId,
            'renderInactiveSegmentations',
            value
          )
        }
        setOutlineWidthActive={value =>
          setSegmentationConfiguration(
            selectedSegmentationId,
            'outlineWidthActive',
            value
          )
        }
        setFillAlpha={value =>
          setSegmentationConfiguration(
            selectedSegmentationId,
            'fillAlpha',
            value
          )
        }
        setFillAlphaInactive={value =>
          setSegmentationConfiguration(
            selectedSegmentationId,
            'fillAlphaInactive',
            value
          )
        }
      />
    </div>
  );
}

// ------------

PanelSegmentation.propTypes = {
  commandsManager: PropTypes.shape({
    runCommand: PropTypes.func.isRequired,
  }),
  servicesManager: PropTypes.shape({
    services: PropTypes.shape({
      SegmentationService: PropTypes.shape({
        getSegmentation: PropTypes.func.isRequired,
        getSegmentations: PropTypes.func.isRequired,
        toggleSegmentationVisibility: PropTypes.func.isRequired,
        subscribe: PropTypes.func.isRequired,
        EVENTS: PropTypes.object.isRequired,
      }).isRequired,
    }).isRequired,
  }).isRequired,
};
