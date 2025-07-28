import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RectangleDrawer, type RectangleShape } from './BasicObjects/Rectangle';
import { CircleDrawer, type CircleShape } from './BasicObjects/Circle';
import { LineDrawer, type LineShape } from './BasicObjects/Line';
import { ArrowDrawer, type ArrowShape } from './BasicObjects/Arrow';
import { PencilDrawer, type PencilShape } from './BasicObjects/Pencil';
import { TextDrawer, type TextShape } from './BasicObjects/Text';

interface Point {
  x: number;
  y: number;
}

type Shape = RectangleShape | CircleShape | LineShape | ArrowShape | PencilShape | TextShape;

interface CanvasProps {
  selectedTool: string | null;
  onToolSelect: (tool: string) => void;
}

const Canvas: React.FC<CanvasProps> = ({ selectedTool, onToolSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState<Point>({ x: 0, y: 0 });
  const [selectionStart, setSelectionStart] = useState<Point>({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState<Point>({ x: 0, y: 0 });
  const [drawStart, setDrawStart] = useState<Point>({ x: 0, y: 0 });
  const [drawEnd, setDrawEnd] = useState<Point>({ x: 0, y: 0 });
  const [currentPencilPoints, setCurrentPencilPoints] = useState<Point[]>([]);
  const [editingText, setEditingText] = useState<TextShape | null>(null);
  const [textCursorPosition, setTextCursorPosition] = useState(0);
  const [showTextCursor, setShowTextCursor] = useState(false);
  const [textSelectionStart, setTextSelectionStart] = useState<number | null>(null);
  const [textSelectionEnd, setTextSelectionEnd] = useState<number | null>(null);
  const [isResizingText, setIsResizingText] = useState(false);
  const [textResizeHandle, setTextResizeHandle] = useState<string | null>(null);
  const [, setTextResizeStartSize] = useState<{width: number, height: number}>({width: 0, height: 0});
  const [textResizeStartMouse, setTextResizeStartMouse] = useState<Point>({x: 0, y: 0});
  const [originalFontSize, setOriginalFontSize] = useState<number>(16);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [lastClickedTextId, setLastClickedTextId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShapes, setSelectedShapes] = useState<Set<string>>(new Set());
  
  // Undo/Redo state
  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Detect if we're on Mac
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // Hit detection functions
  const hitTestRectangle = useCallback((shape: RectangleShape, point: Point): boolean => {
    return point.x >= shape.x && 
           point.x <= shape.x + shape.width && 
           point.y >= shape.y && 
           point.y <= shape.y + shape.height;
  }, []);

  const hitTestCircle = useCallback((shape: CircleShape, point: Point): boolean => {
    const distance = Math.sqrt(
      Math.pow(point.x - shape.x, 2) + Math.pow(point.y - shape.y, 2)
    );
    return distance <= shape.radius;
  }, []);

  const hitTestLine = useCallback((shape: LineShape, point: Point): boolean => {
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
  }, []);

  const hitTestArrow = useCallback((shape: ArrowShape, point: Point): boolean => {
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
  }, [hitTestLine]);

  const hitTestPencil = useCallback((shape: PencilShape, point: Point): boolean => {
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
  }, [hitTestLine]);

  const hitTestText = useCallback((shape: TextShape, point: Point): boolean => {
    if (!context) return false;
    
    context.font = `${shape.fontSize}px ${shape.fontFamily}`;
    const textWidth = TextDrawer.getTextWidth(context, shape);
    const textHeight = TextDrawer.getTextHeight(shape);
    
    return point.x >= shape.x && 
           point.x <= shape.x + textWidth && 
           point.y >= shape.y && 
           point.y <= shape.y + textHeight;
  }, [context]);

  // This will be defined after screenToCanvas

  // Function to add current state to history
  const addToHistory = useCallback((newShapes: Shape[]) => {
    setHistory(prev => {
      // Remove any redo history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push([...newShapes]);
      // Limit history size to prevent memory issues
      return newHistory.length > 50 ? newHistory.slice(1) : newHistory;
    });
    setHistoryIndex(prev => {
      const newIndex = prev + 1;
      return newIndex > 49 ? 49 : newIndex;
    });
  }, [historyIndex]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setShapes([...history[newIndex]]);
    }
  }, [history, historyIndex]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setShapes([...history[newIndex]]);
    }
  }, [history, historyIndex]);

  // Update shapes and add to history - removed unused function

  // Update canvas dimensions to match viewport
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && dimensions.width > 0 && dimensions.height > 0) {
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setContext(ctx);
      }
    }
  }, [dimensions]);

  // Text cursor blinking effect - faster and more visible
  useEffect(() => {
    if (editingText) {
      // Start with cursor visible
      setShowTextCursor(true);
      const interval = setInterval(() => {
        setShowTextCursor(prev => !prev);
      }, 600); // Slightly slower blink for better UX
      return () => clearInterval(interval);
    } else {
      setShowTextCursor(false);
    }
  }, [editingText]);

  // Force cursor visibility when cursor position changes (for immediate feedback)
  useEffect(() => {
    if (editingText) {
      setShowTextCursor(true);
    }
  }, [editingText, textCursorPosition]);

  // Keyboard event handling for text input, ESC key, and undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo shortcuts
      if ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) {
        if (e.shiftKey && e.key.toLowerCase() === 'z') {
          // Redo: Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows/Linux)
          e.preventDefault();
          redo();
          return;
        } else if (e.key.toLowerCase() === 'z') {
          // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
          e.preventDefault();
          undo();
          return;
        }
      }

      // ESC key - always reset to select mode and finish any editing
      if (e.key === 'Escape') {
        e.preventDefault();
        
        // Finish any text editing
        if (editingText) {
          const updatedText = TextDrawer.finishEditing(editingText);
          const newShapes = shapes.map(shape => 
            shape.id === editingText.id ? updatedText : shape
          );
          setShapes(newShapes);
          addToHistory(newShapes);
          setEditingText(null);
          setTextCursorPosition(0);
          setTextSelectionStart(null);
          setTextSelectionEnd(null);
          setShowTextCursor(false); // Ensure cursor is hidden
          // Keep text selected after finishing editing
          // onToolSelect('select'); // Already in select mode
        }
        
        // Clear any shape selections
        setSelectedShapes(new Set());
        
        return;
      }
      
      // Handle text editing keys only when editing text
      if (!editingText) return;
      
      // Handle text selection shortcuts
      if ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) {
        if (e.key.toLowerCase() === 'a') {
          // Select all text
          e.preventDefault();
          setTextSelectionStart(0);
          setTextSelectionEnd(editingText.text.length);
          setTextCursorPosition(editingText.text.length);
          return;
        }
      }
      
      e.preventDefault();
      
      // Helper function to delete selected text
      const deleteSelectedText = (): { newText: string; newCursorPos: number } => {
        if (textSelectionStart !== null && textSelectionEnd !== null) {
          const start = Math.min(textSelectionStart, textSelectionEnd);
          const end = Math.max(textSelectionStart, textSelectionEnd);
          const newText = editingText.text.slice(0, start) + editingText.text.slice(end);
          return { newText, newCursorPos: start };
        }
        return { newText: editingText.text, newCursorPos: textCursorPosition };
      };
      
      // Helper function to clear selection
      const clearSelection = () => {
        setTextSelectionStart(null);
        setTextSelectionEnd(null);
      };
      
      if (e.key === 'Enter') {
        // Add newline for paragraph support
        const { newText: textAfterDeletion, newCursorPos } = deleteSelectedText();
        const newText = textAfterDeletion.slice(0, newCursorPos) + 
                        '\n' + 
                        textAfterDeletion.slice(newCursorPos);
        const updatedText = TextDrawer.updateText(editingText, newText);
        setEditingText(updatedText);
        setShapes(prev => prev.map(shape => 
          shape.id === editingText.id ? updatedText : shape
        ));
        setTextCursorPosition(newCursorPos + 1);
        clearSelection();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        // Delete character or selected text
        if (textSelectionStart !== null && textSelectionEnd !== null) {
          // Delete selected text
          const { newText, newCursorPos } = deleteSelectedText();
          const updatedText = TextDrawer.updateText(editingText, newText);
          setEditingText(updatedText);
          setShapes(prev => prev.map(shape => 
            shape.id === editingText.id ? updatedText : shape
          ));
          setTextCursorPosition(newCursorPos);
          clearSelection();
        } else if (e.key === 'Backspace' && textCursorPosition > 0) {
          // Delete character before cursor
          const newText = editingText.text.slice(0, textCursorPosition - 1) + 
                          editingText.text.slice(textCursorPosition);
          const updatedText = TextDrawer.updateText(editingText, newText);
          setEditingText(updatedText);
          setShapes(prev => prev.map(shape => 
            shape.id === editingText.id ? updatedText : shape
          ));
          setTextCursorPosition(textCursorPosition - 1);
        } else if (e.key === 'Delete' && textCursorPosition < editingText.text.length) {
          // Delete character after cursor
          const newText = editingText.text.slice(0, textCursorPosition) + 
                          editingText.text.slice(textCursorPosition + 1);
          const updatedText = TextDrawer.updateText(editingText, newText);
          setEditingText(updatedText);
          setShapes(prev => prev.map(shape => 
            shape.id === editingText.id ? updatedText : shape
          ));
        }
      } else if (e.key === 'ArrowLeft') {
        // Move cursor left or extend selection
        if (e.shiftKey) {
          // Extend selection
          if (textSelectionStart === null) {
            setTextSelectionStart(textCursorPosition);
          }
          const newPos = Math.max(0, textCursorPosition - 1);
          setTextCursorPosition(newPos);
          setTextSelectionEnd(newPos);
        } else {
          // Move cursor
          if (textSelectionStart !== null && textSelectionEnd !== null) {
            // If there's a selection, move to start of selection
            const start = Math.min(textSelectionStart, textSelectionEnd);
            setTextCursorPosition(start);
            clearSelection();
          } else {
            setTextCursorPosition(Math.max(0, textCursorPosition - 1));
          }
        }
      } else if (e.key === 'ArrowRight') {
        // Move cursor right or extend selection
        if (e.shiftKey) {
          // Extend selection
          if (textSelectionStart === null) {
            setTextSelectionStart(textCursorPosition);
          }
          const newPos = Math.min(editingText.text.length, textCursorPosition + 1);
          setTextCursorPosition(newPos);
          setTextSelectionEnd(newPos);
        } else {
          // Move cursor
          if (textSelectionStart !== null && textSelectionEnd !== null) {
            // If there's a selection, move to end of selection
            const end = Math.max(textSelectionStart, textSelectionEnd);
            setTextCursorPosition(end);
            clearSelection();
          } else {
            setTextCursorPosition(Math.min(editingText.text.length, textCursorPosition + 1));
          }
        }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Move cursor up/down lines or extend selection
        const lines = editingText.text.split('\n');
        let currentLine = 0;
        let positionInLine = 0;
        let charCount = 0;
        
        // Find current line and position
        for (let i = 0; i < lines.length; i++) {
          if (charCount + lines[i].length >= textCursorPosition) {
            currentLine = i;
            positionInLine = textCursorPosition - charCount;
            break;
          }
          charCount += lines[i].length + 1; // +1 for newline
        }
        
        let newCursorPos = textCursorPosition;
        if (e.key === 'ArrowUp' && currentLine > 0) {
          // Move to previous line
          const prevLineStart = charCount - lines[currentLine].length - 1 - lines[currentLine - 1].length - 1;
          newCursorPos = prevLineStart + Math.min(positionInLine, lines[currentLine - 1].length);
        } else if (e.key === 'ArrowDown' && currentLine < lines.length - 1) {
          // Move to next line
          const nextLineStart = charCount + lines[currentLine].length + 1;
          newCursorPos = nextLineStart + Math.min(positionInLine, lines[currentLine + 1].length);
        }
        
        if (e.shiftKey) {
          // Extend selection
          if (textSelectionStart === null) {
            setTextSelectionStart(textCursorPosition);
          }
          setTextCursorPosition(newCursorPos);
          setTextSelectionEnd(newCursorPos);
        } else {
          setTextCursorPosition(newCursorPos);
          clearSelection();
        }
      } else if (e.key === 'Tab') {
        // Insert tab (4 spaces)
        const { newText: textAfterDeletion, newCursorPos } = deleteSelectedText();
        const newText = textAfterDeletion.slice(0, newCursorPos) + 
                        '    ' + 
                        textAfterDeletion.slice(newCursorPos);
        const updatedText = TextDrawer.updateText(editingText, newText);
        setEditingText(updatedText);
        setShapes(prev => prev.map(shape => 
          shape.id === editingText.id ? updatedText : shape
        ));
        setTextCursorPosition(newCursorPos + 4);
        clearSelection();
      } else if (e.key.length === 1) {
        // Add character (replace selected text if any)
        const { newText: textAfterDeletion, newCursorPos } = deleteSelectedText();
        const newText = textAfterDeletion.slice(0, newCursorPos) + 
                        e.key + 
                        textAfterDeletion.slice(newCursorPos);
        const updatedText = TextDrawer.updateText(editingText, newText);
        setEditingText(updatedText);
        setShapes(prev => prev.map(shape => 
          shape.id === editingText.id ? updatedText : shape
        ));
        setTextCursorPosition(newCursorPos + 1);
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingText, textCursorPosition, textSelectionStart, textSelectionEnd, isMac, undo, redo, shapes, addToHistory, onToolSelect]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((point: Point): Point => {
    return {
      x: (point.x - offset.x) / scale,
      y: (point.y - offset.y) / scale
    };
  }, [offset, scale]);

  // Find shape at point
  const findShapeAtPoint = useCallback((point: Point): Shape | null => {
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
          isHit = hitTestText(shape, canvasPoint);
          break;
      }
      
      if (isHit) {
        return shape;
      }
    }
    
    return null;
  }, [shapes, screenToCanvas, hitTestRectangle, hitTestCircle, hitTestLine, hitTestArrow, hitTestPencil, hitTestText]);

  // Check if a shape is inside the selection rectangle
  const isShapeInSelection = useCallback((shape: Shape, selectionRect: { x: number, y: number, width: number, height: number }): boolean => {
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
  }, [offset, scale, context]);

  // Draw grid pattern on the canvas
  const drawGrid = useCallback(() => {
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
  }, [context, dimensions, scale, offset]);

  // Draw all shapes
  const drawShapes = useCallback(() => {
    if (!context) return;
    
    // Apply transformation for zoom and pan
    context.save();
    context.setTransform(scale, 0, 0, scale, offset.x, offset.y);
    
    shapes.forEach(shape => {
      if (shape.type === 'rectangle') {
        RectangleDrawer.draw(context, shape);
      } else if (shape.type === 'circle') {
        CircleDrawer.draw(context, shape);
      } else if (shape.type === 'line') {
        LineDrawer.draw(context, shape);
      } else if (shape.type === 'arrow') {
        ArrowDrawer.draw(context, shape);
      } else if (shape.type === 'pencil') {
        PencilDrawer.draw(context, shape);
      } else if (shape.type === 'text') {
        const isCurrentlyEditing = editingText?.id === shape.id;
        TextDrawer.draw(
          context, 
          shape, 
          showTextCursor && !!isCurrentlyEditing, 
          textCursorPosition,
          textSelectionStart,
          textSelectionEnd
        );
      }
    });
    
    context.restore();
  }, [context, shapes, scale, offset, editingText, showTextCursor, textCursorPosition, textSelectionStart, textSelectionEnd]);

  // Draw preview of shape being drawn
  const drawPreview = useCallback(() => {
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
      
      if (selectedTool === 'rectangle') {
        const previewShape = RectangleDrawer.createRectangle(
          canvasStart.x,
          canvasStart.y,
          canvasEnd.x,
          canvasEnd.y,
          '#666666'
        );
        RectangleDrawer.draw(context, previewShape);
      } else if (selectedTool === 'circle') {
        const previewShape = CircleDrawer.createCircle(
          canvasStart.x,
          canvasStart.y,
          canvasEnd.x,
          canvasEnd.y,
          '#666666'
        );
        CircleDrawer.draw(context, previewShape);
      } else if (selectedTool === 'line') {
        const previewShape = LineDrawer.createLine(
          canvasStart.x,
          canvasStart.y,
          canvasEnd.x,
          canvasEnd.y,
          '#666666'
        );
        LineDrawer.draw(context, previewShape);
      } else if (selectedTool === 'arrow') {
        const previewShape = ArrowDrawer.createArrow(
          canvasStart.x,
          canvasStart.y,
          canvasEnd.x,
          canvasEnd.y,
          '#666666'
        );
        ArrowDrawer.draw(context, previewShape);
      }
    }
    
    context.restore();
  }, [context, isDrawing, selectedTool, drawStart, drawEnd, currentPencilPoints, scale, offset, screenToCanvas]);

  // Draw selection rectangle on the canvas
  const drawSelection = useCallback(() => {
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
  }, [context, isSelecting, selectionStart, selectionEnd]);

  // Helper function to check if mouse is over a resize handle
  const getResizeHandle = useCallback((mousePos: Point, boundingBox: {x: number, y: number, width: number, height: number}): string | null => {
    const handleSize = 10; // Handle size in screen coordinates
    
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

  // Draw selection indicators for selected shapes
  const drawSelectionIndicators = useCallback(() => {
    if (!context || selectedShapes.size === 0) return;
    
    context.save();
    context.setTransform(scale, 0, 0, scale, offset.x, offset.y);
    
    selectedShapes.forEach(shapeId => {
      const shape = shapes.find(s => s.id === shapeId);
      if (!shape) return;
      
      context.strokeStyle = '#9CEEC1'; // Tea green sharp
      context.lineWidth = 2;
      
      let boundingBox = { x: 0, y: 0, width: 0, height: 0 };
      
      switch (shape.type) {
        case 'rectangle':
          boundingBox = {
            x: shape.x - 5,
            y: shape.y - 5,
            width: shape.width + 10,
            height: shape.height + 10
          };
          break;
          
        case 'circle':
          // Rectangular bounding box around circle
          boundingBox = {
            x: shape.x - shape.radius - 5,
            y: shape.y - shape.radius - 5,
            width: (shape.radius * 2) + 10,
            height: (shape.radius * 2) + 10
          };
          break;
          
        case 'line':
        case 'arrow': {
          const lineShape = shape as LineShape | ArrowShape;
          const minX = Math.min(lineShape.x1, lineShape.x2);
          const minY = Math.min(lineShape.y1, lineShape.y2);
          const maxX = Math.max(lineShape.x1, lineShape.x2);
          const maxY = Math.max(lineShape.y1, lineShape.y2);
          boundingBox = {
            x: minX - 5,
            y: minY - 5,
            width: (maxX - minX) + 10,
            height: (maxY - minY) + 10
          };
          break;
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
            boundingBox = {
              x: minPencilX - 5,
              y: minPencilY - 5,
              width: (maxPencilX - minPencilX) + 10,
              height: (maxPencilY - minPencilY) + 10
            };
          }
          break;
        }
          
        case 'text': {
          const textShape = shape as TextShape;
          context.font = `${textShape.fontSize}px ${textShape.fontFamily}`;
          const textWidth = TextDrawer.getTextWidth(context, textShape);
          const textHeight = TextDrawer.getTextHeight(textShape);
          boundingBox = {
            x: textShape.x - 5,
            y: textShape.y - 5,
            width: textWidth + 10,
            height: textHeight + 10
          };
          break;
        }
      }
      
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
  }, [context, selectedShapes, shapes, scale, offset, editingText]);

  // Redraw the entire canvas with grid and selection
  const redrawCanvas = useCallback(() => {
    if (!context || !dimensions.width || !dimensions.height) return;
    
    // Clear the canvas
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, dimensions.width, dimensions.height);
    
    // Draw components
    drawGrid();
    drawShapes();
    drawPreview();
    drawSelection();
    drawSelectionIndicators();
  }, [context, dimensions, drawGrid, drawShapes, drawPreview, drawSelection, drawSelectionIndicators]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Clear selections when tool changes (except when switching to select)
  useEffect(() => {
    if (selectedTool && selectedTool !== 'select') {
      setSelectedShapes(new Set());
    }
  }, [selectedTool]);

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
      // On Mac: Cmd+left mouse or middle mouse
      return (e.button === 0 && e.metaKey) || e.button === 1;
    } else {
      // On Windows/Linux: Ctrl+left mouse or middle mouse
      return (e.button === 0 && e.ctrlKey) || e.button === 1;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const mousePos = getMousePos(e);
    
    if (shouldPan(e)) {
      // Panning mode
      setIsPanning(true);
      setLastPanPoint(mousePos);
      e.preventDefault();
    } else if (e.button === 0) {
      // Check for text resize handles first
      if (selectedTool === 'select' && selectedShapes.size === 1) {
        const selectedShapeId = Array.from(selectedShapes)[0];
        const selectedShape = shapes.find(s => s.id === selectedShapeId);
        
        if (selectedShape && selectedShape.type === 'text' && (!editingText || editingText.id !== selectedShape.id)) {
          const textShape = selectedShape as TextShape;
          if (context) {
            context.font = `${textShape.fontSize}px ${textShape.fontFamily}`;
            const textWidth = TextDrawer.getTextWidth(context, textShape);
            const textHeight = TextDrawer.getTextHeight(textShape);
            const boundingBox = {
              x: textShape.x - 5,
              y: textShape.y - 5,
              width: textWidth + 10,
              height: textHeight + 10
            };
            
                         const handle = getResizeHandle(mousePos, boundingBox);
             if (handle) {
               setIsResizingText(true);
               setTextResizeHandle(handle);
               setTextResizeStartSize({ width: textWidth, height: textHeight });
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
        const updatedText = TextDrawer.finishEditing(editingText);
        const newShapes = shapes.map(shape => 
          shape.id === editingText.id ? updatedText : shape
        );
                  setShapes(newShapes);
          addToHistory(newShapes);
          setEditingText(null);
          setTextSelectionStart(null);
          setTextSelectionEnd(null);
          setShowTextCursor(false); // Ensure cursor is hidden
          // Auto-switch back to select mode when finishing text by clicking elsewhere
          onToolSelect('select');
      }

      if (selectedTool === 'text') {
        // Text placement mode
        const canvasPoint = screenToCanvas(mousePos);
        const newText = TextDrawer.createText(canvasPoint.x, canvasPoint.y);
        const newShapes = [...shapes, newText];
        setShapes(newShapes);
        addToHistory(newShapes);
        setEditingText(newText);
        setTextCursorPosition(0);
        setTextSelectionStart(null);
        setTextSelectionEnd(null);
        // Immediately show selection box for the new text
        setSelectedShapes(new Set([newText.id]));
        
        // Immediately show cursor when creating new text
        setShowTextCursor(true);
        
        // Focus the canvas to receive keyboard input
        if (canvasRef.current) {
          canvasRef.current.focus();
        }
        // Auto-switch back to select mode after placing text (one-shot behavior)
        onToolSelect('select');
      } else if (selectedTool === 'pencil') {
        // Pencil drawing mode
        setIsDrawing(true);
        const canvasPoint = screenToCanvas(mousePos);
        setCurrentPencilPoints([canvasPoint]);
      } else if (selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'line' || selectedTool === 'arrow') {
        // Other drawing modes
        setIsDrawing(true);
        setDrawStart(mousePos);
        setDrawEnd(mousePos);
      } else {
        // Selection mode (default left click)
        if (selectedTool === 'select') {
          // Try to select a shape first
          const clickedShape = findShapeAtPoint(mousePos);
          
          if (clickedShape) {
            // Shape was clicked - handle selection
            if (clickedShape.type === 'text' && !e.shiftKey) {
              // Handle single vs double click on text
              const currentTime = Date.now();
              const timeSinceLastClick = currentTime - lastClickTime;
              const isDoubleClick = timeSinceLastClick < 400 && lastClickedTextId === clickedShape.id;
              
              setLastClickTime(currentTime);
              setLastClickedTextId(clickedShape.id);
              
              if (isDoubleClick) {
                // Double click - enter edit mode with cursor at click position
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
                  
                                     setEditingText(textShape);
                   setTextCursorPosition(cursorPos);
                   setTextSelectionStart(null);
                   setTextSelectionEnd(null);
                   setSelectedShapes(new Set([clickedShape.id]));
                   
                   // Immediately show cursor when entering edit mode
                   setShowTextCursor(true);
                   
                   // Focus the canvas to receive keyboard input
                   if (canvasRef.current) {
                     canvasRef.current.focus();
                   }
                }
              } else {
                // Single click - just select the text (no editing)
                setSelectedShapes(new Set([clickedShape.id]));
                // Make sure we're not in editing mode
                if (editingText) {
                  const updatedText = TextDrawer.finishEditing(editingText);
                  const newShapes = shapes.map(shape => 
                    shape.id === editingText.id ? updatedText : shape
                  );
                  setShapes(newShapes);
                  addToHistory(newShapes);
                  setEditingText(null);
                  setTextSelectionStart(null);
                  setTextSelectionEnd(null);
                  setShowTextCursor(false);
                }
              }
            } else if (e.shiftKey) {
              // Shift+click: toggle selection (add/remove from current selection)
              setSelectedShapes(prev => {
                const newSelection = new Set(prev);
                if (newSelection.has(clickedShape.id)) {
                  newSelection.delete(clickedShape.id);
                } else {
                  newSelection.add(clickedShape.id);
                }
                return newSelection;
              });
            } else {
              // Regular click: clear all selections and select only this shape
              setSelectedShapes(new Set([clickedShape.id]));
            }
          } else {
            // No shape clicked - clear all selections and start selection rectangle
            setSelectedShapes(new Set());
            setIsSelecting(true);
            setSelectionStart(mousePos);
            setSelectionEnd(mousePos);
          }
        } else {
          // Other selection modes
          setIsSelecting(true);
          setSelectionStart(mousePos);
          setSelectionEnd(mousePos);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const mousePos = getMousePos(e);
    
    if (isPanning) {
      const deltaX = mousePos.x - lastPanPoint.x;
      const deltaY = mousePos.y - lastPanPoint.y;
      setOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setLastPanPoint(mousePos);
         } else if (isResizingText && textResizeHandle && selectedShapes.size === 1) {
       // Handle text resizing
       const selectedShapeId = Array.from(selectedShapes)[0];
       const selectedShape = shapes.find(s => s.id === selectedShapeId);
       
       if (selectedShape && selectedShape.type === 'text') {
         const textShape = selectedShape as TextShape;
         const deltaX = mousePos.x - textResizeStartMouse.x;
         const deltaY = mousePos.y - textResizeStartMouse.y;
         
         let scaleFactor = 1;
         const sensitivityFactor = 200; // Lower = more sensitive
         
         // Calculate scale factor based on handle being dragged
         switch (textResizeHandle) {
           case 'se': { // Southeast - most intuitive
             const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
             scaleFactor = 1 + distance / sensitivityFactor;
             if (deltaX < 0 || deltaY < 0) scaleFactor = 1 / scaleFactor;
             break;
           }
           case 'nw': { // Northwest
             const distanceNW = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
             scaleFactor = 1 + distanceNW / sensitivityFactor;
             if (deltaX > 0 || deltaY > 0) scaleFactor = 1 / scaleFactor;
             break;
           }
           case 'ne': { // Northeast
             const distanceNE = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
             scaleFactor = 1 + distanceNE / sensitivityFactor;
             if (deltaX < 0 || deltaY > 0) scaleFactor = 1 / scaleFactor;
             break;
           }
           case 'sw': { // Southwest
             const distanceSW = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
             scaleFactor = 1 + distanceSW / sensitivityFactor;
             if (deltaX > 0 || deltaY < 0) scaleFactor = 1 / scaleFactor;
             break;
           }
         }
         
         scaleFactor = Math.max(0.2, Math.min(5, scaleFactor));
         
         // Calculate new font size from original
         const newFontSize = Math.max(8, Math.min(200, originalFontSize * scaleFactor));
         
         const updatedText = {
           ...textShape,
           fontSize: Math.round(newFontSize)
         };
         
         setShapes(prev => prev.map(shape => 
           shape.id === selectedShapeId ? updatedText : shape
         ));
       }
    } else if (isDrawing && selectedTool === 'pencil') {
      // Add point to current pencil stroke
      const canvasPoint = screenToCanvas(mousePos);
      setCurrentPencilPoints(prev => [...prev, canvasPoint]);
    } else if (isDrawing) {
      setDrawEnd(mousePos);
    } else if (isSelecting) {
      setSelectionEnd(mousePos);
    }
  };

  const handleMouseUp = () => {
    // Handle text resize completion
    if (isResizingText && selectedShapes.size === 1) {
      const selectedShapeId = Array.from(selectedShapes)[0];
      const selectedShape = shapes.find(s => s.id === selectedShapeId);
      
      if (selectedShape) {
        // Add the resized text to history
        addToHistory(shapes);
      }
      
             setIsResizingText(false);
       setTextResizeHandle(null);
       setTextResizeStartSize({width: 0, height: 0});
       setTextResizeStartMouse({x: 0, y: 0});
       setOriginalFontSize(16);
      return;
    }
    // Handle selection rectangle completion
    if (isSelecting && selectedTool === 'select') {
      const rectX = Math.min(selectionStart.x, selectionEnd.x);
      const rectY = Math.min(selectionStart.y, selectionEnd.y);
      const rectWidth = Math.abs(selectionEnd.x - selectionStart.x);
      const rectHeight = Math.abs(selectionEnd.y - selectionStart.y);

      // Only process as selection rectangle if there was actual dragging
      if (rectWidth > 5 || rectHeight > 5) {
        const selectionRect = {
          x: rectX,
          y: rectY,
          width: rectWidth,
          height: rectHeight
        };

        // Find all shapes inside the selection rectangle
        const shapesInSelection = shapes.filter(shape => 
          isShapeInSelection(shape, selectionRect)
        );

        if (shapesInSelection.length > 0) {
          setSelectedShapes(new Set(shapesInSelection.map(shape => shape.id)));
        } else {
          // Clear selection if no shapes found
          setSelectedShapes(new Set());
        }
      }
    }

    if (isDrawing) {
      if (selectedTool === 'pencil' && currentPencilPoints.length > 1) {
        // Create and add pencil stroke
        const newShape = PencilDrawer.createPencil(currentPencilPoints, '#4e4e4e');
        const newShapes = [...shapes, newShape];
        setShapes(newShapes);
        addToHistory(newShapes);
        setCurrentPencilPoints([]);
        // Auto-switch back to select mode after drawing pencil stroke
        onToolSelect('select');
      } else if (selectedTool !== 'pencil' && selectedTool !== 'text') {
        // Create and add other shapes
        const canvasStart = screenToCanvas(drawStart);
        const canvasEnd = screenToCanvas(drawEnd);
        
        // Only create shape if it has some size (for rectangles and circles)
        // For lines and arrows, we allow any size including small ones
        const hasSize = selectedTool === 'line' || selectedTool === 'arrow' || 
          (Math.abs(canvasEnd.x - canvasStart.x) > 5 && Math.abs(canvasEnd.y - canvasStart.y) > 5);
        
        if (hasSize) {
          let newShape: Shape;
          
          if (selectedTool === 'rectangle') {
            newShape = RectangleDrawer.createRectangle(
              canvasStart.x,
              canvasStart.y,
              canvasEnd.x,
              canvasEnd.y,
              '#4e4e4e' // Theme's davys-gray
            );
          } else if (selectedTool === 'circle') {
            newShape = CircleDrawer.createCircle(
              canvasStart.x,
              canvasStart.y,
              canvasEnd.x,
              canvasEnd.y,
              '#4e4e4e' // Theme's davys-gray
            );
          } else if (selectedTool === 'line') {
            newShape = LineDrawer.createLine(
              canvasStart.x,
              canvasStart.y,
              canvasEnd.x,
              canvasEnd.y,
              '#4e4e4e' // Theme's davys-gray
            );
          } else if (selectedTool === 'arrow') {
            newShape = ArrowDrawer.createArrow(
              canvasStart.x,
              canvasStart.y,
              canvasEnd.x,
              canvasEnd.y,
              '#4e4e4e' // Theme's davys-gray
            );
          }
          
          if (newShape!) {
            const newShapes = [...shapes, newShape];
            setShapes(newShapes);
            addToHistory(newShapes);
            // Auto-switch back to select mode after drawing shape
            onToolSelect('select');
          }
        }
      }
    }
    
    setIsPanning(false);
    setIsSelecting(false);
    setIsDrawing(false);
    setCurrentPencilPoints([]);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const mousePos = getMousePos(e);
    
    // Check if zoom should happen:
    // 1. Cmd+scroll on Mac
    // 2. Ctrl+scroll on Windows/Linux  
    // 3. Pinch gesture on trackpad (ctrlKey is automatically set by browser)
    const shouldZoom = (isMac && e.metaKey) || e.ctrlKey;
    
    if (shouldZoom) {
      // Zoom behavior with modifier+scroll or pinch gesture
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(30, scale * scaleFactor));
      
      // Zoom towards mouse position
      const scaleChange = newScale / scale;
      setOffset(prev => ({
        x: mousePos.x - (mousePos.x - prev.x) * scaleChange,
        y: mousePos.y - (mousePos.y - prev.y) * scaleChange
      }));
      setScale(newScale);
    } else if (isMac && Math.abs(e.deltaX) > 0) {
      // Trackpad 2-finger scroll for panning on Mac (horizontal + vertical)
      setOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    } else {
      // Regular scroll - pan vertically (and horizontally if available)
      setOffset(prev => ({
        x: prev.x - (e.deltaX || 0),
        y: prev.y - e.deltaY
      }));
    }
  };

  // Dynamic cursor based on modifier keys and selected tool
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
    
    // Check if hovering over resize handle
    if (selectedTool === 'select' && selectedShapes.size === 1 && !editingText) {
      const selectedShapeId = Array.from(selectedShapes)[0];
      const selectedShape = shapes.find(s => s.id === selectedShapeId);
      
      if (selectedShape && selectedShape.type === 'text' && context) {
        // TODO: Could implement cursor change based on resize handle hover here
        // This would need mouse position, so we'll handle it in a useEffect or similar
        // For now, return default
      }
    }
    
    return 'default';
  };

  // Reset zoom to 100%
  const resetZoom = () => {
    setScale(1);
    // Optionally center the view
    setOffset({ x: 0, y: 0 });
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
        tabIndex={0} // Make canvas focusable for keyboard events
      />
      <div className="canvas-info">
        <span className="zoom-reset" onClick={resetZoom}>
          Zoom: {Math.round(scale * 100)}%
        </span>
        {/* {editingText && (
          <span>• Press Enter or Esc to finish text editing</span>
        )} */}
        
        {/* <span>• {isMac ? 'Cmd' : 'Ctrl'}+Z: Undo • {isMac ? 'Cmd' : 'Ctrl'}+Shift+Z: Redo • Click shapes to select • Drag to select multiple • Shift+click: multi-select • Click empty area to deselect</span> */}
        {/* <span>• {isMac ? 'Cmd' : 'Ctrl'}+Drag: Pan • {isMac ? 'Cmd' : 'Ctrl'}+Scroll: Zoom • Scroll: Pan • Pinch: Zoom{isMac ? ' • 2-Finger: Pan' : ''}</span> */}
      </div>
    </div>
  );
};

export default Canvas; 