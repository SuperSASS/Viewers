export const toolGroupIds = {
  default: "defaultToolGroup",
  mip: "mipToolGroup",
}

// 在这个HP中，只要存在Frames的就可以尝试挂到Viewport上【主要是针对SEG文件
const displaySetSelectors = {
  defaultDisplaySet: {
    seriesMatchingRules: [
      {
        attribute: 'numImageFrames',
        constraint: {
          greaterThan: { value: 0 },
        },
      },
    ],
  },
};
const viewportDisplaySets = "defaultDisplaySet";

// 四种具体的Viewport、类似于ITK-SNAP
const ctAXIAL = {
  viewportOptions: {
    viewportId: 'ctAXIAL',
    viewportType: 'volume',
    orientation: 'axial',
    toolGroupId: toolGroupIds.default,
    initialImageOptions: {
      // index: 5,
      preset: 'first', // 'first', 'last', 'middle'
    },
    syncGroups: [
      {
        type: 'voi',
        id: 'ctWLSync',
        source: true,
        target: true,
      },
    ],
  },
  displaySets: [
    {
      id: viewportDisplaySets,
    },
  ],
};
const ctSAGITTAL = {
  viewportOptions: {
    viewportId: 'ctSAGITTAL',
    viewportType: 'volume',
    orientation: 'sagittal',
    toolGroupId: toolGroupIds.default,
    syncGroups: [
      {
        type: 'voi',
        id: 'ctWLSync',
        source: true,
        target: true,
      },
    ],
  },
  displaySets: [
    {
      id: viewportDisplaySets,
    },
  ],
};
const ctCORONAL = {
  viewportOptions: {
    viewportId: 'ctCORONAL',
    viewportType: 'volume',
    orientation: 'coronal',
    toolGroupId: toolGroupIds.default,
    syncGroups: [
      {
        type: 'voi',
        id: 'ctWLSync',
        source: true,
        target: true,
      },
    ],
  },
  displaySets: [
    {
      id: viewportDisplaySets,
    },
  ],
};
const mipSAGITTAL = {
  viewportOptions: {
    viewportId: 'mipSagittal',
    viewportType: 'volume',
    orientation: 'sagittal',
    // background: [1, 1, 1],
    toolGroupId: toolGroupIds.mip,
    syncGroups: [
    ],
    customViewportProps: {
      hideOverlays: true,
    },
  },
  displaySets: [
    {
      options: {
        blendMode: 'MIP',
        slabThickness: 'fullVolume',
        voi: {
          windowWidth: 480,
          windowCenter: 2500,
        },
        // voiInverted: true,
      },
      id: viewportDisplaySets,
    },
  ],
};

export {
  displaySetSelectors,
  ctAXIAL,
  ctSAGITTAL,
  ctCORONAL,
  mipSAGITTAL,
};
