import { ToolbarButton } from '@ohif/ui';
import ToolbarDivider from './Toolbar/ToolbarDivider.tsx';
import ToolbarLayoutSelector from './Toolbar/ToolbarLayoutSelector.tsx';
import ToolbarSplitButton from './Toolbar/ToolbarSplitButton.tsx';

export default function getToolbarModule({ commandsManager, servicesManager }) {
  return [
    {
      name: 'ohif.divider', // 就真的怪啊？？这个从来没在别的地方用过，而且自己用的话，样式也不好看！！【真的要用的话，需要改一下吧
      defaultComponent: ToolbarDivider,
      clickHandler: () => { },
    },
    {
      name: 'ohif.action',
      defaultComponent: ToolbarButton,
      clickHandler: () => { },
    },
    {
      name: 'ohif.radioGroup',
      defaultComponent: ToolbarButton,
      clickHandler: () => { },
    },
    {
      name: 'ohif.splitButton',
      defaultComponent: ToolbarSplitButton,
      clickHandler: () => { },
    },
    {
      name: 'ohif.layoutSelector',
      defaultComponent: ToolbarLayoutSelector,
      clickHandler: (evt, clickedBtn, btnSectionName) => { },
    },
    {
      name: 'ohif.toggle',
      defaultComponent: ToolbarButton,
      clickHandler: () => { },
    },
  ];
}
