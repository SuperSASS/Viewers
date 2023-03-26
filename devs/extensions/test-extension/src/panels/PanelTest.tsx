
import React, { useEffect, useState, useCallback } from 'react';
import { SegmentationGroupTable, Button } from "@ohif/ui";
import { DicomMetadataStore } from '@ohif/core';

import PropTypes from "prop-types";

export default function PanelTest({ servicesManager, commandsManager, extensionManager }) {
  const dataSource = extensionManager.getActiveDataSource()[0];
  const buttonHandler = () => {
    // dataSource.store.dicom();
  };

  const unsubscribe = [];
  const {
    unsubscribe: instanceAddedUnsubscribe,
  } = DicomMetadataStore.subscribe(
    DicomMetadataStore.EVENTS.INSTANCES_ADDED,
    ({ StudyInstanceUID, SeriesInstanceUID, madeInClient = false }) => {
      const seriesMetadata = DicomMetadataStore.getSeries(
        StudyInstanceUID,
        SeriesInstanceUID
      );

      console.log(seriesMetadata)
    }
  );

  return (
    <div>
      <Button
        children="将当前Serial分割"
        onClick={buttonHandler}
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
