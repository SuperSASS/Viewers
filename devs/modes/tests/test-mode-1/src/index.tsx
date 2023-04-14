import { id } from './id';
import { hotkeys } from '@ohif/core';
import initToolGroups from './initToopGroup';
import toolbarButtons from './toolbarButtons';

const layoutTemplates = {
  default: '@ohif/extension-default.layoutTemplateModule.viewerLayout',
};

const leftPanels = {
  default: '@ohif/extension-default.panelModule.seriesList',
  measurement: '@ohif/extension-measurement-tracking.panelModule.seriesList',
}

const rightPanels = {
  measure: '@ohif/extension-default.panelModule.measure',
  test: 'test-extension-1.panelModule.panelTest',
  segment: 'test-extension-1.panelModule.panelSegmentation',
}


const viewports = {
  cornerstone: '@ohif/extension-cornerstone.viewportModule.cornerstone',
  measurement: '@ohif/extension-measurement-tracking.viewportModule.cornerstone-tracked',
  dicomSeg: "@ohif/extension-cornerstone-dicom-seg.viewportModule.dicom-seg",
  vtk: "test-extension-1.viewportModule.vtk",
  // dicompdf: '@ohif/extension-dicom-pdf.viewportModule.dicom-pdf',
}

const sopClassHandlers = {
  default: '@ohif/extension-default.sopClassHandlerModule.stack',
  dicomSeg: "@ohif/extension-cornerstone-dicom-seg.sopClassHandlerModule.dicom-seg",
  // dicompdf: '@ohif/extension-dicom-pdf.sopClassHandlerModule.dicom-pdf',
}

const hangingProtocols = {
  ohif_default: '@ohif/extension-default.hangingProtocolModule.default',
  CocketBoat_default: "CocketBoat_HP_default",
  mpr: "mpr", //'@ohif/extension-cornerstone.hangingProtocolModule.mpr',
  // ptCT: '@ohif/extension-tmtv.hangingProtocolModule.ptCT'
}

/**
 * Just two dependencies to be able to render a viewport with panels in order
 * to make sure that the mode is working.
 */
// 注意：上面所用的Extension都要在这里加上！
const extensionDependencies = {
  "test-extension-1": '^0.0.1',
  '@ohif/extension-default': '^3.0.0',
  '@ohif/extension-cornerstone': '^3.0.0',
  '@ohif/extension-measurement-tracking': '^3.0.0',
  '@ohif/extension-cornerstone-dicom-seg': '^3.0.0',
};

let unsubscriptions = [] as any[];
function modeFactory({ modeConfiguration }) {
  return {
    id,
    routeName: 'cocketboat_viewer_test',
    displayName: 'AI分割与测量模式（测试版）',

    onModeEnter: ({ servicesManager, extensionManager, commandsManager }) => {
      const {
        measurementService,
        toolGroupService,
        toolbarService,
      } = servicesManager.services;

      measurementService.clearMeasurements(); // 清除之前的测量
      initToolGroups(extensionManager, toolGroupService, commandsManager); // 初始化工具组

      const activateTool = () => {
        toolbarService.recordInteraction({
          groupId: 'WindowLevel',
          itemId: 'WindowLevel',
          interactionType: 'tool',
          commands: [
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'WindowLevel',
              },
              context: 'CORNERSTONE',
            },
          ],
        });
        // We don't need to reset the active tool whenever a viewport is getting added to the toolGroup.
        unsubscribe();
      };


      // Since we only have one viewport for the basic cs3d mode and it has
      // only one hanging protocol, we can just use the first viewport
      const { unsubscribe } = toolGroupService.subscribe(
        toolGroupService.EVENTS.VIEWPORT_ADDED,
        activateTool
      );

      unsubscriptions.push(unsubscribe);
      toolbarService.init(extensionManager);
      toolbarService.addButtons(toolbarButtons);
      toolbarService.createButtonSection('primary', [
        'MeasurementTools',
        'SegmentationTools',
        'Zoom',
        'WindowLevel',
        'Pan',
        'Capture',
        'Layout',
        'MPR',
        'Crosshairs',
        'MoreTools',
      ]);
    },
    onModeExit: ({ servicesManager }) => {
      const {
        toolGroupService,
        syncGroupService,
        segmentationService,
        cornerstoneViewportService,
      } = servicesManager.services;

      unsubscriptions.forEach(unsubscribe => unsubscribe());
      toolGroupService.destroy();
      syncGroupService.destroy();
      segmentationService.destroy();
      cornerstoneViewportService.destroy();
    },

    validationTags: {
      study: [],
      series: [],
    },

    isValidMode: ({ modalities }) => true,

    routes: [
      {
        path: 'cocketboat_viewer',
        layoutTemplate: ({ location, servicesManager }) => {
          return {
            id: layoutTemplates.default,
            props: {
              leftPanels: [leftPanels.measurement],
              rightPanels: [rightPanels.measure, rightPanels.segment, rightPanels.test],
              viewports: [
                {
                  namespace: viewports.cornerstone,
                  displaySetsToDisplay: [sopClassHandlers.default],
                },
                // {
                //   namespace: viewports.dicomSeg,
                //   displaySetsToDisplay: [sopClassHandlers.dicomSeg],
                // },
                // {
                //   namespace: viewports.cornerstone,
                //   displaySetsToDisplay: [sopClassHandlers.default],
                // },
                {
                  namespace: viewports.dicomSeg,
                  displaySetsToDisplay: [sopClassHandlers.dicomSeg],
                }
              ],
            },
          };
        },
      },
    ],
    extensions: extensionDependencies,
    hangingProtocol: hangingProtocols.CocketBoat_default,
    sopClassHandlers: [sopClassHandlers.default, sopClassHandlers.dicomSeg],
    hotkeys: [...hotkeys.defaults.hotkeyBindings],
  };
}

const mode = {
  id,
  modeFactory,
  extensionDependencies,
};

export default mode;
