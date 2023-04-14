

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
        toolName: toolNames.StackScrollMouseWheel, // 滚轮切换Stack【这里不用绑定的原因是因为，会在
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
      // 新增 - 分割工具
      { toolName: toolNames.Brush }
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
    }
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

  const defaultToolGroup = toolGroupService.createToolGroupAndAddTools(toolGroupIds.default, defaultTools, defaultToolsConfig);
  const mipToolGroup = toolGroupService.createToolGroupAndAddTools(toolGroupIds.mip, mipTools, mipToolsConfig);

  // 新增工具实例，即橡皮檫工具
  const toolInstances = {
    BrushEraser: {
      Name: "BrushEraser",
      Parent: toolNames.Brush,
      Strategies: "ERASE_INSIDE_CIRCLE",
    }
  }
  defaultToolGroup.addToolInstance(
    toolInstances.BrushEraser.Name,
    toolInstances.BrushEraser.Parent,
    {
      activeStrategy: toolInstances.BrushEraser.Strategies
    }
  )
}

// 不用像tmtv那个傻的一样传参，就传这三个就行，他穿的参在这三个里面都可以获取
function initToolGroups(extensionManager, toolGroupService, commandsManager) {
  _initToolGroups(extensionManager, toolGroupService, commandsManager);
}

export default initToolGroups;
