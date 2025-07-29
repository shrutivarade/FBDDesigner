import { useState, useCallback } from 'react';
import type { Point, Shape } from '../utils/hitTesting';
import { RectangleDrawer } from '../components/BasicObjects/Rectangle';
import { CircleDrawer } from '../components/BasicObjects/Circle';
import { LineDrawer } from '../components/BasicObjects/Line';
import { ArrowDrawer } from '../components/BasicObjects/Arrow';
import { PencilDrawer } from '../components/BasicObjects/Pencil';

export const useDrawing = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point>({ x: 0, y: 0 });
  const [drawEnd, setDrawEnd] = useState<Point>({ x: 0, y: 0 });
  const [currentPencilPoints, setCurrentPencilPoints] = useState<Point[]>([]);

  const startDrawing = useCallback((tool: string, startPoint: Point) => {
    setIsDrawing(true);
    
    if (tool === 'pencil') {
      setCurrentPencilPoints([startPoint]);
    } else {
      setDrawStart(startPoint);
      setDrawEnd(startPoint);
    }
  }, []);

  const updateDrawing = useCallback((tool: string, currentPoint: Point) => {
    if (!isDrawing) return;
    
    if (tool === 'pencil') {
      setCurrentPencilPoints(prev => [...prev, currentPoint]);
    } else {
      setDrawEnd(currentPoint);
    }
  }, [isDrawing]);

  const finishDrawing = useCallback((
    tool: string, 
    screenToCanvas: (point: Point) => Point
  ): Shape | null => {
    if (!isDrawing) return null;
    
    setIsDrawing(false);
    
    if (tool === 'pencil' && currentPencilPoints.length > 1) {
      const newShape = PencilDrawer.createPencil(currentPencilPoints, '#4e4e4e');
      setCurrentPencilPoints([]);
      return newShape;
    } else if (tool !== 'pencil' && tool !== 'text') {
      const canvasStart = screenToCanvas(drawStart);
      const canvasEnd = screenToCanvas(drawEnd);
      
      // Only create shape if it has some size (for rectangles and circles)
      // For lines and arrows, we allow any size including small ones
      const hasSize = tool === 'line' || tool === 'arrow' || 
        (Math.abs(canvasEnd.x - canvasStart.x) > 5 && Math.abs(canvasEnd.y - canvasStart.y) > 5);
      
      if (hasSize) {
        let newShape: Shape | null = null;
        
        switch (tool) {
          case 'rectangle':
            newShape = RectangleDrawer.createRectangle(
              canvasStart.x,
              canvasStart.y,
              canvasEnd.x,
              canvasEnd.y,
              '#4e4e4e'
            );
            break;
          case 'circle':
            newShape = CircleDrawer.createCircle(
              canvasStart.x,
              canvasStart.y,
              canvasEnd.x,
              canvasEnd.y,
              '#4e4e4e'
            );
            break;
          case 'line':
            newShape = LineDrawer.createLine(
              canvasStart.x,
              canvasStart.y,
              canvasEnd.x,
              canvasEnd.y,
              '#4e4e4e'
            );
            break;
          case 'arrow':
            newShape = ArrowDrawer.createArrow(
              canvasStart.x,
              canvasStart.y,
              canvasEnd.x,
              canvasEnd.y,
              '#4e4e4e'
            );
            break;
        }
        
        return newShape;
      }
    }
    
    setCurrentPencilPoints([]);
    return null;
  }, [isDrawing, currentPencilPoints, drawStart, drawEnd]);

  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setCurrentPencilPoints([]);
  }, []);

  return {
    isDrawing,
    drawStart,
    drawEnd,
    currentPencilPoints,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing
  };
}; 