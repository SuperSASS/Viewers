const displaySetSelectors = { // 我们基本只处理可重建(Reconstructable)的影像，现在也假设为CT
  ctDisplaySet: {
    imageMatchingRules: [],
    seriesMatchingRules: [
      {
        weight: 1,
        attribute: 'Modality',
        constraint: {
          equals: {
            value: 'CT',
          },
        },
        required: true,
      },
      {
        weight: 1,
        attribute: 'isReconstructable',
        constraint: {
          equals: {
            value: true,
          },
        },
        required: true,
      },
      {
        attribute: 'SeriesDescription',
        constraint: {
          contains: 'CT',
        },
      },
      {
        attribute: 'SeriesDescription',
        constraint: {
          contains: 'CT WB',
        },
      },
    ],
    studyMatchingRules: [],
  },
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

const viewportDisplaySets = "defaultDisplaySet"

const ctAXIAL = {
  viewportOptions: {
    viewportId: 'ctAXIAL',
    viewportType: 'volume',
    orientation: 'axial',
    toolGroupId: 'ctToolGroup',
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
    toolGroupId: 'ctToolGroup',
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
    toolGroupId: 'ctToolGroup',
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
    toolGroupId: 'mipToolGroup',
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
