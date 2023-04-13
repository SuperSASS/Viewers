import { PubSubService } from '../_shared/pubSubServiceInterface';
import EVENTS from './EVENTS';

const displaySetCache = [];

/**
 * Find an instance in a list of instances, comparing by SOP instance UID
 */
const findInSet = (instance, list) => {
  if (!list) return false;
  for (const elem of list) {
    if (!elem) continue;
    if (elem === instance) return true;
    if (elem.SOPInstanceUID === instance.SOPInstanceUID) return true;
  }
  return false;
};

/**
 * Find an instance in a display set【？这在扯皮呢，明明是display sets……
 * 判断给定的instance是否存在于displaySets中，但存在缺陷
 * 根据images或others【这是啥】来判断，会导致SEG无法判断
 * @returns true if found
 */
const findInstance = (instance, displaySets) => {
  for (const displayset of displaySets) {
    if (findInSet(instance, displayset.images)) return true;
    if (findInSet(instance, displayset.others)) return true;
  }
  return false;
};

export default class DisplaySetService extends PubSubService {
  public static REGISTRATION = {
    altName: 'DisplaySetService',
    name: 'displaySetService',
    create: ({ configuration = {} }) => {
      return new DisplaySetService();
    },
  };

  public activeDisplaySets = [];
  constructor() {
    super(EVENTS);
  }

  public init(extensionManager, SOPClassHandlerIds): void {
    this.extensionManager = extensionManager;
    this.SOPClassHandlerIds = SOPClassHandlerIds;
    this.activeDisplaySets = [];
  }

  _addDisplaySetsToCache(displaySets) {
    displaySets.forEach(displaySet => {
      displaySetCache.push(displaySet);
    });
  }

  _addActiveDisplaySets(displaySets) {
    const activeDisplaySets = this.activeDisplaySets;

    displaySets.forEach(displaySet => {
      // This test makes adding display sets an N^2 operation, so it might
      // become important to do this in an efficient manner for large
      // numbers of display sets.
      if (!activeDisplaySets.includes(displaySet)) {
        activeDisplaySets.push(displaySet);
      }
    });
  }

  getDisplaySetCache() {
    return displaySetCache;
  }

  getMostRecentDisplaySet() {
    return this.activeDisplaySets[this.activeDisplaySets.length - 1];
  }

  getActiveDisplaySets() {
    return this.activeDisplaySets;
  }

  getDisplaySetsForSeries = SeriesInstanceUID => {
    return displaySetCache.filter(
      displaySet => displaySet.SeriesInstanceUID === SeriesInstanceUID
    );
  };

  getDisplaySetForSOPInstanceUID(
    SOPInstanceUID,
    SeriesInstanceUID,
    frameNumber
  ) {
    const displaySets = SeriesInstanceUID
      ? this.getDisplaySetsForSeries(SeriesInstanceUID)
      : this.getDisplaySetCache();

    const displaySet = displaySets.find(ds => {
      return (
        ds.images && ds.images.some(i => i.SOPInstanceUID === SOPInstanceUID)
      );
    });

    return displaySet;
  }

  setDisplaySetMetadataInvalidated(displaySetInstanceUID) {
    const displaySet = this.getDisplaySetByUID(displaySetInstanceUID);

    if (!displaySet) {
      return;
    }

    // broadcast event to update listeners with the new displaySets
    this._broadcastEvent(
      EVENTS.DISPLAY_SET_SERIES_METADATA_INVALIDATED,
      displaySetInstanceUID
    );
  }

  deleteDisplaySet(displaySetInstanceUID) {
    const { activeDisplaySets } = this;

    const displaySetCacheIndex = displaySetCache.findIndex(
      ds => ds.displaySetInstanceUID === displaySetInstanceUID
    );

    const activeDisplaySetsIndex = activeDisplaySets.findIndex(
      ds => ds.displaySetInstanceUID === displaySetInstanceUID
    );

    displaySetCache.splice(displaySetCacheIndex, 1);
    activeDisplaySets.splice(activeDisplaySetsIndex, 1);

    this._broadcastEvent(EVENTS.DISPLAY_SETS_CHANGED, this.activeDisplaySets);
    this._broadcastEvent(EVENTS.DISPLAY_SETS_REMOVED, {
      displaySetInstanceUIDs: [displaySetInstanceUID],
    });
  }

  /**
   * @param {string} displaySetInstanceUID
   * @returns {object} displaySet
   */
  getDisplaySetByUID = displaySetInstanceUid =>
    displaySetCache.find(
      displaySet => displaySet.displaySetInstanceUID === displaySetInstanceUid
    );

