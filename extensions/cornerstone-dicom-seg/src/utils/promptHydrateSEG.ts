// 应当是展示Viewport上方的Dialog询问框的
/// 在这里调用uiViewportDialogService.show()后，并不会真的展现，而只是更新viewportDialogState
/// 需要在Viewport.tsx中，获取const [viewportDialogState, viewportDialogApi] = useViewportDialog();
/// 然后添加一个Notification组件，属性传状态里的属性
//// 具体做法参考SEGViewport
import hydrateSEGDisplaySet from './_hydrateSEG';

const RESPONSE = {
  NO_NEVER: -1,
  CANCEL: 0,
  HYDRATE_SEG: 5,
};

function promptHydrateSEG({
  servicesManager,
  segDisplaySet,
  viewportIndex,
}) {
  const { uiViewportDialogService } = servicesManager.services;

  return new Promise(async function (resolve, reject) {
    const promptResult = await _askHydrate(
      uiViewportDialogService,
      viewportIndex
    );

    // 如果选了Yes，异步等待hydrateSEGDisplaySet完成
    /// 其中会调用segmentationService.hydrateSegmentation，完成标签的加载、与ReferenceSeries绑定。
    if (promptResult === RESPONSE.HYDRATE_SEG) {
      const isHydrated = await hydrateSEGDisplaySet({ // isHydrate是boolean
        segDisplaySet,
        viewportIndex,
        servicesManager,
      });

      resolve(isHydrated);
    }
  });
}

// 询问是否打开这个Segementaion（里的所有Segments）
function _askHydrate(uiViewportDialogService, viewportIndex) {
  return new Promise(function (resolve, reject) {
    const message = 'Do you want to open this Segmentation?';
    const actions = [
      {
        type: 'secondary',
        text: 'No',
        value: RESPONSE.CANCEL,
      },
      {
        type: 'primary',
        text: 'Yes',
        value: RESPONSE.HYDRATE_SEG,
      },
    ];
    const onSubmit = result => {
      uiViewportDialogService.hide();
      resolve(result);
    };

    uiViewportDialogService.show({
      viewportIndex,
      type: 'info',
      message,
      actions,
      onSubmit,
      onOutsideClick: () => {
        uiViewportDialogService.hide();
        resolve(RESPONSE.CANCEL);
      },
    });
  });
}

export default promptHydrateSEG;
