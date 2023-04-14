import { Types } from '@cornerstonejs/core';
import { utilities } from '@cornerstonejs/tools';

/**
 * 计算每一个label的体积
 * @param {Types.IImageVolume} volume 体素
 * @returns {number} 体积(ml)
 */
function calculateVolume(
  segmentations,
  SegmentationService
  // labelmaps: Array<Types.IImageVolume>
): Array<number> {
  const segmentation = segmentations[0];  // 只处理第一个Segmentation组【因为只有1个
  const labelmap = SegmentationService.getLabelmapVolume(segmentation.id);
  let volumes: Array<number> = [];
  let labelCounter: object;
  /// &~可能存在bug：不知道体素中标签编号是不是从0开始的，小心下面的curr对应不上
  /// 最好改成在遍历Data的时候，没有就加上
  for (let i = 1; i <= segmentation.segments.length; i++)
    volumes.push(0);

  const { imageData, spacing } = labelmap;
  const values = imageData
    .getPointData()
    .getScalars()
    .getData();

  // count non-zero values inside the outputData, this would
  // consider the overlapping regions to be only counted once
  const numVoxels = values.reduce((acc, curr) => {
    if (curr > 0) {
      volumes[curr]++;
      return acc + 1;
    }
    return acc;
  }, 0);

  console.log(volumes);
  volumes = volumes.map((volume) => { return 1e-3 * volume * spacing[0] * spacing[1] * spacing[2] })
  // return 1e-3 * numVoxels * spacing[0] * spacing[1] * spacing[2];
  return volumes;
}

export default calculateVolume;
