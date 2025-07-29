import type { LineShape } from '../components/BasicObjects/Line';
import type { ArrowShape } from '../components/BasicObjects/Arrow';
import type { PencilShape } from '../components/BasicObjects/Pencil';
import type { TextShape } from '../components/BasicObjects/Text';
import { TextDrawer } from '../components/BasicObjects/Text';
import type { Point, Shape } from './hitTesting';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Check if a shape is inside the selection rectangle
export const isShapeInSelection = (
  shape: Shape, 
  selectionRect: SelectionRect, 
  offset: Point, 
  scale: number,
  context?: CanvasRenderingContext2D | null
): boolean => {
  const canvasSelectionRect = {
    x: (selectionRect.x - offset.x) / scale,
    y: (selectionRect.y - offset.y) / scale,
    width: selectionRect.width / scale,
    height: selectionRect.height / scale
  };

  switch (shape.type) {
    case 'rectangle':
      return (
        shape.x >= canvasSelectionRect.x &&
        shape.y >= canvasSelectionRect.y &&
        shape.x + shape.width <= canvasSelectionRect.x + canvasSelectionRect.width &&
        shape.y + shape.height <= canvasSelectionRect.y + canvasSelectionRect.height
      );
    
    case 'circle':
      return (
        shape.x - shape.radius >= canvasSelectionRect.x &&
        shape.y - shape.radius >= canvasSelectionRect.y &&
        shape.x + shape.radius <= canvasSelectionRect.x + canvasSelectionRect.width &&
        shape.y + shape.radius <= canvasSelectionRect.y + canvasSelectionRect.height
      );
    
    case 'line':
    case 'arrow': {
      const lineShape = shape as LineShape | ArrowShape;
      const minX = Math.min(lineShape.x1, lineShape.x2);
      const minY = Math.min(lineShape.y1, lineShape.y2);
      const maxX = Math.max(lineShape.x1, lineShape.x2);
      const maxY = Math.max(lineShape.y1, lineShape.y2);
      return (
        minX >= canvasSelectionRect.x &&
        minY >= canvasSelectionRect.y &&
        maxX <= canvasSelectionRect.x + canvasSelectionRect.width &&
        maxY <= canvasSelectionRect.y + canvasSelectionRect.height
      );
    }
    
    case 'pencil': {
      const pencilShape = shape as PencilShape;
      if (pencilShape.points.length === 0) return false;
      const xs = pencilShape.points.map(p => p.x);
      const ys = pencilShape.points.map(p => p.y);
      const minPencilX = Math.min(...xs);
      const minPencilY = Math.min(...ys);
      const maxPencilX = Math.max(...xs);
      const maxPencilY = Math.max(...ys);
      return (
        minPencilX >= canvasSelectionRect.x &&
        minPencilY >= canvasSelectionRect.y &&
        maxPencilX <= canvasSelectionRect.x + canvasSelectionRect.width &&
        maxPencilY <= canvasSelectionRect.y + canvasSelectionRect.height
      );
    }
    
    case 'text': {
      const textShape = shape as TextShape;
      if (!context) return false;
      context.font = `${textShape.fontSize}px ${textShape.fontFamily}`;
      const textWidth = context.measureText(textShape.text).width;
      return (
        textShape.x >= canvasSelectionRect.x &&
        textShape.y >= canvasSelectionRect.y &&
        textShape.x + textWidth <= canvasSelectionRect.x + canvasSelectionRect.width &&
        textShape.y + textShape.fontSize <= canvasSelectionRect.y + canvasSelectionRect.height
      );
    }
    
    default:
      return false;
  }
};

// Get bounding box for a shape
export const getShapeBoundingBox = (shape: Shape, context?: CanvasRenderingContext2D | null): BoundingBox => {
  switch (shape.type) {
    case 'rectangle':
      return {
        x: shape.x - 5,
        y: shape.y - 5,
        width: shape.width + 10,
        height: shape.height + 10
      };
      
    case 'circle':
      return {
        x: shape.x - shape.radius - 5,
        y: shape.y - shape.radius - 5,
        width: (shape.radius * 2) + 10,
        height: (shape.radius * 2) + 10
      };
      
    case 'line':
    case 'arrow': {
      const lineShape = shape as LineShape | ArrowShape;
      const minX = Math.min(lineShape.x1, lineShape.x2);
      const minY = Math.min(lineShape.y1, lineShape.y2);
      const maxX = Math.max(lineShape.x1, lineShape.x2);
      const maxY = Math.max(lineShape.y1, lineShape.y2);
      return {
        x: minX - 5,
        y: minY - 5,
        width: (maxX - minX) + 10,
        height: (maxY - minY) + 10
      };
    }
      
    case 'pencil': {
      const pencilShape = shape as PencilShape;
      if (pencilShape.points.length > 0) {
        const xs = pencilShape.points.map(p => p.x);
        const ys = pencilShape.points.map(p => p.y);
        const minPencilX = Math.min(...xs);
        const minPencilY = Math.min(...ys);
        const maxPencilX = Math.max(...xs);
        const maxPencilY = Math.max(...ys);
        return {
          x: minPencilX - 5,
          y: minPencilY - 5,
          width: (maxPencilX - minPencilX) + 10,
          height: (maxPencilY - minPencilY) + 10
        };
      }
      return { x: 0, y: 0, width: 0, height: 0 };
    }
      
    case 'text': {
      const textShape = shape as TextShape;
      if (!context) return { x: shape.x, y: shape.y, width: 100, height: shape.fontSize };
      
      context.font = `${textShape.fontSize}px ${textShape.fontFamily}`;
      const textWidth = TextDrawer.getTextWidth(context, textShape);
      const textHeight = TextDrawer.getTextHeight(textShape);
      return {
        x: textShape.x - 5,
        y: textShape.y - 5,
        width: textWidth + 10,
        height: textHeight + 10
      };
    }
      
    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
}; 