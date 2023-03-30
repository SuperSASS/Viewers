
import React, { useEffect, useState, useCallback } from 'react';
import { SegmentationGroupTable, Button } from "@ohif/ui";
import { DicomMetadataStore } from '@ohif/core';
import api, { ApplyModelAllType } from "../util/api";

import PropTypes from "prop-types";

export default function PanelTest({ servicesManager, commandsManager, extensionManager }) {
  /// 0.1 - 获取服务
  const { HangingProtocolService, DisplaySetService, ViewportGridService } = servicesManager.services;
  // const dataSource = extensionManager.getActiveDataSource()[0];

  /// 1 - 逻辑代码
  /// 1.1 - 按钮回调函数
  const button1Handler = async () => {
    let viewportState = ViewportGridService.getState();
    let displaySetInstanceUID = viewportState.viewports[viewportState.activeViewportIndex].displaySetInstanceUIDs;
    let displaySet = DisplaySetService.getDisplaySetByUID(displaySetInstanceUID[0]);

    let studyUid = displaySet.StudyInstanceUID;
    let seriesUid = displaySet.SeriesInstanceUID;

    // for (let instance of displaySet.images) {
    //   let InstanceUID = instance.SOPInstanceUID;
    // }
    const data: ApplyModelAllType = {
      studyUid,
      seriesUid,
      segType: 0,
    };

    try {
      const resopnse = await api.ApplyModelAll(data);
      if (resopnse.status != 200)
        throw new Error(`!API Error - ApplyModelAll(${resopnse.status}): ` + resopnse.statusText);
      // 逻辑代码
      console.log(resopnse);
      // 更新series
      const dataSource = extensionManager.getActiveDataSource()[0];
      dataSource.deleteStudyMetadataPromise(studyUid); // 先要删除缓存
      dataSource.retrieve.series.metadata({
        studyUid
      });
    }
    catch (e) {
      console.error(e);
    }
  };
  const button2Handler = () => {
    let viewportState = ViewportGridService.getState();
    let displaySetInstanceUID = viewportState.viewports[viewportState.activeViewportIndex].displaySetInstanceUIDs;
    let displaySet = DisplaySetService.getDisplaySetByUID(displaySetInstanceUID[0]);

    let studyUid = displaySet.StudyInstanceUID;

    const dataSource = extensionManager.getActiveDataSource()[0];
    dataSource.deleteStudyMetadataPromise(studyUid); // 先要删除缓存
    // &存在Bug：上一条语句，往数据库里增的时候没问题，但删有问题（改可能也有，但一般不改）
    dataSource.retrieve.series.metadata({
      StudyInstanceUID: studyUid
    });
  };

  /// 2 - 返回Panel
  return (
    <div>
      <Button
        children="上传当前选中视窗影像的SeriesUID"
        onClick={button1Handler}
      />
      <Button
        children="手动更新Series？……"
        onClick={button2Handler}
      />
      <SegmentationGroupTable
        title={"测试"}
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
