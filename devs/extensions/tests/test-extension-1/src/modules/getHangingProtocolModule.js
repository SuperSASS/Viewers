const CocketBoat_default = {
  id: 'CocketBoat_default',
  locked: true,
  hasUpdatedPriorsInformation: false,
  name: '默认挂片协议',
  createdDate: '2021-02-23T19:22:08.894Z',
  modifiedDate: '2022-10-04T19:22:08.894Z',
  availableTo: {},
  editableBy: {},
  protocolMatchingRules: [],
  imageLoadStrategy: 'interleaveTopToBottom',
  // toolGroupIds: ['default'],
  displaySetSelectors: { // 我们基本只处理可重建(Reconstructable)的影像，现在也假设为CT
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
      ],
      studyMatchingRules: [],
    },
  },

  stages: [
    {
      id: 'CocketBoat_dafaultStage',
      name: '默认2*2状态（类似ITK-SNAP）',
      viewportStructure: { // 定义2*2布局
        layoutType: 'grid',
        properties: {
          rows: 2,
          columns: 2,
          layoutOptions: [
            {
              x: 0,
              y: 0,
              width: 1 / 2,
              height: 1 / 2,
            },
            {
              x: 1 / 2,
              y: 0,
              width: 1 / 2,
              height: 1 / 2,
            },
            {
              x: 0,
              y: 1 / 2,
              width: 1 / 2,
              height: 1 / 2,
            },
            {
              x: 1 / 2,
              y: 1 / 2,
              width: 1 / 2,
              height: 1 / 2,
            },
          ],
        },
      },

      viewports: [
        { // 左上角 - 横切面
          viewportOptions: {
            viewportId: 'Axial',
            viewportType: 'volume',
            orientation: 'axial',
            toolGroupId: 'ctToolGroup',
            initialImageOptions: {
              preset: 'first', // 'first', 'last', 'middle'
              // index: 5,
            },
            syncGroups: [ // 暂时感觉不需要同步组
              // {
              //   type: 'cameraPosition',
              //   id: 'axialSync',
              //   source: true,
              //   target: true,
              // },
              // {
              //   type: 'voi',
              //   id: 'ctWLSync',
              //   source: true,
              //   target: true,
              // },
            ],
          },
          displaySets: [
            {
              id: 'ctDisplaySet',
            },
          ],
        },
        { // 右上角 - 侧面
          viewportOptions: {
            viewportId: 'Sagittal',
            viewportType: 'volume',
            orientation: 'sagittal',
            // toolGroupId: 'ctToolGroup',
            initialImageOptions: {
              preset: 'first', // 'first', 'last', 'middle'
              // index: 5,
            },
            syncGroups: [ // 暂时感觉不需要同步组
              // {
              //   type: 'voi',
              //   id: 'mpr',
              //   source: true,
              //   target: true,
              // },
            ],
          },
          displaySets: [
            {
              id: 'ctDisplaySet',
            },
          ],
        },
        { // 左下角 - 3D图
          viewportOptions: {
            viewportId: 'mip',
            viewportType: 'volume',
            background: [1, 1, 1],
            orientation: 'sagittal',
            toolGroupId: 'mipToolGroup',
            syncGroups: [
            ],
            // Custom props can be used to set custom properties which extensions
            // can react on.
            customViewportProps: {
              // We use viewportDisplay to filter the viewports which are displayed
              // in mip and we set the scrollbar according to their rotation index
              // in the cornerstone extension.
              hideOverlays: true,
            },
          },
          displaySets: [
            {
              options: {
                blendMode: 'MIP',
                slabThickness: 'fullVolume',
                voi: {
                  windowWidth: 5,
                  windowCenter: 2.5,
                },
                voiInverted: true,
              },
              id: 'ctDisplaySet',
            },
          ],
        },
        { // 右下角 - 正面
          viewportOptions: {
            viewportId: 'Axial',
            viewportType: 'volume',
            orientation: 'axial',
            toolGroupId: 'ptToolGroup',
            initialImageOptions: {
              preset: 'first', // 'first', 'last', 'middle'
              // index: 5,
            },
            syncGroups: [
            ],
          },
          displaySets: [
            {
              id: 'ctDisplaySet',
            },
          ],
        },
      ],
      createdDate: '2021-02-23T18:32:42.850Z',
    },
  ],
  numberOfPriorsReferenced: -1,
};

function getHangingProtocolModule() {
  return [
    {
      id: CocketBoat_default.id,
      protocol: CocketBoat_default,
    },
  ];
};

export default getHangingProtocolModule;
