import type { Point, Shape } from './hitTesting';
import { getShapeBoundingBox } from './shapeSelection';
import { RectangleDrawer } from '../components/BasicObjects/Rectangle';
import { CircleDrawer } from '../components/BasicObjects/Circle';
import { LineDrawer } from '../components/BasicObjects/Line';
import { ArrowDrawer } from '../components/BasicObjects/Arrow';
import { PencilDrawer } from '../components/BasicObjects/Pencil';
import { TextDrawer } from '../components/BasicObjects/Text';
import type { TextShape } from '../components/BasicObjects/Text';

export interface CanvasRenderOptions {
  context: CanvasRenderingContext2D;
  scale: number;
  offset: Point;
  dimensions: { width: number; height: number };
}

// Draw grid pattern on the canvas
export const drawGrid = ({ context, scale, offset, dimensions }: CanvasRenderOptions) => {
  if (!context || !dimensions.width || !dimensions.height) return;
  
  context.strokeStyle = '#f0f0f0';
  context.lineWidth = 1;
  
  const gridSize = 50 * scale;
  const startX = Math.floor(-offset.x / gridSize) * gridSize + offset.x;
  const startY = Math.floor(-offset.y / gridSize) * gridSize + offset.y;
  
  // Vertical lines
  for (let x = startX; x < dimensions.width; x += gridSize) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, dimensions.height);
    context.stroke();
  }
  
  // Horizontal lines
  for (let y = startY; y < dimensions.height; y += gridSize) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(dimensions.width, y);
    context.stroke();
  }
};

// Draw all shapes
export const drawShapes = (
  context: CanvasRenderingContext2D,
  shapes: Shape[],
  scale: number,
  offset: Point,
  editingText?: TextShape | null,
  showTextCursor?: boolean,
  textCursorPosition?: number,
  textSelectionStart?: number | null,
  textSelectionEnd?: number | null
) => {
  if (!context) return;
  
  // Apply transformation for zoom and pan
  context.save();
  context.setTransform(scale, 0, 0, scale, offset.x, offset.y);
  
  shapes.forEach(shape => {
    switch (shape.type) {
      case 'rectangle':
        RectangleDrawer.draw(context, shape);
        break;
      case 'circle':
        CircleDrawer.draw(context, shape);
        break;
      case 'line':
        LineDrawer.draw(context, shape);
        break;
      case 'arrow':
        ArrowDrawer.draw(context, shape);
        break;
      case 'pencil':
        PencilDrawer.draw(context, shape);
        break;
      case 'text': {
        const isCurrentlyEditing = editingText?.id === shape.id;
        TextDrawer.draw(
          context, 
          shape, 
          showTextCursor && !!isCurrentlyEditing, 
          textCursorPosition || 0,
          textSelectionStart,
          textSelectionEnd
        );
        break;
      }
    }
  });
  
  context.restore();
};

// Draw preview of shape being drawn
export const drawPreview = (
  context: CanvasRenderingContext2D,
  selectedTool: string,
  isDrawing: boolean,
  drawStart: Point,
  drawEnd: Point,
  currentPencilPoints: Point[],
  scale: number,
  offset: Point,
  screenToCanvas: (point: Point) => Point
) => {
  if (!context || !isDrawing) return;
  
  context.save();
  context.setTransform(scale, 0, 0, scale, offset.x, offset.y);
  
  if (selectedTool === 'pencil' && currentPencilPoints.length > 1) {
    // Draw current pencil stroke
    const previewShape = PencilDrawer.createPencil(currentPencilPoints, '#666666');
    PencilDrawer.draw(context, previewShape);
  } else if (selectedTool !== 'pencil' && selectedTool !== 'text') {
    // For other tools, use start/end points
    const canvasStart = screenToCanvas(drawStart);
    const canvasEnd = screenToCanvas(drawEnd);
    
    switch (selectedTool) {
      case 'rectangle': {
        const previewShape = RectangleDrawer.createRectangle(
          canvasStart.x,
          canvasStart.y,
          canvasEnd.x,
          canvasEnd.y,
          '#666666'
        );
        RectangleDrawer.draw(context, previewShape);
        break;
      }
      case 'circle': {
        const previewShape = CircleDrawer.createCircle(
          canvasStart.x,
          canvasStart.y,
          canvasEnd.x,
          canvasEnd.y,
          '#666666'
        );
        CircleDrawer.draw(context, previewShape);
        break;
      }
      case 'line': {
        const previewShape = LineDrawer.createLine(
          canvasStart.x,
          canvasStart.y,
          canvasEnd.x,
          canvasEnd.y,
          '#666666'
        );
        LineDrawer.draw(context, previewShape);
        break;
      }
      case 'arrow': {
        const previewShape = ArrowDrawer.createArrow(
          canvasStart.x,
          canvasStart.y,
          canvasEnd.x,
          canvasEnd.y,
          '#666666'
        );
        ArrowDrawer.draw(context, previewShape);
        break;
      }
    }
  }
  
  context.restore();
};

