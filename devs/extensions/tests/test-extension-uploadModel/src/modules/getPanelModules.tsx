import React from "react";
import PanelSegmentation from "../panels/PanelSegmentation";

function getPanelModule({
  commandsManager,
  extensionManager,
  servicesManager,
}) {
  const warppedPanelTest = () => {
    return (
      <PanelSegmentation
        commandsManager={commandsManager}
        servicesManager={servicesManager}
        extensionManager={extensionManager}
      />
    );
  };

  return [
    {
      name: 'panelTest',
      iconName: 'tab-segmentation',
      iconLabel: '测试',
      label: '测试',
      component: warppedPanelTest,
    }
  ]
}

export default getPanelModule;
