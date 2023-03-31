import React from "react";
import PanelTest from "./panels/PanelTest";

function getPanelModule({
  commandsManager,
  extensionManager,
  servicesManager,
}) {
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
      name: 'panelTest',
      iconName: 'tab-segmentation',
      iconLabel: 'Segmentation',
      label: '分割',
      component: warppedPanelTest,
    }
  ]
}

export default getPanelModule;
