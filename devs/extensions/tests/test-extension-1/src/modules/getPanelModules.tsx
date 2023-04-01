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
      name: 'panelSegmentation',
      iconName: 'tab-segmentation',
      iconLabel: 'Segmentation',
      label: '分割',
      component: warppedPanelTest,
    }
  ]
}

export default getPanelModule;
