import React, { useEffect, useCallback, useState } from 'react';
import type { Point, Shape } from '../utils/hitTesting';
import { findShapeAtPoint } from '../utils/hitTesting';
import { useCanvasState } from '../hooks/useCanvasState';
import { useTextEditing } from '../hooks/useTextEditing';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useDrawing } from '../hooks/useDrawing';
import { useSelection } from '../hooks/useSelection';
import { redrawCanvas } from '../utils/canvasRenderer';
import { TextDrawer } from './BasicObjects/Text';
import type { TextShape } from './BasicObjects/Text';
import { getShapeBoundingBox } from '../utils/shapeSelection';

interface CanvasProps {
  selectedTool: string | null;
  onToolSelect: (tool: string) => void;
}

const Canvas: React.FC<CanvasProps> = ({ selectedTool, onToolSelect }) => {
  // Canvas state management
  const {
    canvasRef,
    containerRef,
    context,
    scale,
    offset,
    dimensions,
    isPanning,
    screenToCanvas,
    resetZoom,
    startPanning,
    updatePan,
    stopPanning,
    zoomAt,
    setOffset
  } = useCanvasState();

  // Shape management
  const [shapes, setShapes] = useState<Shape[]>([]);
  const { addToHistory, undo, redo } = useUndoRedo([]);

  // Text editing
  const {
    editingText,
    textCursorPosition,
    showTextCursor,
    textSelectionStart,
    textSelectionEnd,
    setTextCursorPosition,
    setTextSelectionStart,
    setTextSelectionEnd,
    startEditing,
    finishEditing,
    updateText,
    handleTextClick,
    deleteSelectedText,
    clearSelection: clearTextSelection
  } = useTextEditing();

  // Drawing
  const {
    isDrawing,
    drawStart,
    drawEnd,
    currentPencilPoints,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing
  } = useDrawing();

  // Selection
  const {
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
  } = useSelection();

  // Text resizing state
  const [isResizingText, setIsResizingText] = useState(false);
  const [textResizeHandle, setTextResizeHandle] = useState<string | null>(null);
  const [textResizeStartMouse, setTextResizeStartMouse] = useState<Point>({x: 0, y: 0});
  const [originalFontSize, setOriginalFontSize] = useState<number>(16);

  // Detect if we're on Mac
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // Helper function to check if mouse is over a resize handle
  const getResizeHandle = useCallback((mousePos: Point, boundingBox: {x: number, y: number, width: number, height: number}): string | null => {
    const handleSize = 10;
    
    // Convert bounding box to screen coordinates
    const screenBounds = {
      x: boundingBox.x * scale + offset.x,
      y: boundingBox.y * scale + offset.y,
      width: boundingBox.width * scale,
      height: boundingBox.height * scale
    };
    
    // Check corners
    const handles = [
      { name: 'nw', x: screenBounds.x, y: screenBounds.y },
      { name: 'ne', x: screenBounds.x + screenBounds.width, y: screenBounds.y },
      { name: 'sw', x: screenBounds.x, y: screenBounds.y + screenBounds.height },
      { name: 'se', x: screenBounds.x + screenBounds.width, y: screenBounds.y + screenBounds.height }
    ];
    
    for (const handle of handles) {
      if (Math.abs(mousePos.x - handle.x) <= handleSize && 
          Math.abs(mousePos.y - handle.y) <= handleSize) {
        return handle.name;
      }
    }
    
    return null;
  }, [scale, offset]);

  // Keyboard event handling for text input, ESC key, and undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo shortcuts
      if ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) {
        if (e.shiftKey && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          const undoneShapes = redo();
          if (undoneShapes) setShapes(undoneShapes);
          return;
        } else if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          const undoneShapes = undo();
          if (undoneShapes) setShapes(undoneShapes);
          return;
        }
      }

      // ESC key - always reset to select mode and finish any editing
      if (e.key === 'Escape') {
        e.preventDefault();
        
        // Finish any text editing
        if (editingText) {
          const updatedText = finishEditing();
          if (updatedText) {
            const newShapes = shapes.map(shape => 
              shape.id === editingText.id ? updatedText : shape
            );
            setShapes(newShapes);
            addToHistory(newShapes);
          }
        }
        
        // Clear any shape selections
        clearSelection();
        return;
      }
      
      // Handle text editing keys only when editing text
      if (!editingText) return;
      
      // Handle text selection shortcuts
      if ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) {
        if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          setTextSelectionStart(0);
          setTextSelectionEnd(editingText.text.length);
          setTextCursorPosition(editingText.text.length);
          return;
        }
      }
      
      e.preventDefault();
      
      if (e.key === 'Enter') {
        const { newText: textAfterDeletion, newCursorPos } = deleteSelectedText();
        const newText = textAfterDeletion.slice(0, newCursorPos) + 
                        '\n' + 
                        textAfterDeletion.slice(newCursorPos);
        const updatedText = updateText(newText);
        if (updatedText) {
          setShapes(prev => prev.map(shape => 
            shape.id === editingText.id ? updatedText : shape
          ));
          setTextCursorPosition(newCursorPos + 1);
          clearTextSelection();
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        if (textSelectionStart !== null && textSelectionEnd !== null) {
          const { newText, newCursorPos } = deleteSelectedText();
          const updatedText = updateText(newText);
          if (updatedText) {
            setShapes(prev => prev.map(shape => 
              shape.id === editingText.id ? updatedText : shape
            ));
            setTextCursorPosition(newCursorPos);
            clearTextSelection();
          }
        } else if (e.key === 'Backspace' && textCursorPosition > 0) {
          const newText = editingText.text.slice(0, textCursorPosition - 1) + 
                          editingText.text.slice(textCursorPosition);
          const updatedText = updateText(newText);
          if (updatedText) {
            setShapes(prev => prev.map(shape => 
              shape.id === editingText.id ? updatedText : shape
            ));
            setTextCursorPosition(textCursorPosition - 1);
          }
        } else if (e.key === 'Delete' && textCursorPosition < editingText.text.length) {
          const newText = editingText.text.slice(0, textCursorPosition) + 
                          editingText.text.slice(textCursorPosition + 1);
          const updatedText = updateText(newText);
          if (updatedText) {
            setShapes(prev => prev.map(shape => 
              shape.id === editingText.id ? updatedText : shape
            ));
          }
        }
      } else if (e.key === 'ArrowLeft') {
        if (e.shiftKey) {
          if (textSelectionStart === null) {
            setTextSelectionStart(textCursorPosition);
          }
          const newPos = Math.max(0, textCursorPosition - 1);
          setTextCursorPosition(newPos);
          setTextSelectionEnd(newPos);
        } else {
          if (textSelectionStart !== null && textSelectionEnd !== null) {
            const start = Math.min(textSelectionStart, textSelectionEnd);
            setTextCursorPosition(start);
            clearTextSelection();
          } else {
            setTextCursorPosition(Math.max(0, textCursorPosition - 1));
          }
        }
      } else if (e.key === 'ArrowRight') {
        if (e.shiftKey) {
          if (textSelectionStart === null) {
            setTextSelectionStart(textCursorPosition);
          }
          const newPos = Math.min(editingText.text.length, textCursorPosition + 1);
          setTextCursorPosition(newPos);
          setTextSelectionEnd(newPos);
        } else {
          if (textSelectionStart !== null && textSelectionEnd !== null) {
            const end = Math.max(textSelectionStart, textSelectionEnd);
            setTextCursorPosition(end);
            clearTextSelection();
          } else {
            setTextCursorPosition(Math.min(editingText.text.length, textCursorPosition + 1));
          }
        }
      } else if (e.key === 'Tab') {
        const { newText: textAfterDeletion, newCursorPos } = deleteSelectedText();
        const newText = textAfterDeletion.slice(0, newCursorPos) + 
                        '    ' + 
                        textAfterDeletion.slice(newCursorPos);
        const updatedText = updateText(newText);
        if (updatedText) {
          setShapes(prev => prev.map(shape => 
            shape.id === editingText.id ? updatedText : shape
          ));
          setTextCursorPosition(newCursorPos + 4);
          clearTextSelection();
        }
      } else if (e.key.length === 1) {
        const { newText: textAfterDeletion, newCursorPos } = deleteSelectedText();
        const newText = textAfterDeletion.slice(0, newCursorPos) + 
                        e.key + 
                        textAfterDeletion.slice(newCursorPos);
        const updatedText = updateText(newText);
        if (updatedText) {
          setShapes(prev => prev.map(shape => 
            shape.id === editingText.id ? updatedText : shape
          ));
          setTextCursorPosition(newCursorPos + 1);
          clearTextSelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editingText, textCursorPosition, textSelectionStart, textSelectionEnd, 
    isMac, undo, redo, shapes, addToHistory, finishEditing, updateText,
    deleteSelectedText, clearTextSelection, clearSelection
  ]);

  // Redraw canvas when state changes
  useEffect(() => {
    if (!context) return;
    
    redrawCanvas(
      context,
      dimensions,
      { context, scale, offset, dimensions },
      shapes,
      selectedShapes,
      isDrawing,
      isSelecting,
      selectionStart,
      selectionEnd,
      drawStart,
      drawEnd,
      currentPencilPoints,
      selectedTool || '',
      screenToCanvas,
      editingText,
      showTextCursor,
      textCursorPosition,
      textSelectionStart,
      textSelectionEnd
    );
  }, [
    context, dimensions, scale, offset, shapes, selectedShapes,
    isDrawing, isSelecting, selectionStart, selectionEnd,
    drawStart, drawEnd, currentPencilPoints, selectedTool,
    screenToCanvas, editingText, showTextCursor, textCursorPosition,
    textSelectionStart, textSelectionEnd
  ]);

  // Clear selections when tool changes (except when switching to select)
  useEffect(() => {
    if (selectedTool && selectedTool !== 'select') {
      clearSelection();
    }
  }, [selectedTool, clearSelection]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Check if the correct modifier key is pressed for panning
  const shouldPan = (e: React.MouseEvent<HTMLCanvasElement>): boolean => {
    if (isMac) {
      return (e.button === 0 && e.metaKey) || e.button === 1;
    } else {
      return (e.button === 0 && e.ctrlKey) || e.button === 1;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const mousePos = getMousePos(e);
    
    if (shouldPan(e)) {
      startPanning(mousePos);
      e.preventDefault();
    } else if (e.button === 0) {
      // Check for text resize handles first
      if (selectedTool === 'select' && selectedShapes.size === 1) {
        const selectedShapeId = Array.from(selectedShapes)[0];
        const selectedShape = shapes.find(s => s.id === selectedShapeId);
        
        if (selectedShape && selectedShape.type === 'text' && (!editingText || editingText.id !== selectedShape.id)) {
          const textShape = selectedShape as TextShape;
          if (context) {
            const boundingBox = getShapeBoundingBox(textShape, context);
            const handle = getResizeHandle(mousePos, boundingBox);
            if (handle) {
              setIsResizingText(true);
              setTextResizeHandle(handle);
              setTextResizeStartMouse(mousePos);
              setOriginalFontSize(textShape.fontSize);
              e.preventDefault();
              return;
            }
          }
        }
      }

      // First, finish any existing text editing
      if (editingText && selectedTool !== 'text') {
        const updatedText = finishEditing();
        if (updatedText) {
          const newShapes = shapes.map(shape => 
            shape.id === editingText.id ? updatedText : shape
          );
          setShapes(newShapes);
          addToHistory(newShapes);
          onToolSelect('select');
        }
      }

      if (selectedTool === 'text') {
        // Text placement mode
        const canvasPoint = screenToCanvas(mousePos);
        const newText = TextDrawer.createText(canvasPoint.x, canvasPoint.y);
        const newShapes = [...shapes, newText];
        setShapes(newShapes);
        addToHistory(newShapes);
        startEditing(newText, 0);
        selectShape(newText.id);
        
        if (canvasRef.current) {
          canvasRef.current.focus();
        }
        onToolSelect('select');
      } else if (selectedTool === 'pencil') {
        const canvasPoint = screenToCanvas(mousePos);
        startDrawing('pencil', canvasPoint);
      } else if (selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'line' || selectedTool === 'arrow') {
        startDrawing(selectedTool, mousePos);
      } else {
        // Selection mode
        if (selectedTool === 'select') {
          const clickedShape = findShapeAtPoint(mousePos, shapes, screenToCanvas, context);
          
          if (clickedShape) {
            if (clickedShape.type === 'text' && !e.shiftKey) {
              const isDoubleClick = handleTextClick(clickedShape as TextShape);
              
              if (isDoubleClick) {
                const textShape = clickedShape as TextShape;
                const canvasPoint = screenToCanvas(mousePos);
                
                if (context) {
                  context.font = `${textShape.fontSize}px ${textShape.fontFamily}`;
                  const cursorPos = TextDrawer.getCursorPositionFromPoint(
                    context,
                    textShape,
                    canvasPoint.x,
                    canvasPoint.y
                  );
                  
                  startEditing(textShape, cursorPos);
                  selectShape(clickedShape.id);
                  
                  if (canvasRef.current) {
                    canvasRef.current.focus();
                  }
                }
              } else {
                selectShape(clickedShape.id);
                const updatedText = finishEditing();
                if (updatedText) {
                  const newShapes = shapes.map(shape => 
                    shape.id === editingText?.id ? updatedText : shape
                  );
                  setShapes(newShapes);
                  addToHistory(newShapes);
                }
              }
            } else if (e.shiftKey) {
              toggleShapeSelection(clickedShape.id);
            } else {
              selectShape(clickedShape.id);
            }
          } else {
            clearSelection();
            startSelection(mousePos);
          }
        } else {
          startSelection(mousePos);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const mousePos = getMousePos(e);
    
    if (isPanning) {
      updatePan(mousePos);
    } else if (isResizingText && textResizeHandle && selectedShapes.size === 1) {
      // Handle text resizing
      const selectedShapeId = Array.from(selectedShapes)[0];
      const selectedShape = shapes.find(s => s.id === selectedShapeId);
      
      if (selectedShape && selectedShape.type === 'text') {
        const textShape = selectedShape as TextShape;
        const deltaX = mousePos.x - textResizeStartMouse.x;
        const deltaY = mousePos.y - textResizeStartMouse.y;
        
        let scaleFactor = 1;
        const sensitivityFactor = 200;
        
        switch (textResizeHandle) {
          case 'se': {
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            scaleFactor = 1 + distance / sensitivityFactor;
            if (deltaX < 0 || deltaY < 0) scaleFactor = 1 / scaleFactor;
            break;
          }
          case 'nw': {
            const distanceNW = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            scaleFactor = 1 + distanceNW / sensitivityFactor;
            if (deltaX > 0 || deltaY > 0) scaleFactor = 1 / scaleFactor;
            break;
          }
          case 'ne': {
            const distanceNE = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            scaleFactor = 1 + distanceNE / sensitivityFactor;
            if (deltaX < 0 || deltaY > 0) scaleFactor = 1 / scaleFactor;
            break;
          }
          case 'sw': {
            const distanceSW = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            scaleFactor = 1 + distanceSW / sensitivityFactor;
            if (deltaX > 0 || deltaY < 0) scaleFactor = 1 / scaleFactor;
            break;
          }
        }
        
        scaleFactor = Math.max(0.2, Math.min(5, scaleFactor));
        const newFontSize = Math.max(8, Math.min(200, originalFontSize * scaleFactor));
        
        const updatedText = {
          ...textShape,
          fontSize: Math.round(newFontSize)
        };
        
        setShapes(prev => prev.map(shape => 
          shape.id === selectedShapeId ? updatedText : shape
        ));
      }
    } else if (isDrawing && selectedTool) {
      if (selectedTool === 'pencil') {
        const canvasPoint = screenToCanvas(mousePos);
        updateDrawing('pencil', canvasPoint);
      } else {
        updateDrawing(selectedTool, mousePos);
      }
    } else if (isSelecting) {
      updateSelection(mousePos);
    }
  };

  const handleMouseUp = () => {
    // Handle text resize completion
    if (isResizingText && selectedShapes.size === 1) {
      addToHistory(shapes);
      setIsResizingText(false);
      setTextResizeHandle(null);
      setTextResizeStartMouse({x: 0, y: 0});
      setOriginalFontSize(16);
      return;
    }

    // Handle selection rectangle completion
    if (isSelecting && selectedTool === 'select') {
      finishSelection(shapes, offset, scale, context);
    }

    if (isDrawing && selectedTool) {
      const newShape = finishDrawing(selectedTool, screenToCanvas);
      if (newShape) {
        const newShapes = [...shapes, newShape];
        setShapes(newShapes);
        addToHistory(newShapes);
        onToolSelect('select');
      }
    }
    
    stopPanning();
    cancelSelection();
    cancelDrawing();
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const mousePos = getMousePos(e);
    
    const shouldZoom = (isMac && e.metaKey) || e.ctrlKey;
    
    if (shouldZoom) {
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      zoomAt(mousePos, scaleFactor);
    } else if (isMac && Math.abs(e.deltaX) > 0) {
      setOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    } else {
      setOffset(prev => ({
        x: prev.x - (e.deltaX || 0),
        y: prev.y - e.deltaY
      }));
    }
  };

  // Dynamic cursor based on state and selected tool
  const getCursorStyle = (): string => {
    if (isPanning) return 'grabbing';
    if (isResizingText) {
      switch (textResizeHandle) {
        case 'nw':
        case 'se':
          return 'nw-resize';
        case 'ne':
        case 'sw':
          return 'ne-resize';
        default:
          return 'default';
      }
    }
    if (selectedTool === 'text') return 'text';
    if (isDrawing || ['rectangle', 'circle', 'line', 'arrow', 'pencil'].includes(selectedTool || '')) return 'crosshair';
    if (isSelecting) return 'crosshair';
    
    return 'default';
  };

  return (
    <div ref={containerRef} className="infinite-canvas-container">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className="infinite-canvas"
        style={{ cursor: getCursorStyle() }}
        tabIndex={0}
      />
      <div className="canvas-info">
        <span className="zoom-reset" onClick={resetZoom}>
          Zoom: {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
};

export default Canvas; 