  /**
   *
   * @param {*} input
   * @param {*} param1: settings: initialViewportSettings by HP or callbacks after rendering
   * @returns {string[]} - added displaySetInstanceUIDs
   */
  makeDisplaySets = (
    input,
    { batch = false, madeInClient = false, settings = {} } = {}
  ) => {
    if (!input || !input.length) {
      throw new Error('No instances were provided.');
    }

    if (batch && !input[0].length) {
      throw new Error(
        'Batch displaySet creation does not contain array of array of instances.'
      );
    }

    // If array of instances => One instance.
    let displaySetsAdded = [];

    if (batch) {
      for (let i = 0; i < input.length; i++) {
        const instances = input[i];
        const displaySets = this.makeDisplaySetForInstances(
          instances,
          settings
        );

        displaySetsAdded = [...displaySetsAdded, displaySets];
      }
    } else {
      // 一般直接进这里来，先通过instances，变成displaySet
      const displaySets = this.makeDisplaySetForInstances(input, settings);

      displaySetsAdded = displaySets;
    }

    const options = {};

    if (madeInClient) {
      options.madeInClient = true;
    }

    // TODO: This is tricky. How do we know we're not resetting to the same/existing DSs?
    // TODO: This is likely run anytime we touch DicomMetadataStore. How do we prevent unnecessary broadcasts?
    if (displaySetsAdded && displaySetsAdded.length) {
      this._broadcastEvent(EVENTS.DISPLAY_SETS_CHANGED, this.activeDisplaySets); // 这个事件对于LeftPenel有订阅
      this._broadcastEvent(EVENTS.DISPLAY_SETS_ADDED, { // 一样对于LeftPenel有订阅【多了个不管的dicom-sr
        displaySetsAdded,
        options,
      });

      return displaySetsAdded;
    }
  };

  /**
   * The onModeExit returns the display set service to the initial state,
   * that is without any display sets.  To avoid recreating display sets,
   * the mode specific onModeExit is called before this method and should
   * store the active display sets and the cached data.
   */
  onModeExit() {
    this.getDisplaySetCache().length = 0;
    this.activeDisplaySets.length = 0;
  }

  /**
   * 通过instances，生成displaySets
   * 副作用：会添加到`displaySetCache`缓存中、以及`activeDisplaySets`活跃displaySet中
   * @returns displaySets
   */
  makeDisplaySetForInstances(instancesSrc, settings) {
    let instances = instancesSrc;
    const instance = instances[0];

    // 尝试获取该SeriesUID的displaySet（如果之前创建过的话）（在缓存displaySetCache中获取）
    const existingDisplaySets = this.getDisplaySetsForSeries(instance.SeriesInstanceUID) || [];

    const SOPClassHandlerIds = this.SOPClassHandlerIds;
    let allDisplaySets;

    for (let i = 0; i < SOPClassHandlerIds.length; i++) {
      const SOPClassHandlerId = SOPClassHandlerIds[i];
      const handler = this.extensionManager.getModuleEntry(SOPClassHandlerId);

      // 只有该sopClassHandler可以应用到该instance上才继续
      if (handler.sopClassUids.includes(instance.SOPClassUID)) {
        // Check if displaySets are already created using this SeriesInstanceUID/SOPClassHandler pair.
        // 检查该SeriesInstanceUID(来自instance)需要的displaySet是否已经在该SOPClassHandler下被创建了，有的话直接get
        let displaySets = existingDisplaySets.filter(
          displaySet => displaySet.SOPClassHandlerId === SOPClassHandlerId
        );

        if (displaySets.length) { // 如果确实已经创建过了
          this._addActiveDisplaySets(displaySets); // 虽然我不明白这里为什么又要添加到activeDisplaySets里【因为存在的话，之前肯定添加过了【但说不定会进行inactive操作呢！】】，但这个函数会防止重复，那就去做吧……
        } else {
          displaySets = handler.getDisplaySetsFromSeries(instances);

          if (!displaySets || !displaySets.length) continue;

          // applying hp-defined viewport settings to the displaysets
          // 应用HangingProtocol在Viewport的设置到displaySets上
          displaySets.forEach(ds => {
            Object.keys(settings).forEach(key => {
              ds[key] = settings[key];
            });
          });

          this._addDisplaySetsToCache(displaySets); // 添加到缓存中
          this._addActiveDisplaySets(displaySets); // 添加到活跃的displaySet中

          // 筛选不在displaySet里的instance，用于之后提前return，但筛选函数findInstance存在缺陷
          /// 对于CT类型，一般直接给筛没，所以后面会提前return
          /// 对于SEG类型，一般原来有1个instance，筛选完后还是1个，虽然其实已经解析并加到了DisplaySet里，但还会继续解析
          instances = instances.filter(
            instance => !findInstance(instance, displaySets)
          );
        }

        allDisplaySets = allDisplaySets // 将displaySets加到allDisplaySets中
          ? [...allDisplaySets, ...displaySets]
          : displaySets;

        if (!instances.length) return allDisplaySets; // 所以在这，CT已经加完到displaySet直接return；SEL还会继续判断剩下的sopClassHandler
      }
    }
    return allDisplaySets;
    // 最终返回所解析的所有displaySets
  }
}
