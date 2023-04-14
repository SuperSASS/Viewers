
import React, { useEffect, useState, useCallback } from 'react';
import { SegmentationGroupTable, Button } from "@ohif/ui";
import api, { ApplyModelAllType } from "../Utils/api";

import PropTypes from "prop-types";

export default function PanelTest({ servicesManager, commandsManager, extensionManager }) {
  /// 0.1 - 获取服务
  const { HangingProtocolService, DisplaySetService, ViewportGridService, UINotificationService } = servicesManager.services;
  // const dataSource = extensionManager.getActiveDataSource()[0];

  /// 1 - 逻辑代码
  /// 1.1 - 按钮回调函数
  const button1Handler = async () => {
    const id = UINotificationService.show({
      title: "AI模型分割中……",
      message: "1",//"请稍等，当预测完成后，该窗口会自动关闭，且分割结果会自动添加到左侧研究栏中。",
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
      apifoxResponseId: "182169153",
    };

    try {
      const resopnse = await api.ApplyModelAll(data);
      UINotificationService.hide(id);
      // 更新series
      const dataSource = extensionManager.getActiveDataSource()[0];
      dataSource.deleteStudyMetadataPromise(studyUid); // 先要删除缓存
      dataSource.retrieve.series.metadata({
        studyUid
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


  const buttonRunCommand = () => {
    const { customizationService } = servicesManager.services;

    const customRoutes = customizationService.getGlobalCustomization(
      'customRoutes'
    );

    this.extensionManager.registeredExtensionIds.forEach(extensionId => {
      const key = `${extensionId}.customizationModule.default`;
      const defaultCustomizations = this.findExtensionValue(key);
      if (!defaultCustomizations) return;
      const { value } = defaultCustomizations;
      this.addReference(value, true);
    });

    commandsManager.runCommand('showContextMenu', {});
  };

  /// 2 - 返回Panel
  return (
    <div className="flex flex-col flex-auto min-h-0 mt-1">
      <SegmentationGroupTable
        title={"测试"}
      />
      <Button
        children="运行command - showContextMenu"
        onClick={buttonRunCommand}
      />
    </div>
  )
}

PanelTest.propTypes = {
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
  }),
  extensionManager: PropTypes.shape({
    getModuleEntry: PropTypes.func.isRequired,
  }),
};
