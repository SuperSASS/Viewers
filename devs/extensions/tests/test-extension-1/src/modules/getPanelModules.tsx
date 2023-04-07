import React from "react";
import PanelSegmentation from "../panels/PanelSegmentation";
import PanelTest from "../panels/PanelTest";

function getPanelModule({
  commandsManager,
  extensionManager,
  servicesManager,
}) {
  const warppedPanelSegmentation = () => {
    return (
      <PanelSegmentation
        commandsManager={commandsManager}
        servicesManager={servicesManager}
        extensionManager={extensionManager}
      />
    );
  };
  const warppedPanelTest = () => {
    return (
      <PanelTest
        commandsManager={commandsManager}
        servicesManager={servicesManager}
        extensionManager={extensionManager}
      />
    );
  };

  return [
    {
      name: 'panelSegmentation',
      iconName: 'tab-segmentation',
      iconLabel: 'Segmentation',
      label: '分割',
      component: warppedPanelSegmentation,
    },
    {
      name: 'panelTest',
      iconName: 'info',
      iconLabel: 'Test',
      label: '测试',
      component: warppedPanelTest,
    }
  ]
}

export default getPanelModule;
