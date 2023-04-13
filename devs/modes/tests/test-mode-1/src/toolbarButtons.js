// 真的服了.jpg
const toolGroupIds = {
  default: "defaultToolGroup",
  mip: "mipToolGroup",
}


// TODO: torn, can either bake this here; or have to create a whole new button type
// Only ways that you can pass in a custom React component for render :l
import {
  // ExpandableToolbarButton,
  // ListMenu,
  WindowLevelMenuItem,
} from '@ohif/ui';
import { defaults } from '@ohif/core';
// import { toolGroupIds } from './initToopGroup';

const { windowLevelPresets } = defaults;
/**
 * 生成一个button里的props【props也就是按钮的具体定义】
 * 但并不会直接使用该函数，而是用下面三个绑定的函数
 * @param {*} type - 'tool' | 'action' | 'toggle'【已绑定了具体命令，不需要手动输入】
 * @param {*} id
 * @param {*} icon
 * @param {*} label
 */
function _createButton(type, id, icon, label, commands, tooltip, uiType) {
  return {
    id,
    icon,
    label,
    type,
    commands,
    tooltip,
    uiType,
  };
}
const _createActionButton = _createButton.bind(null, 'action');
const _createToggleButton = _createButton.bind(null, 'toggle');
const _createToolButton = _createButton.bind(null, 'tool');

/**
 * 创建有关WindowsLevel窗宽窗位的选项卡
 * @param {*} preset - preset number (from above import)
 * @param {*} title
 * @param {*} subtitle
 */
function _createWwwcPreset(preset, title, subtitle) {
  return {
    id: preset.toString(),
    title,
    subtitle,
    type: 'action',
    commands: [
      {
        commandName: 'setWindowLevel',
        commandOptions: {
          ...windowLevelPresets[preset],
        },
        context: 'CORNERSTONE',
      },
    ],
  };
}

/**
 * 对给定的toolName，创建一个`setToolActive`（切换激活选中的工具）命令组，将在所有ToolGroup中执行该命令
 * @param {string} toolName
 * @returns {Array} 在所有ToolGroup的'setToolActive'命令数组
 */
function _createSetToolActiveCommands(toolName) {
  const toolGroupIdArray = [];
  for (let key in toolGroupIds)
    toolGroupIdArray.push(toolGroupIds[key]);

  const temp = toolGroupIdArray.map(toolGroupId => ({
    commandName: 'setToolActive',
    commandOptions: {
      toolGroupId,
      toolName,
    },
    context: 'CORNERSTONE',
  }));
  return temp;
}

