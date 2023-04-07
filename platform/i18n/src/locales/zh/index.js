import Buttons from './Buttons.json';
import CineDialog from './CineDialog.json';
import Common from './Common.json';
import Header from './Header.json';
import StudyBrowser from './StudyBrowser.json';

import UserPreferencesModal from './Modals/UserPreferencesModal.json';

import MeasurementNotification from './Notifications/MeasurementNotification.json';

import MeasurementTable from './Panels/MeasurementTable.json';
import PanelSegmentation from './Panels/PanelSegmentation.json';
import PanelSUV from './Panels/PanelSUV.json';
import PanelSUVExport from './Panels/PanelSUVExport.json'; // 1. 先引入
import ROIThresholdConfiguration from './Panels/ROIThresholdConfiguration.json';
import StudyList from './Panels/StudyList.json';

import SEGViewport from './Viewports/SEGViewport.json';
import TrackedViewport from './Viewports/TrackedViewport.json';

import PatientInfo from './Tooltips/PatientInfo.json';

export default {
  zh: {
    Buttons,
    CineDialog,
    Common,
    Header,
    MeasurementTable,
    StudyList,
    UserPreferencesModal,
    PanelSegmentation,
    StudyBrowser,
    MeasurementNotification,
    PatientInfo,
    TrackedViewport,
    PanelSUV,
    PanelSUVExport // 2. 导出
  },
};
