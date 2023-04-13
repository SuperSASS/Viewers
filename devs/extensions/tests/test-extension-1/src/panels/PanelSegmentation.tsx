import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { SegmentationGroupTable, Button, Select } from '@ohif/ui';
import callInputDialog from '../utils/callInputDialog';
import callModelDialog from '../utils/callModelDialog';
import callReprocessDialog from '../utils/callReprocessDialog';
import api, { ApplyModelAllType, GetModelsDataType, DownloadSegType } from "../../../../../utils/api";

// import callColorPickerDialog from './callColorPickerDialog';

type ModelListType = {
  value: string;
  label: string;
  description: string;
}

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
  // 选择模型的index
  const [modelIndex, setModelIndex] = useState(0);
  // 模型列表
  const [modelList, setModelList] = useState<Array<ModelListType>>([]);
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
  useEffect(async () => {
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

    // 通过API，获取模型列表，用setModelList([{}, {}, ...])设置
    const resopnse = api.GetModels();
    resopnse.then(resopnse => {
      const modelList: Array<ModelListType> = [];
      resopnse.data.Result.forEach(item => {
        modelList.push({
          value: item.Id,
          label: item.Id + ' - ' + item.Name,
          description: item.Description,
        })
      })
      setModelList(modelList);
    })

    // setModelList([{ value: "0", label: "测试1", description: "悬浮文字1" }, { value: "1", label: "测试2", description: "悬浮文字2" }]); //仅供测试

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

  // 设置Segmentation组的配置【不知道干啥的
  const setSegmentationConfiguration = useCallback(
    (segmentationId, key, value) => {
      SegmentationService.setConfiguration({
        segmentationId,
        [key]: value,
      });
    },
    [SegmentationService]
  );

  // Segmentation添加，已废弃
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

  // 单个Segment标签添加
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

  //#region 回调函数 - 按钮
  // 应用模型分割
  const onApplyModelClick = async () => {
    if (modelIndex == 0) {
      UINotificationService.show({
        title: "AI模型分割失败",
        message: "请选择模型。",
        type: "error",
      })
      return;
    }
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
      ModelId: modelIndex[0],
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

  // 下载影像
  const onDownloadSeg = async () => {
    const viewportState = ViewportGridService.getState();
    const displaySetInstanceUID = viewportState.viewports[viewportState.activeViewportIndex].displaySetInstanceUIDs;
    const displaySet = DisplaySetService.getDisplaySetByUID(displaySetInstanceUID[0]);
    const studyUid = displaySet.StudyInstanceUID;
    const seriesUid = displaySet.SeriesInstanceUID;
    // const instanceUid = displaySet.images[0].SOPInstanceUID;
    const instanceUid = displaySet.Modality == "SEG" ? displaySet.SOPInstanceUID : displaySet.images[0].SOPInstanceUID;
    const data: DownloadSegType = {
      studyUid,
      seriesUid,
      instanceUid,
    };
    try {
      const response: any = await api.DownloadSeg(data);
      const url = response.data.url
      const link = document.createElement('a');
      link.href = `http://localhost:8042/instances/${url}/file`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    catch (e) {
      UINotificationService.show({
        title: "影像导出失败",
        message: e.message,
        type: "error",
      });
    }
  };

  // 上传模型
  const OnModelUpload = () => {
    callModelDialog(
      UIDialogService,
      { modelName: "", modelDescription: "" },
      (model, actionId) => { }
    )
  };

  // 上传后处理脚本
  const OnReprocess = () => {
    callReprocessDialog(
      UIDialogService,
      { Script: "" },
      (model, actionId) => { }
    )
  };
  //#endregion

  //#region 其他辅助函数
  const getToolGroupIds = segmentationId => {
    const toolGroupIds = SegmentationService.getToolGroupIdsWithSegmentation(
      segmentationId
    );

    return toolGroupIds;
  };
  //#endregion

  return (
    <div className="flex flex-col flex-auto min-h-0 mt-1">
      <div className="flex mx-4 my-4 space-x-4 justify-center">
        <Button onClick={onApplyModelClick} color="primary">
          应用模型分割
        </Button>
      </div>
      <div className="flex mx-4 my-4 space-x-4 justify-center">
        <Button onClick={OnModelUpload} color="primary">
          上传模型
        </Button>
      </div>
      <div className="flex mx-4 my-4 space-x-4 justify-center">
        <Button onClick={OnReprocess} color="primary">
          自定义后处理
        </Button>
      </div>
      <div className="flex mx-4 my-4 space-x-4 justify-center">
        <Button onClick={onDownloadSeg} color="primary">
          导出
        </Button>
      </div>
      <div className="flex h-32">
        {/* <Dropdown
          id="dropdown-1"
          list={[
            {
              icon: 'clipboard',
              onClick: () => { },
              title: 'Item 1'
            },
            {
              icon: 'tracked',
              onClick: function noRefCheck() { },
              title: 'Item 2'
            }
          ]}
        >
          <IconButton
            id={'options-settings-icon'}
            variant="text"
            color="inherit"
            size="initial"
            className="text-primary-active"
          >
            <Icon name="settings" />
          </IconButton>
          <div className="text-black">
            Drop Down
          </div>
        </Dropdown> */}
        <Select
          className="mt-2 text-white"
          isClearable={false}
          value={modelIndex}
          data-cy="file-type"
          onChange={value => {
            setModelIndex([value.value]);
          }}
          hideSelectedOptions={false}
          options={modelList}
          getOptionLabel={(opt) => (<span title={opt.description}>{opt.label}</span>)}
          placeholder="模型选择："
        />
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
