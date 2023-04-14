import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router';

import PropTypes from 'prop-types';
// TODO: DicomMetadataStore should be injected?
import { DicomMetadataStore, ServicesManager } from '@ohif/core';
import { DragAndDropProvider, ImageViewerProvider } from '@ohif/ui';
import { useQuery, useSearchParams } from '@hooks';
import ViewportGrid from '@components/ViewportGrid';
import Compose from './Compose';
import getStudies from './studiesList';

/**
 * Initialize the route.
 * 主要如下步骤：
 * 1. 查询StudyInstanceUIDs的所有Series
 * 2. 上一步完成后，生成对应的DisplaySets【通过触发EVENTS.INSTANCES_ADDED订阅时，里面的makeDisplaySets实现的
 * 3. Promise实现后，run挂片协议【但暂时还是不了解这个run……
 *
 * @param props.servicesManager to read services from
 * @param props.studyInstanceUIDs for a list of studies to read
 * @param props.dataSource to read the data from
 * @param props.filters filters from query params to read the data from
 * @returns array of subscriptions to cancel
 */
function defaultRouteInit(
  { servicesManager, studyInstanceUIDs, dataSource, filters },
  hangingProtocolId
) {
  const {
    displaySetService,
    hangingProtocolService,
  } = servicesManager.services;

  // 添加订阅，当加载好Series的所有Instance后触发，然后生成对应的DisplaySet
  const unsubscriptions = [];
  const {
    unsubscribe: instanceAddedUnsubscribe,
  } = DicomMetadataStore.subscribe(
    DicomMetadataStore.EVENTS.INSTANCES_ADDED,
    function ({ StudyInstanceUID, SeriesInstanceUID, madeInClient = false }) {
      const seriesMetadata = DicomMetadataStore.getSeries( // 因为在retrieve的时候，会把OHIF-Instance-Metadata存到这个服务里，所以这直接取
        StudyInstanceUID,
        SeriesInstanceUID
      );

      displaySetService.makeDisplaySets(seriesMetadata.instances, madeInClient);
    }
  );

  unsubscriptions.push(instanceAddedUnsubscribe);

  // 查询获得该StudyUID的series
  const allRetrieves = studyInstanceUIDs.map(StudyInstanceUID =>
    dataSource.retrieve.series.metadata({
      StudyInstanceUID,
      filters,
    })
  );

  // The hanging protocol matching service is fairly expensive to run multiple
  // times, and doesn't allow partial matches to be made (it will simply fail
  // to display anything if a required match fails), so we wait here until all metadata
  // is retrieved (which will synchronously trigger the display set creation)
  // until we run the hanging protocol matching service.
  // 3. Promise实现，生成Studies（注意是Study研究级别的数组），run挂片协议【但暂时还是不了解这个run……
  Promise.allSettled(allRetrieves).then(() => {
    const displaySets = displaySetService.getActiveDisplaySets();

    if (!displaySets || !displaySets.length) {
      return;
    }

    // Gets the studies list to use
    const studies = getStudies(studyInstanceUIDs, displaySets);

    // study being displayed, and is thus the "active" study.
    const activeStudy = studies[0]; // 应当是选择默认激活的study为studies的第一个

    // run the hanging protocol matching on the displaySets with the predefined
    // hanging protocol in the mode configuration
    // run起来了！！！……
    hangingProtocolService.run(
      { studies, activeStudy, displaySets },
      hangingProtocolId
    );
  });

  return unsubscriptions;
}

