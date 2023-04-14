import { id } from './id';

import getPanelModule from './Modules/getPanelModules';
import getCustomizationModule from './Modules/getCustomizationModule';
import getHangingProtocolModule from './Modules/getHangingProtocolModule';
import getUtilityModule from "./Modules/getUtilityModule";
import getViewportModule from "./Modules/getViewportModule";
import commandsModule from './commandsModule';

export default {
  id,

  getPanelModule,
  getViewportModule,
  getHangingProtocolModule,
  getUtilityModule,
};
