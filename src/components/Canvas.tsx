import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState<Point>({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Detect if we're on Mac
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

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

  // Redraw the entire canvas with grid
  const redrawCanvas = useCallback(() => {
    if (!context || !dimensions.width || !dimensions.height) return;
    
    // Clear the canvas
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, dimensions.width, dimensions.height);
    
    // Draw grid pattern
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

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

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
      setIsPanning(true);
      setLastPanPoint(mousePos);
      e.preventDefault();
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
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const mousePos = getMousePos(e);
    
    // Check if zoom modifier key is pressed
    const shouldZoom = isMac ? e.metaKey : e.ctrlKey;
    
    if (shouldZoom) {
      // Zoom behavior with Ctrl+scroll (Windows) or Cmd+scroll (Mac)
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(5, scale * scaleFactor));
      
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

  // Dynamic cursor based on modifier keys
  const getCursorStyle = (): string => {
    if (isPanning) return 'grabbing';
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
      />
      <div className="canvas-info">
        <span className="zoom-reset" onClick={resetZoom}>
          Zoom: {Math.round(scale * 100)}%
        </span>
        {/* <span>• {isMac ? 'Cmd' : 'Ctrl'}+Drag: Pan • {isMac ? 'Cmd' : 'Ctrl'}+Scroll: Zoom • Scroll: Pan{isMac ? ' • 2-Finger: Pan' : ''}</span> */}
      </div>
    </div>
  );
};

export default Canvas; 