const toolbarButtons = [
  // 测量 组别
  {
    id: 'MeasurementTools',
    type: 'ohif.splitButton',
    props: {
      groupId: 'MeasurementTools',
      isRadio: true, // 是顶替型组别
      primary: _createToolButton(
        'Length', // id
        'tool-length', // icon
        'Length', // label
        [ // command
          {
            commandName: 'setToolActive',
            commandOptions: {
              toolName: 'Length',
            },
            context: 'CORNERSTONE',
          },
          {
            commandName: 'setToolActive',
            commandOptions: {
              toolName: 'SRLength',
              toolGroupId: 'SRToolGroup',
            },
            // we can use the setToolActive command for this from Cornerstone commandsModule
            context: 'CORNERSTONE',
          },
        ],
        'Length'
      ),
      secondary: {
        icon: 'chevron-down',
        label: '',
        isActive: true,
        tooltip: 'More Measure Tools',
      },
      items: [
        _createToolButton(
          'Length',
          'tool-length',
          'Length',
          [
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'Length',
              },
              context: 'CORNERSTONE',
            },
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'SRLength',
                toolGroupId: 'SRToolGroup',
              },
              // we can use the setToolActive command for this from Cornerstone commandsModule
              context: 'CORNERSTONE',
            },
          ],
          'Length Tool'
        ),
        _createToolButton(
          'Bidirectional',
          'tool-bidirectional',
          'Bidirectional',
          [
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'Bidirectional',
              },
              context: 'CORNERSTONE',
            },
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'SRBidirectional',
                toolGroupId: 'SRToolGroup',
              },
              context: 'CORNERSTONE',
            },
          ],
          'Bidirectional Tool'
        ),
        _createToolButton(
          'ArrowAnnotate',
          'tool-annotate',
          'Annotation',
          [
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'ArrowAnnotate',
              },
              context: 'CORNERSTONE',
            },
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'SRArrowAnnotate',
                toolGroupId: 'SRToolGroup',
              },
              context: 'CORNERSTONE',
            },
          ],
          'Arrow Annotate'
        ),
        _createToolButton(
          'EllipticalROI',
          'tool-elipse',
          'Ellipse',
          [
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'EllipticalROI',
              },
              context: 'CORNERSTONE',
            },
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'SREllipticalROI',
                toolGroupId: 'SRToolGroup',
              },
              context: 'CORNERSTONE',
            },
          ],
          'Ellipse Tool'
        ),
      ],
    },
  },
  // 缩放
  {
    id: 'Zoom',
    type: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-zoom',
      label: 'Zoom',
      commands: _createSetToolActiveCommands('Zoom'),
    },
  },
  // 窗宽窗位 组别
  {
    id: 'WindowLevel',
    type: 'ohif.splitButton',
    props: {
      groupId: 'WindowLevel',
      primary: _createToolButton(
        'WindowLevel',
        'tool-window-level',
        'Window Level',
        [
          {
            commandName: 'setToolActive',
            commandOptions: {
              toolName: 'WindowLevel',
            },
            context: 'CORNERSTONE',
          },
        ],
        'Window Level'
      ),
      secondary: {
        icon: 'chevron-down',
        label: 'W/L Manual',
        isActive: true,
        tooltip: 'W/L Presets',
      },
      isAction: true, // ?
      renderer: WindowLevelMenuItem,
      items: [
        _createWwwcPreset(1, '软组织', '400 / 40'),
        _createWwwcPreset(2, '肺', '1500 / -600'),
        _createWwwcPreset(3, '肝脏', '150 / 90'),
        _createWwwcPreset(4, '骨', '2500 / 480'),
        _createWwwcPreset(5, '大脑', '80 / 40'),
      ],
    },
  },
  // 平移
  {
    id: 'Pan',
    type: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-move',
      label: 'Pan',
      commands: _createSetToolActiveCommands('Pan'),
    },
  },
  // 截图
  {
    id: 'Capture',
    type: 'ohif.action',
    props: {
      icon: 'tool-capture',
      label: 'Capture',
      type: 'action',
      commands: [
        {
          commandName: 'showDownloadViewportModal',
          commandOptions: {},
          context: 'CORNERSTONE',
        },
      ],
    },
  },
  // 布局
  {
    id: 'Layout',
    type: 'ohif.layoutSelector',
    props: {
      rows: 3,
      columns: 3,
    },
  },
  // MPR
  {
    id: 'MPR',
    type: 'ohif.action',
    props: {
      type: 'toggle',
      icon: 'icon-mpr',
      label: 'MPR',
      commands: [
        {
          commandName: 'toggleHangingProtocol',
          commandOptions: {
            protocolId: 'mpr',
          },
          context: 'DEFAULT',
        },
      ],
    },
  },
  // 十字线
  {
    id: 'Crosshairs',
    type: 'ohif.radioGroup',
    props: {
      type: 'tool',
      icon: 'tool-crosshair',
      label: 'Crosshairs',
      commands: [
        {
          commandName: 'setToolActive',
          commandOptions: {
            toolName: 'Crosshairs',
            toolGroupId: 'mpr',
          },
          context: 'CORNERSTONE',
        },
      ],
    },
  },
  // 更多
  {
    id: 'MoreTools',
    type: 'ohif.splitButton',
    props: {
      isRadio: true, // ?
      groupId: 'MoreTools',
      primary: _createActionButton(
        'Reset',
        'tool-reset',
        'Reset View',
        [
          {
            commandName: 'resetViewport',
            commandOptions: {},
            context: 'CORNERSTONE',
          },
        ],
        'Reset'
      ),
      secondary: {
        icon: 'chevron-down',
        label: '',
        isActive: true,
        tooltip: 'More Tools',
      },
      items: [
        _createActionButton(
          'Reset',
          'tool-reset',
          'Reset View',
          [
            {
              commandName: 'resetViewport',
              commandOptions: {},
              context: 'CORNERSTONE',
            },
          ],
          'Reset'
        ),
        _createActionButton(
          'rotate-right',
          'tool-rotate-right',
          'Rotate Right',
          [
            {
              commandName: 'rotateViewportCW',
              commandOptions: {},
              context: 'CORNERSTONE',
            },
          ],
          'Rotate +90'
        ),
        _createActionButton(
          'flip-horizontal',
          'tool-flip-horizontal',
          'Flip Horizontally',
          [
            {
              commandName: 'flipViewportHorizontal',
              commandOptions: {},
              context: 'CORNERSTONE',
            },
          ],
          'Flip Horizontal'
        ),
        _createToggleButton('StackImageSync', 'link', 'Stack Image Sync', [
          {
            commandName: 'toggleStackImageSync',
            commandOptions: {},
            context: 'CORNERSTONE',
          },
        ]),
        _createToggleButton(
          'ReferenceLines',
          'tool-referenceLines', // change this with the new icon
          'Reference Lines',
          [
            {
              commandName: 'toggleReferenceLines',
              commandOptions: {},
              context: 'CORNERSTONE',
            },
          ]
        ),
        _createToolButton(
          'StackScroll',
          'tool-stack-scroll',
          'Stack Scroll',
          [
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'StackScroll',
              },
              context: 'CORNERSTONE',
            },
          ],
          'Stack Scroll'
        ),
        _createActionButton(
          'invert',
          'tool-invert',
          'Invert',
          [
            {
              commandName: 'invertViewport',
              commandOptions: {},
              context: 'CORNERSTONE',
            },
          ],
          'Invert Colors'
        ),
        _createToolButton(
          'Probe',
          'tool-probe',
          'Probe',
          [
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'DragProbe',
              },
              context: 'CORNERSTONE',
            },
          ],
          'Probe'
        ),
        _createToggleButton(
          'cine',
          'tool-cine',
          'Cine',
          [
            {
              commandName: 'toggleCine',
              context: 'CORNERSTONE',
            },
          ],
          'Cine'
        ),
        _createToolButton(
          'Angle',
          'tool-angle',
          'Angle',
          [
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'Angle',
              },
              context: 'CORNERSTONE',
            },
          ],
          'Angle'
        ),

        // Next two tools can be added once icons are added
        // _createToolButton(
        //   'Cobb Angle',
        //   'tool-cobb-angle',
        //   'Cobb Angle',
        //   [
        //     {
        //       commandName: 'setToolActive',
        //       commandOptions: {
        //         toolName: 'CobbAngle',
        //       },
        //       context: 'CORNERSTONE',
        //     },
        //   ],
        //   'Cobb Angle'
        // ),
        // _createToolButton(
        //   'Planar Freehand ROI',
        //   'tool-freehand',
        //   'PlanarFreehandROI',
        //   [
        //     {
        //       commandName: 'setToolActive',
        //       commandOptions: {
        //         toolName: 'PlanarFreehandROI',
        //       },
        //       context: 'CORNERSTONE',
        //     },
        //   ],
        //   'Planar Freehand ROI'
        // ),
        _createToolButton(
          'Magnify',
          'tool-magnify',
          'Magnify',
          [
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'Magnify',
              },
              context: 'CORNERSTONE',
            },
          ],
          'Magnify'
        ),
        _createToolButton(
          'Rectangle',
          'tool-rectangle',
          'Rectangle',
          [
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'RectangleROI',
              },
              context: 'CORNERSTONE',
            },
          ],
          'Rectangle'
        ),
        _createToolButton(
          'CalibrationLine',
          'tool-calibration',
          'Calibration',
          [
            {
              commandName: 'setToolActive',
              commandOptions: {
                toolName: 'CalibrationLine',
              },
              context: 'CORNERSTONE',
            },
          ],
          'Calibration Line'
        ),
        _createActionButton(
          'TagBrowser',
          'list-bullets',
          'Dicom Tag Browser',
          [
            {
              commandName: 'openDICOMTagViewer',
              commandOptions: {},
              context: 'DEFAULT',
            },
          ],
          'Dicom Tag Browser'
        ),
      ],
    },
  },
];

export default toolbarButtons;
