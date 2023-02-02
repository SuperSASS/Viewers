import { MeasurementService } from '@ohif/core';
import Length from './Length';
import Bidirectional from './Bidirectional';
import EllipticalROI from './EllipticalROI';
import ArrowAnnotate from './ArrowAnnotate';
import CobbAngle from './CobbAngle';

const measurementServiceMappingsFactory = (
  measurementService: MeasurementService,
  displaySetService,
  cornerstoneViewportService
) => {
  /**
   * Maps measurement service format object to cornerstone annotation object.
   *
   * @param {Measurement} measurement The measurement instance
   * @param {string} definition The source definition
   * @return {Object} Cornerstone annotation data
   */

  const _getValueTypeFromToolType = toolType => {
    const {
      POLYLINE,
      ELLIPSE,
      RECTANGLE,
      BIDIRECTIONAL,
      POINT,
      ANGLE,
    } = measurementService.VALUE_TYPES;

    // TODO -> I get why this was attempted, but its not nearly flexible enough.
    // A single measurement may have an ellipse + a bidirectional measurement, for instances.
    // You can't define a bidirectional tool as a single type..
    const TOOL_TYPE_TO_VALUE_TYPE = {
      Length: POLYLINE,
      EllipticalROI: ELLIPSE,
      RectangleROI: RECTANGLE,
      Bidirectional: BIDIRECTIONAL,
      ArrowAnnotate: POINT,
      CobbAngle: ANGLE,
      Angle: ANGLE,
    };

    return TOOL_TYPE_TO_VALUE_TYPE[toolType];
  };

  return {
    Length: {
      toAnnotation: Length.toAnnotation,
      toMeasurement: csToolsAnnotation =>
        Length.toMeasurement(
          csToolsAnnotation,
          displaySetService,
          cornerstoneViewportService,
          _getValueTypeFromToolType
        ),
      matchingCriteria: [
        {
          valueType: measurementService.VALUE_TYPES.POLYLINE,
          points: 2,
        },
      ],
    },
    Bidirectional: {
      toAnnotation: Bidirectional.toAnnotation,
      toMeasurement: csToolsAnnotation =>
        Bidirectional.toMeasurement(
          csToolsAnnotation,
          displaySetService,
          cornerstoneViewportService,
          _getValueTypeFromToolType
        ),
      matchingCriteria: [
        // TODO -> We should eventually do something like shortAxis + longAxis,
        // But its still a little unclear how these automatic interpretations will work.
        {
          valueType: measurementService.VALUE_TYPES.POLYLINE,
          points: 2,
        },
        {
          valueType: measurementService.VALUE_TYPES.POLYLINE,
          points: 2,
        },
      ],
    },
    EllipticalROI: {
      toAnnotation: EllipticalROI.toAnnotation,
      toMeasurement: csToolsAnnotation =>
        EllipticalROI.toMeasurement(
          csToolsAnnotation,
          displaySetService,
          cornerstoneViewportService,
          _getValueTypeFromToolType
        ),
      matchingCriteria: [
        {
          valueType: measurementService.VALUE_TYPES.ELLIPSE,
        },
      ],
    },

    ArrowAnnotate: {
      toAnnotation: ArrowAnnotate.toAnnotation,
      toMeasurement: csToolsAnnotation =>
        ArrowAnnotate.toMeasurement(
          csToolsAnnotation,
          displaySetService,
          cornerstoneViewportService,
          _getValueTypeFromToolType
        ),
      matchingCriteria: [
        {
          valueType: measurementService.VALUE_TYPES.POINT,
          points: 1,
        },
      ],
    },

    CobbAngle: {
      toAnnotation: CobbAngle.toAnnotation,
      toMeasurement: csToolsAnnotation =>
        CobbAngle.toMeasurement(
          csToolsAnnotation,
          displaySetService,
          cornerstoneViewportService,
          _getValueTypeFromToolType
        ),
      matchingCriteria: [
        {
          valueType: measurementService.VALUE_TYPES.ANGLE,
        },
      ],
    },
  };
};

export default measurementServiceMappingsFactory;