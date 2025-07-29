import { useState, useEffect, useCallback, useRef } from 'react';
import type { Point } from '../utils/hitTesting';

export const useCanvasState = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point>({ x: 0, y: 0 });

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

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((point: Point): Point => {
    return {
      x: (point.x - offset.x) / scale,
      y: (point.y - offset.y) / scale
    };
  }, [offset, scale]);

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback((point: Point): Point => {
    return {
      x: point.x * scale + offset.x,
      y: point.y * scale + offset.y
    };
  }, [offset, scale]);

  // Reset zoom to 100%
  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Pan functions
  const startPanning = useCallback((point: Point) => {
    setIsPanning(true);
    setLastPanPoint(point);
  }, []);

  const updatePan = useCallback((point: Point) => {
    if (!isPanning) return;
    
    const deltaX = point.x - lastPanPoint.x;
    const deltaY = point.y - lastPanPoint.y;
    setOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    setLastPanPoint(point);
  }, [isPanning, lastPanPoint]);

  const stopPanning = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom functions
  const zoomAt = useCallback((point: Point, scaleFactor: number) => {
    const newScale = Math.max(0.1, Math.min(30, scale * scaleFactor));
    const scaleChange = newScale / scale;
    
    setOffset(prev => ({
      x: point.x - (point.x - prev.x) * scaleChange,
      y: point.y - (point.y - prev.y) * scaleChange
    }));
    setScale(newScale);
  }, [scale]);

  return {
    canvasRef,
    containerRef,
    context,
    scale,
    offset,
    dimensions,
    isPanning,
    screenToCanvas,
    canvasToScreen,
    resetZoom,
    startPanning,
    updatePan,
    stopPanning,
    zoomAt,
    setOffset
  };
}; 