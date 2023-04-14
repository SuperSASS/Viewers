import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../Icon';
import SegmentationGroup from './SegmentationGroup';
import SegmentationConfig from './SegmentationConfig';

import { useTranslation } from 'react-i18next';

const GetSegmentationConfig = ({
  setFillAlpha,
  setFillAlphaInactive,
  setOutlineWidthActive,
  setRenderFill,
  setRenderInactiveSegmentations,
  setRenderOutline,
  setOutlineOpacityActive,
  segmentationConfig,
}) => {
  return (
    <SegmentationConfig
      setFillAlpha={setFillAlpha}
      setFillAlphaInactive={setFillAlphaInactive}
      setOutlineWidthActive={setOutlineWidthActive}
      setOutlineOpacityActive={setOutlineOpacityActive}
      setRenderFill={setRenderFill}
      setRenderInactiveSegmentations={setRenderInactiveSegmentations}
      setRenderOutline={setRenderOutline}
      segmentationConfig={segmentationConfig}
    />
  );
};

const SegmentationGroupTable = ({
  segmentations,
  segmentationConfig,
  showAddSegmentation,
  showAddSegment,
  showDeleteSegment,
  isMinimized,
  onSegmentationAdd,
  onSegmentationEdit,
  onSegmentationClick,
  onSegmentationDelete,
  onToggleSegmentationVisibility,
  onToggleMinimizeSegmentation,
  onSegmentClick,
  onSegmentAdd,
  onSegmentDelete,
  onSegmentEdit,
  onSegmentColorClick,
  onToggleSegmentVisibility,
  onToggleSegmentLock, // 新增上锁切换
  setFillAlpha,
  setFillAlphaInactive,
  setOutlineWidthActive,
  setOutlineOpacityActive,
  setRenderFill,
  setRenderInactiveSegmentations,
  setRenderOutline,
}) => {
  const { t } = useTranslation('PanelSegmentation');
  const AddSegmentation = t('NewSegmentation');

  return (
    <div className="flex flex-col min-h-0 font-inter font-[300]">
      <GetSegmentationConfig
        // showAddSegmentation={showAddSegmentation}
        // onSegmentationAdd={onSegmentationAdd}
        segmentationConfig={segmentationConfig}
        setFillAlpha={setFillAlpha}
        setFillAlphaInactive={setFillAlphaInactive}
        setOutlineWidthActive={setOutlineWidthActive}
        setOutlineOpacityActive={setOutlineOpacityActive}
        setRenderFill={setRenderFill}
        setRenderInactiveSegmentations={setRenderInactiveSegmentations}
        setRenderOutline={setRenderOutline}
      />
      <div className="flex flex-col min-h-0 pr-[1px] mt-1">
        {!!segmentations.length &&
          segmentations.map((segmentation, index) => {
            const {
              id,
              label,
              displayText = [],
              segmentCount,
              segments,
              isVisible,
              isActive,
              activeSegmentIndex,
            } = segmentation;
            return (
              <SegmentationGroup
                id={id}
                key={id}
                label={label}
                isMinimized={isMinimized[id]}
                segments={segments}
                showAddSegment={showAddSegment}
                segmentCount={segmentCount}
                isActive={isActive}
                isVisible={isVisible}
                onSegmentColorClick={onSegmentColorClick}
                onSegmentationClick={() => onSegmentationClick(id)}
                activeSegmentIndex={activeSegmentIndex}
                onToggleMinimizeSegmentation={onToggleMinimizeSegmentation}
                onSegmentAdd={onSegmentAdd}
                onSegmentDelete={onSegmentDelete}
                onSegmentationEdit={onSegmentationEdit}
                onSegmentationDelete={onSegmentationDelete}
                onSegmentClick={onSegmentClick}
                onSegmentEdit={onSegmentEdit}
                onToggleSegmentVisibility={onToggleSegmentVisibility}
                onToggleSegmentLock={onToggleSegmentLock} // 新增上锁切换
                onToggleSegmentationVisibility={onToggleSegmentationVisibility}
                showSegmentDelete={showDeleteSegment}
              />
            );
          })}
      </div>
      {showAddSegmentation && (
        <div
          className="flex items-center cursor-pointer hover:opacity-80 text-primary-active bg-black text-[12px] pl-1 h-[45px]"
          onClick={() => onSegmentationAdd()}
        >
          <Icon name="row-add" className="w-5 h-5" />
          <div className="pl-1">{AddSegmentation}</div>
        </div>
      )}
    </div>
  );
};

SegmentationGroupTable.propTypes = {
  segmentations: PropTypes.array.isRequired,
  activeSegmentationId: PropTypes.string,
  segmentationConfig: PropTypes.object,
  showAddSegmentation: PropTypes.bool,
  showAddSegment: PropTypes.bool,
  showDeleteSegment: PropTypes.bool,
  isMinimized: PropTypes.object,
  onSegmentationAdd: PropTypes.func,
  onSegmentationEdit: PropTypes.func,
  onSegmentationClick: PropTypes.func,
  onSegmentationDelete: PropTypes.func,
  onToggleSegmentationVisibility: PropTypes.func,
  onToggleMinimizeSegmentation: PropTypes.func,
  onSegmentClick: PropTypes.func,
  onSegmentAdd: PropTypes.func,
  onSegmentDelete: PropTypes.func,
  onSegmentEdit: PropTypes.func,
  onSegmentColorClick: PropTypes.func,
  onToggleSegmentVisibility: PropTypes.func,
  onToggleSegmentLock: PropTypes.func, // 新增上锁切换
  setFillAlpha: PropTypes.func,
  setFillAlphaInactive: PropTypes.func,
  setOutlineWidthActive: PropTypes.func,
  setOutlineOpacityActive: PropTypes.func,
  setRenderFill: PropTypes.func,
  setRenderInactiveSegmentations: PropTypes.func,
  setRenderOutline: PropTypes.func,
};

SegmentationGroupTable.defaultProps = {
  segmentations: [],
  activeSegmentationId: '',
  segmentationConfig: {
    initialConfig: {
      fillAlpha: 0.5,
      fillAlphaInactive: 0.5,
      outlineWidthActive: 1,
      outlineOpacity: 1,
      outlineOpacityInactive: 0.5,
      renderFill: true,
      renderInactiveSegmentations: true,
      renderOutline: true,
    },
    usePercentage: true,
  },
  showAddSegmentation: false,
  showAddSegment: false,
  showDeleteSegment: false,
  isMinimized: {},
  onSegmentationAdd: () => { },
  onSegmentationEdit: () => { },
  onSegmentationClick: () => { },
  onSegmentationDelete: () => { },
  onToggleSegmentationVisibility: () => { },
  onToggleMinimizeSegmentation: () => { },
  onSegmentClick: () => { },
  onSegmentAdd: () => { },
  onSegmentDelete: () => { },
  onSegmentEdit: () => { },
  onSegmentColorClick: () => { },
  onToggleSegmentVisibility: () => { },
  onToggleSegmentLock: () => { }, // 新增上锁切换
  setFillAlpha: () => { },
  setFillAlphaInactive: () => { },
  setOutlineWidthActive: () => { },
  setOutlineOpacityActive: () => { },
  setRenderFill: () => { },
  setRenderInactiveSegmentations: () => { },
  setRenderOutline: () => { },
};

export default SegmentationGroupTable;
