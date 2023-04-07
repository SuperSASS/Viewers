export const toolGroupIds = {
  default: 'defaultToolGroup', // 非MIP视图的工具组
  MIP: 'mipToolGroup',
  // CT: 'ctToolGroup',
  // PT: 'ptToolGroup',
  // Fusion: 'fusionToolGroup',
  // MPR: 'mpr',
};

function _initToolGroups(extensionManager, toolGroupService, commandsManager) {
  const utilityModule = extensionManager.getModuleEntry(
    '@ohif/extension-cornerstone.utilityModule.tools'
  );
  const { toolNames, Enums } = utilityModule.exports;

  const tools = {
    active: [
      {
        toolName: toolNames.WindowLevel, // 窗宽窗位
        bindings: [{ mouseButton: Enums.MouseBindings.Primary }],
      },
      {
        toolName: toolNames.Pan, // 移动
        bindings: [{ mouseButton: Enums.MouseBindings.Auxiliary }],
      },
      {
        toolName: toolNames.Zoom, // 缩放
        bindings: [{ mouseButton: Enums.MouseBindings.Secondary }],
      },
      {
        toolName: toolNames.StackScrollMouseWheel, // 滚轮切换Stack
        bindings: []
      },
    ],
    passive: [
      { toolName: toolNames.Length },
      { toolName: toolNames.ArrowAnnotate },
      { toolName: toolNames.Bidirectional },
      { toolName: toolNames.DragProbe },
      // { toolName: toolNames.Probe }, // tmtv有的这没有
      { toolName: toolNames.EllipticalROI },
      { toolName: toolNames.RectangleROI },
      { toolName: toolNames.StackScroll },
      { toolName: toolNames.Angle },
      { toolName: toolNames.CobbAngle },
      { toolName: toolNames.Magnify },
      { toolName: toolNames.SegmentationDisplay }, // 这个在tmtv是enable
      // 比tmtv多的
      { toolName: toolNames.PlanarFreehandROI },
      { toolName: toolNames.CalibrationLine },
    ],
    // enabled
    // disabled
    disabled: [{ toolName: toolNames.ReferenceLines }],
  };
  const toolsConfig = {
    [toolNames.Crosshairs]: {
      viewportIndicators: false,
      autoPan: {
        enabled: false,
        panSize: 10,
      },
    },
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

  // 专为mip量身打造的Tool
  const mipTools = {
    active: [
      {
        toolName: toolNames.VolumeRotateMouseWheel,
      },
      {
        toolName: toolNames.MipJumpToClick,
        bindings: [{ mouseButton: Enums.MouseBindings.Primary }],
      },
    ],
    enabled: [{ toolName: toolNames.SegmentationDisplay }],
  };
  const mipToolsConfig = {
    [toolNames.VolumeRotateMouseWheel]: {
      rotateIncrementDegrees: 0.1,
    },
    [toolNames.MipJumpToClick]: {
      targetViewportIds: ['ctAXIAL', 'ctCORONAL', 'ctSAGITTAL'],
    },
  };

  toolGroupService.createToolGroupAndAddTools(toolGroupIds.default, tools, toolsConfig);
  toolGroupService.createToolGroupAndAddTools(toolGroupIds.CT, tools, toolsConfig);
  toolGroupService.createToolGroupAndAddTools(toolGroupIds.MIP, mipTools, mipToolsConfig);
}

// 不用像tmtv那个傻的一样传参，就传这三个就行，他穿的参在这三个里面都可以获取
function initToolGroups(extensionManager, toolGroupService, commandsManager) {
  _initToolGroups(extensionManager, toolGroupService, commandsManager);
}

export default initToolGroups;
