

function _initToolGroups(extensionManager, toolGroupService, commandsManager) {
  const csUtilityModule = extensionManager.getModuleEntry('@ohif/extension-cornerstone.utilityModule.tools');
  const { toolNames, Enums } = csUtilityModule.exports;
  const ckUtilityModule = extensionManager.getModuleEntry('test-extension-1.utilityModule.common');
  const { toolGroupIds } = ckUtilityModule.exports;

  // 通用的Tool
  const defaultTools = {
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
      // 比tmtv多的
      { toolName: toolNames.PlanarFreehandROI },
      { toolName: toolNames.CalibrationLine },
    ],
    // enabled
    enabled: [
      { toolName: toolNames.SegmentationDisplay }, // 显示Segmentation的
    ],
    // disabled
    disabled: [
      { toolName: toolNames.ReferenceLines },
      { toolName: toolNames.Crosshairs }
    ],
  };
  const defaultToolsConfig = {
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

  toolGroupService.createToolGroupAndAddTools(toolGroupIds.default, defaultTools, defaultToolsConfig);
  toolGroupService.createToolGroupAndAddTools(toolGroupIds.mip, mipTools, mipToolsConfig);
}

// 不用像tmtv那个傻的一样传参，就传这三个就行，他穿的参在这三个里面都可以获取
function initToolGroups(extensionManager, toolGroupService, commandsManager) {
  _initToolGroups(extensionManager, toolGroupService, commandsManager);
}

export default initToolGroups;