// Draw selection rectangle
export const drawSelectionRect = (
  context: CanvasRenderingContext2D,
  isSelecting: boolean,
  selectionStart: Point,
  selectionEnd: Point
) => {
  if (!context || !isSelecting) return;
  
  const rectX = Math.min(selectionStart.x, selectionEnd.x);
  const rectY = Math.min(selectionStart.y, selectionEnd.y);
  const rectWidth = Math.abs(selectionEnd.x - selectionStart.x);
  const rectHeight = Math.abs(selectionEnd.y - selectionStart.y);

  // Selection fill using theme colors
  context.fillStyle = 'rgba(193, 247, 220, 0.3)'; // Tea green with transparency
  context.fillRect(rectX, rectY, rectWidth, rectHeight);

  // Selection border using theme colors
  context.strokeStyle = '#9CEEC1'; // Tea green sharp
  context.lineWidth = 1;
  context.strokeRect(rectX, rectY, rectWidth, rectHeight);
};

// Draw selection indicators for selected shapes
export const drawSelectionIndicators = (
  context: CanvasRenderingContext2D,
  selectedShapes: Set<string>,
  shapes: Shape[],
  scale: number,
  offset: Point,
  editingText?: TextShape | null
) => {
  if (!context || selectedShapes.size === 0) return;
  
  context.save();
  context.setTransform(scale, 0, 0, scale, offset.x, offset.y);
  
  selectedShapes.forEach(shapeId => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;
    
    context.strokeStyle = '#9CEEC1'; // Tea green sharp
    context.lineWidth = 2;
    
    const boundingBox = getShapeBoundingBox(shape, context);
    
    // Draw the rectangular bounding box for all shapes
    context.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
    
    // Draw resize handles for text shapes (only if not currently editing text)
    if (shape.type === 'text' && (!editingText || editingText.id !== shape.id)) {
      const handleSize = 8;
      context.fillStyle = '#9CEEC1';
      context.strokeStyle = '#4e4e4e';
      context.lineWidth = 1;
      
      // Corner handles
      const handles = [
        { x: boundingBox.x, y: boundingBox.y }, // NW
        { x: boundingBox.x + boundingBox.width, y: boundingBox.y }, // NE
        { x: boundingBox.x, y: boundingBox.y + boundingBox.height }, // SW
        { x: boundingBox.x + boundingBox.width, y: boundingBox.y + boundingBox.height } // SE
      ];
      
      handles.forEach(handle => {
        context.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
        context.strokeRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
      });
    }
  });
  
  context.setLineDash([]);
  context.restore();
};

// Clear and redraw the entire canvas
export const redrawCanvas = (
  context: CanvasRenderingContext2D,
  dimensions: { width: number; height: number },
  renderOptions: CanvasRenderOptions,
  shapes: Shape[],
  selectedShapes: Set<string>,
  isDrawing: boolean,
  isSelecting: boolean,
  selectionStart: Point,
  selectionEnd: Point,
  drawStart: Point,
  drawEnd: Point,
  currentPencilPoints: Point[],
  selectedTool: string,
  screenToCanvas: (point: Point) => Point,
  editingText?: TextShape | null,
  showTextCursor?: boolean,
  textCursorPosition?: number,
  textSelectionStart?: number | null,
  textSelectionEnd?: number | null
) => {
  if (!context || !dimensions.width || !dimensions.height) return;
  
  // Clear the canvas
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, dimensions.width, dimensions.height);
  
  // Draw components
  drawGrid(renderOptions);
  drawShapes(
    context, 
    shapes, 
    renderOptions.scale, 
    renderOptions.offset,
    editingText,
    showTextCursor,
    textCursorPosition,
    textSelectionStart,
    textSelectionEnd
  );
  drawPreview(
    context,
    selectedTool,
    isDrawing,
    drawStart,
    drawEnd,
    currentPencilPoints,
    renderOptions.scale,
    renderOptions.offset,
    screenToCanvas
  );
  drawSelectionRect(context, isSelecting, selectionStart, selectionEnd);
  drawSelectionIndicators(
    context, 
    selectedShapes, 
    shapes, 
    renderOptions.scale, 
    renderOptions.offset,
    editingText
  );
}; 