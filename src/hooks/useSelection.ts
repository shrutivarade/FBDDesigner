import { useState, useCallback } from 'react';
import type { Point, Shape } from '../utils/hitTesting';
import type { SelectionRect } from '../utils/shapeSelection';
import { isShapeInSelection } from '../utils/shapeSelection';

export const useSelection = () => {
  const [selectedShapes, setSelectedShapes] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point>({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState<Point>({ x: 0, y: 0 });

  const selectShape = useCallback((shapeId: string) => {
    setSelectedShapes(new Set([shapeId]));
  }, []);

  const toggleShapeSelection = useCallback((shapeId: string) => {
    setSelectedShapes(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(shapeId)) {
        newSelection.delete(shapeId);
      } else {
        newSelection.add(shapeId);
      }
      return newSelection;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedShapes(new Set());
  }, []);

  const startSelection = useCallback((startPoint: Point) => {
    setIsSelecting(true);
    setSelectionStart(startPoint);
    setSelectionEnd(startPoint);
  }, []);

  const updateSelection = useCallback((endPoint: Point) => {
    if (isSelecting) {
      setSelectionEnd(endPoint);
    }
  }, [isSelecting]);

  const finishSelection = useCallback((
    shapes: Shape[], 
    offset: Point, 
    scale: number,
    context?: CanvasRenderingContext2D | null
  ) => {
    if (!isSelecting) return;
    
    setIsSelecting(false);
    
    const rectX = Math.min(selectionStart.x, selectionEnd.x);
    const rectY = Math.min(selectionStart.y, selectionEnd.y);
    const rectWidth = Math.abs(selectionEnd.x - selectionStart.x);
    const rectHeight = Math.abs(selectionEnd.y - selectionStart.y);

    // Only process as selection rectangle if there was actual dragging
    if (rectWidth > 5 || rectHeight > 5) {
      const selectionRect: SelectionRect = {
        x: rectX,
        y: rectY,
        width: rectWidth,
        height: rectHeight
      };

      // Find all shapes inside the selection rectangle
      const shapesInSelection = shapes.filter(shape => 
        isShapeInSelection(shape, selectionRect, offset, scale, context)
      );

      if (shapesInSelection.length > 0) {
        setSelectedShapes(new Set(shapesInSelection.map(shape => shape.id)));
      } else {
        clearSelection();
      }
    }
  }, [isSelecting, selectionStart, selectionEnd, clearSelection]);

  const cancelSelection = useCallback(() => {
    setIsSelecting(false);
  }, []);

  return {
    selectedShapes,
    isSelecting,
    selectionStart,
    selectionEnd,
    selectShape,
    toggleShapeSelection,
    clearSelection,
    startSelection,
    updateSelection,
    finishSelection,
    cancelSelection
  };
}; 