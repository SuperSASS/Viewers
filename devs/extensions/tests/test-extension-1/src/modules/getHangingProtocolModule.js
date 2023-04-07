import {
  displaySetSelectors,
  ctAXIAL,
  ctCORONAL,
  ctSAGITTAL,
  mipSAGITTAL,
} from "../common/HangingProtocolModuleConfig"

const stage_default = {
  name: '默认2*2状态（类似ITK-SNAP）',
  viewportStructure: {
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
    ctAXIAL,
    ctSAGITTAL,
    ctCORONAL,
    mipSAGITTAL,
  ],
  createdDate: '2023-04-07T05:48:31.850Z',
}

const CocketBoat_HP_default = {
  id: 'CocketBoat_default',
  locked: true,
  hasUpdatedPriorsInformation: false,
  name: '默认挂片协议',
  createdDate: '2023-04-07T05:48:31.850Z',
  modifiedDate: '2023-04-07T05:48:31.850Z',
  availableTo: {},
  editableBy: {},
  imageLoadStrategy: 'interleaveTopToBottom',
  // toolGroupIds: ['default'],
  protocolMatchingRules: [], // 暂时不需要
  displaySetSelectors,
  stages: [stage_default],
  numberOfPriorsReferenced: -1,
};

function getHangingProtocolModule() {
  return [
    {
      name: CocketBoat_HP_default.id,
      protocol: CocketBoat_HP_default,
    },
  ];
};

export default getHangingProtocolModule;