export default function ModeRoute({
  mode,
  dataSourceName,
  extensionManager,
  servicesManager,
  commandsManager,
  hotkeysManager,
}) {
  // Parse route params/querystring
  const location = useLocation();
  const query = useQuery(); // 指的是URL中的query参数（?后面的）
  const params = useParams(); // 指的应该是
  const searchParams = useSearchParams();

  const runTimeHangingProtocolId = searchParams.get('hangingprotocolid');
  const [studyInstanceUIDs, setStudyInstanceUIDs] = useState();

  const [refresh, setRefresh] = useState(false);
  const layoutTemplateData = useRef(false);
  const locationRef = useRef(null);
  const isMounted = useRef(false);

  if (location !== locationRef.current) {
    layoutTemplateData.current = null;
    locationRef.current = location;
  }

  const {
    displaySetService,
    hangingProtocolService,
  } = (servicesManager as ServicesManager).services;

  const {
    extensions,
    sopClassHandlers,
    hotkeys: hotkeyObj,
    hangingProtocol,
  } = mode;
  // Preserve the old array interface for hotkeys
  const hotkeys = Array.isArray(hotkeyObj) ? hotkeyObj : hotkeyObj?.hotkeys;
  const hotkeyName = hotkeyObj?.name || 'hotkey-definitions-v2';

  if (dataSourceName === undefined) {
    dataSourceName = extensionManager.defaultDataSourceName;
  }

  extensionManager.setActiveDataSource(dataSourceName);

  // 这也是只处理第一个数据源
  const dataSource = extensionManager.getActiveDataSource()[0];

  // Only handling one route per mode for now - 现在一个mode只负责一个route？那在mode定义的时候数组只能有一个元素了
  const route = mode.routes[0];

  // For each extension, look up their context modules
  // TODO: move to extension manager.
  let contextModules = [];

  Object.keys(extensions).forEach(extensionId => {
    const allRegisteredModuleIds = Object.keys(extensionManager.modulesMap);
    const moduleIds = allRegisteredModuleIds.filter(id =>
      id.includes(`${extensionId}.contextModule.`)
    );

    if (!moduleIds || !moduleIds.length) {
      return;
    }

    const modules = moduleIds.map(extensionManager.getModuleEntry);
    contextModules = contextModules.concat(modules);
  });

  const contextModuleProviders = contextModules.map(a => a.provider);
  const CombinedContextProvider = ({ children }) =>
    Compose({ components: contextModuleProviders, children });

  function ViewportGridWithDataSource(props) {
    return ViewportGrid({ ...props, dataSource });
  }

  useEffect(() => {
    // Preventing state update for unmounted component
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 进入Mode后，Location会变化，导致监听触发
  // 最后会导致studyInstanceUIDs的变化，触发下一个监听
  useEffect(() => {
    // Todo: this should not be here, data source should not care about params
    const initializeDataSource = async (params, query) => {
      const studyInstanceUIDs = await dataSource.initialize({
        params,
        query,
      });
      setStudyInstanceUIDs(studyInstanceUIDs);
    };

    initializeDataSource(params, query);
    return () => {
      layoutTemplateData.current = null;
    };
  }, [location]);

  useEffect(() => {
    // 这里算是一个关键异步：在这里获取了layoutTemplateData后【应该就是那个布局模板，但不知道会什么会异步【会花很多时间吗？】】
    // 会更新layoutTemplateData.current，导致后面return时，判断条件满足然后调用renderLayoutData，从而展示各个页面布局组件
    // 并且会导致后面一个大监听满足条件，然后
    const retrieveLayoutData = async () => {
      const layoutData = await route.layoutTemplate({
        location,
        servicesManager,
        studyInstanceUIDs,
      });
      if (isMounted.current) {
        layoutTemplateData.current = layoutData;
        setRefresh(!refresh); // 【我觉得这个会让页面即可刷新？……
      }
    };
    if (studyInstanceUIDs?.length && studyInstanceUIDs[0] !== undefined) {
      retrieveLayoutData();
    }
    return () => {
      layoutTemplateData.current = null;
    };
  }, [studyInstanceUIDs]);

  useEffect(() => {
    if (!hotkeys) {
      return;
    }

    hotkeysManager.setDefaultHotKeys(hotkeys);

    const userPreferredHotkeys = JSON.parse(localStorage.getItem(hotkeyName));

    if (userPreferredHotkeys?.length) {
      hotkeysManager.setHotkeys(userPreferredHotkeys, hotkeyName);
    } else {
      hotkeysManager.setHotkeys(hotkeys, hotkeyName);
    }

    return () => {
      hotkeysManager.destroy();
    };
  }, []);

  // 大监听：当layoutTemplateData加载好后，进行如下操作：
  /// 1. 初始化DisplaySet服务
  /// 2. 应该是调用extensionMananger的什么函数进行初始化
  /// 3. 调整hangingProtocol服务
  /// 4. 调用mode.onModeEnter生命周期钩子
  /// 5. 调用setupRouteInit异步初始化，其中：会进行路由的初始化(defaultRouteInit/route.init)
  useEffect(() => {
    if (!layoutTemplateData.current) {
      return;
    }

    // TODO: For some reason this is running before the Providers
    // are calling setServiceImplementation
    // TODO -> iterate through services.

    // Extension

    // Add SOPClassHandlers to a new SOPClassManager.
    displaySetService.init(extensionManager, sopClassHandlers);

    extensionManager.onModeEnter({
      servicesManager,
      extensionManager,
      commandsManager,
    });

    // use the URL hangingProtocolId if it exists, otherwise use the one
    // defined in the mode configuration
    const hangingProtocolIdToUse = hangingProtocolService.getProtocolById(
      runTimeHangingProtocolId
    )
      ? runTimeHangingProtocolId
      : hangingProtocol;

    // Sets the active hanging protocols - if hangingProtocol is undefined,
    // resets to default.  Done before the onModeEnter to allow the onModeEnter
    // to perform custom hanging protocol actions
    hangingProtocolService.setActiveProtocolIds(hangingProtocolIdToUse);

    mode?.onModeEnter({
      servicesManager,
      extensionManager,
      commandsManager,
    });

    const setupRouteInit = async () => {
      /**
       * The next line should get all the query parameters provided by the URL
       * - except the StudyInstanceUIDs - and create an object called filters
       * used to filtering the study as the user wants otherwise it will return
       * a empty object.
       *
       * Example:
       * const filters = {
       *   seriesInstanceUID: 1.2.276.0.7230010.3.1.3.1791068887.5412.1620253993.114611
       * }
       */
      const filters =
        Array.from(query.keys()).reduce(
          (acc: Record<string, string>, val: string) => {
            if (val !== 'StudyInstanceUIDs') {
              if (['seriesInstanceUID', 'SeriesInstanceUID'].includes(val)) {
                return {
                  ...acc,
                  seriesInstanceUID: query.get(val),
                };
              }

              return { ...acc, [val]: query.get(val) };
            }
          },
          {}
        ) ?? {};

      if (route.init) {
        return await route.init(
          {
            servicesManager,
            extensionManager,
            hotkeysManager,
            studyInstanceUIDs,
            dataSource,
            filters,
          },
          hangingProtocolIdToUse
        );
      }

      return defaultRouteInit(
        {
          servicesManager,
          studyInstanceUIDs,
          dataSource,
          filters,
        },
        hangingProtocolIdToUse
      );
    };

    let unsubscriptions;
    setupRouteInit().then(unsubs => {
      unsubscriptions = unsubs;
    });

    return () => {
      // The mode.onModeExit must be done first to allow it to store
      // information, and must be in a try/catch to ensure subscriptions
      // are unsubscribed.
      try {
        mode?.onModeExit?.({
          servicesManager,
          extensionManager,
        });
      } catch (e) {
        console.warn('mode exit failure', e);
      }
      // The unsubscriptions must occur before the extension onModeExit
      // in order to prevent exceptions during cleanup caused by spurious events
      unsubscriptions.forEach(unsub => {
        unsub();
      });
      // The extension manager must be called after the mode, this is
      // expected to cleanup the state to a standard setup.
      extensionManager.onModeExit();
    };
  },

    [
      mode,
      dataSourceName,
      location,
      route,
      servicesManager,
      extensionManager,
      hotkeysManager,
      studyInstanceUIDs,
      refresh,
    ]);

  const renderLayoutData = props => {
    const layoutTemplateModuleEntry = extensionManager.getModuleEntry(
      layoutTemplateData.current.id
    );
    const LayoutComponent = layoutTemplateModuleEntry.component;

    return <LayoutComponent {...props} />;
  };

  return (
    <ImageViewerProvider
      // initialState={{ StudyInstanceUIDs: StudyInstanceUIDs }}
      StudyInstanceUIDs={studyInstanceUIDs}
    // reducer={reducer}
    >
      <CombinedContextProvider>
        <DragAndDropProvider>
          {layoutTemplateData.current &&
            studyInstanceUIDs?.length &&
            studyInstanceUIDs[0] !== undefined &&
            renderLayoutData({
              ...layoutTemplateData.current.props,
              ViewportGridComp: ViewportGridWithDataSource,
            })}
        </DragAndDropProvider>
      </CombinedContextProvider>
    </ImageViewerProvider>
  );
}

ModeRoute.propTypes = {
  mode: PropTypes.object.isRequired,
  dataSourceName: PropTypes.string,
  extensionManager: PropTypes.object,
  servicesManager: PropTypes.object,
  hotkeysManager: PropTypes.object,
};
