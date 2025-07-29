import type { RectangleShape } from '../components/BasicObjects/Rectangle';
import type { CircleShape } from '../components/BasicObjects/Circle';
import type { LineShape } from '../components/BasicObjects/Line';
import type { ArrowShape } from '../components/BasicObjects/Arrow';
import type { PencilShape } from '../components/BasicObjects/Pencil';
import type { TextShape } from '../components/BasicObjects/Text';
import { TextDrawer } from '../components/BasicObjects/Text';

export interface Point {
  x: number;
  y: number;
}

export type Shape = RectangleShape | CircleShape | LineShape | ArrowShape | PencilShape | TextShape;

export const hitTestRectangle = (shape: RectangleShape, point: Point): boolean => {
  return point.x >= shape.x && 
         point.x <= shape.x + shape.width && 
         point.y >= shape.y && 
         point.y <= shape.y + shape.height;
};

export const hitTestCircle = (shape: CircleShape, point: Point): boolean => {
  const distance = Math.sqrt(
    Math.pow(point.x - shape.x, 2) + Math.pow(point.y - shape.y, 2)
  );
  return distance <= shape.radius;
};

export const hitTestLine = (shape: LineShape, point: Point): boolean => {
  const THRESHOLD = 5; // pixels
  const A = point.x - shape.x1;
  const B = point.y - shape.y1;
  const C = shape.x2 - shape.x1;
  const D = shape.y2 - shape.y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;
  if (param < 0) {
    xx = shape.x1;
    yy = shape.y1;
  } else if (param > 1) {
    xx = shape.x2;
    yy = shape.y2;
  } else {
    xx = shape.x1 + param * C;
    yy = shape.y1 + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy) <= THRESHOLD;
};

export const hitTestArrow = (shape: ArrowShape, point: Point): boolean => {
  // Create a temporary line shape for hit testing
  const lineShape: LineShape = {
    id: shape.id,
    type: 'line',
    x1: shape.x1,
    y1: shape.y1,
    x2: shape.x2,
    y2: shape.y2,
    strokeColor: shape.strokeColor
  };
  return hitTestLine(lineShape, point);
};

export const hitTestPencil = (shape: PencilShape, point: Point): boolean => {
  for (let i = 0; i < shape.points.length - 1; i++) {
    const lineShape: LineShape = {
      id: '',
      type: 'line',
      x1: shape.points[i].x,
      y1: shape.points[i].y,
      x2: shape.points[i + 1].x,
      y2: shape.points[i + 1].y,
      strokeColor: ''
    };
    if (hitTestLine(lineShape, point)) {
      return true;
    }
  }
  return false;
};

export const hitTestText = (shape: TextShape, point: Point, context: CanvasRenderingContext2D): boolean => {
  if (!context) return false;
  
  context.font = `${shape.fontSize}px ${shape.fontFamily}`;
  const textWidth = TextDrawer.getTextWidth(context, shape);
  const textHeight = TextDrawer.getTextHeight(shape);
  
  return point.x >= shape.x && 
         point.x <= shape.x + textWidth && 
         point.y >= shape.y && 
         point.y <= shape.y + textHeight;
};

export const findShapeAtPoint = (
  point: Point, 
  shapes: Shape[], 
  screenToCanvas: (point: Point) => Point,
  context: CanvasRenderingContext2D | null
): Shape | null => {
  // Convert screen coordinates to canvas coordinates
  const canvasPoint = screenToCanvas(point);
  
  // Check shapes in reverse order (top to bottom)
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    
    let isHit = false;
    switch (shape.type) {
      case 'rectangle':
        isHit = hitTestRectangle(shape, canvasPoint);
        break;
      case 'circle':
        isHit = hitTestCircle(shape, canvasPoint);
        break;
      case 'line':
        isHit = hitTestLine(shape, canvasPoint);
        break;
      case 'arrow':
        isHit = hitTestArrow(shape, canvasPoint);
        break;
      case 'pencil':
        isHit = hitTestPencil(shape, canvasPoint);
        break;
      case 'text':
        isHit = context ? hitTestText(shape, canvasPoint, context) : false;
        break;
    }
    
    if (isHit) {
      return shape;
    }
  }
  
  return null;
}; 