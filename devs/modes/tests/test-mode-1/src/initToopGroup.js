export const toolGroupIds = {
  default: 'default',
  // CT: 'ctToolGroup',
  // PT: 'ptToolGroup',
  // Fusion: 'fusionToolGroup',
  // MIP: 'mipToolGroup',
  // MPR: 'mpr',
};

function _initDefaultToolGroup(
  extensionManager,
  toolGroupService,
  commandsManager,
) {
  const utilityModule = extensionManager.getModuleEntry(
    '@ohif/extension-cornerstone.utilityModule.tools'
  );
  const { toolNames, Enums } = utilityModule.exports;

  const tools = {
    active: [
      {
        toolName: toolNames.WindowLevel,
        bindings: [{ mouseButton: Enums.MouseBindings.Primary }],
      },
      {
        toolName: toolNames.Pan,
        bindings: [{ mouseButton: Enums.MouseBindings.Auxiliary }],
      },
      {
        toolName: toolNames.Zoom,
        bindings: [{ mouseButton: Enums.MouseBindings.Secondary }],
      },
      {
        toolName: toolNames.StackScrollMouseWheel,
        bindings: []
      },
    ],
    passive: [
      { toolName: toolNames.Length },
      { toolName: toolNames.ArrowAnnotate },
      { toolName: toolNames.Bidirectional },
      { toolName: toolNames.DragProbe },
      { toolName: toolNames.EllipticalROI },
      { toolName: toolNames.RectangleROI },
      { toolName: toolNames.StackScroll },
      { toolName: toolNames.Angle },
      { toolName: toolNames.CobbAngle },
      { toolName: toolNames.PlanarFreehandROI },
      { toolName: toolNames.Magnify },
      { toolName: toolNames.SegmentationDisplay },
      { toolName: toolNames.CalibrationLine },
    ],
    // enabled
    // disabled
    disabled: [{ toolName: toolNames.ReferenceLines }],
  };

  const toolsConfig = {
    [toolNames.ArrowAnnotate]: {
      getTextCallback: (callback, eventDetails) =>
        commandsManager.runCommand('arrowTextCallback', {
          callback,
          eventDetails,
        }),

      changeTextCallback: (data, eventDetails, callback) =>
        commandsManager.runCommand('arrowTextCallback', {
          callback,
          data,
          eventDetails,
        }),
    },
  };

  toolGroupService.createToolGroupAndAddTools(toolGroupIds.default, tools, toolsConfig);
}

function initToolGroups(extensionManager, toolGroupService, commandsManager) {
  _initDefaultToolGroup(
    extensionManager,
    toolGroupService,
    commandsManager,
  );
}

export default initToolGroups;
