import { id } from './id';
import initToolGroups from './initToopGroup';
import toolbarButtons from './toolbarButtons';

const layoutTemplate = {
  default: '@ohif/extension-default.layoutTemplateModule.viewerLayout',
};

const leftPanels = {
  default: '@ohif/extension-default.panelModule.seriesList',
  measurement: '@ohif/extension-measurement-tracking.panelModule.seriesList',
}

const rightPanels = {
  measure: '@ohif/extension-default.panelModule.measure',
  test: 'test-extension-1.panelModule.panelSegmentation'
}


const viewport = {
  cornerstone: '@ohif/extension-cornerstone.viewportModule.cornerstone',
  measurement: '@ohif/extension-measurement-tracking.viewportModule.cornerstone-tracked',
  dicomSeg: "@ohif/extension-cornerstone-dicom-seg.viewportModule.dicom-seg",
  // dicompdf: '@ohif/extension-dicom-pdf.viewportModule.dicom-pdf',
}

const sopClassHandler = {
  default: '@ohif/extension-default.sopClassHandlerModule.stack',
  dicomSeg: "@ohif/extension-cornerstone-dicom-seg.sopClassHandlerModule.dicom-seg",
  // dicompdf: '@ohif/extension-dicom-pdf.sopClassHandlerModule.dicom-pdf',
}

const hangingProtocol = {
  ohif_default: '@ohif/extension-default.hangingProtocolModule.default',
  CocketBoat_default: "test-extension-1.hangingProtocolModule.CocketBoat_default",
  mpr: '@ohif/extension-cornerstone.hangingProtocolModule.mpr',
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
};

let unsubscriptions = [] as any[];
function modeFactory({ modeConfiguration }) {
  return {
    /**
     * Mode ID, which should be unique among modes used by the viewer. This ID
     * is used to identify the mode in the viewer's state.
     */
    id,
    routeName: 'template',
    /**
     * Mode name, which is displayed in the viewer's UI in the workList, for the
     * user to select the mode.
     */
    displayName: '测试模式',

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
    /**
     * Mode Routes are used to define the mode's behavior. A list of Mode Route
     * that includes the mode's path and the layout to be used. The layout will
     * include the components that are used in the layout. For instance, if the
     * default layoutTemplate is used (id: '@ohif/extension-default.layoutTemplateModule.viewerLayout')
     * it will include the leftPanels, rightPanels, and viewports. However, if
     * you define another layoutTemplate that includes a Footer for instance,
     * you should provide the Footer component here too. Note: We use Strings
     * to reference the component's ID as they are registered in the internal
     * ExtensionManager. The template for the string is:
     * `${extensionId}.{moduleType}.${componentId}`.
     */
    routes: [
      {
        path: 'template',
        layoutTemplate: ({ location, servicesManager }) => {
          return {
            id: layoutTemplate.default,
            props: {
              leftPanels: [leftPanels.default],
              rightPanels: [rightPanels.measure, rightPanels.test],
              viewports: [ // 仅申明，并绑定与Handler的联系
                {
                  namespace: viewport.measurement,
                  // namespace: viewport.cornerstone,
                  displaySetsToDisplay: [sopClassHandler.default],
                },
                {
                  namespace: viewport.dicomSeg,
                  displaySetsToDisplay: [sopClassHandler.dicomSeg],
                },
                // {
                //   namespace: dicompdf.viewport,
                //   displaySetsToDisplay: [ohif.sopClassHandler, dicompdf.sopClassHandler],
                // },
              ],
            },
          };
        },
      },
    ],
    /** List of extensions that are used by the mode */
    extensions: extensionDependencies,
    /** HangingProtocol used by the mode */
    // hangingProtocol: [''],
    // hangingProtocol: ['CocketBoat_default'], // 申明挂片协议，并具体定义viewports
    hangingProtocol: ['default'],
    /** SopClassHandlers used by the mode */
    sopClassHandlers: [
      sopClassHandler.default,
      sopClassHandler.dicomSeg,
    ], // 这应该是决定每个DisplaySet的Handler来源（只能从这里面选，具体怎么选的再探究）
    /** hotkeys for mode */
    hotkeys: [''],
  };
}

const mode = {
  id,
  modeFactory,
  extensionDependencies,
};

export default mode;
