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
    
    // Check if zoom should happen:
    // 1. Cmd+scroll on Mac
    // 2. Ctrl+scroll on Windows/Linux  
    // 3. Pinch gesture on trackpad (ctrlKey is automatically set by browser)
    const shouldZoom = (isMac && e.metaKey) || e.ctrlKey;
    
    if (shouldZoom) {
      // Zoom behavior with modifier+scroll or pinch gesture
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

  // Export functions
  const exportAsPNG = () => {
    if (!canvasRef.current) return
    const dataURL = canvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1
    })
    const link = document.createElement('a')
    link.download = 'fbd-design.png'
    link.href = dataURL
    link.click()
  }

  const exportAsSVG = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current

    // Remove grid lines before export
    const gridLines = canvas.getObjects().filter(obj => 
      obj instanceof Line && obj.stroke === '#ddd'
    )
    gridLines.forEach(line => canvas.remove(line))

    // Export SVG
    const svgData = canvas.toSVG()

    // Restore grid lines
    gridLines.forEach(line => canvas.add(line))
    canvas.requestRenderAll()

    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'fbd-design.svg'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  // Save canvas state as JSON
  const saveCanvasState = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current

    try {
      // Get all non-grid objects
      const objects = canvas.getObjects()
        .filter(obj => !(obj instanceof Line && obj.stroke === '#ddd'))
        .map(obj => {
          // Base object data
          const baseData = {
            type: obj.type,
            left: obj.left,
            top: obj.top,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            angle: obj.angle,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            fill: obj.fill
          }

          // Handle groups (Force arrows, etc.)
          if (obj instanceof Group) {
            const groupObjects = obj.getObjects().map(groupObj => {
              const groupObjData = {
                type: groupObj.type,
                left: groupObj.left,
                top: groupObj.top,
                scaleX: groupObj.scaleX,
                scaleY: groupObj.scaleY,
                angle: groupObj.angle,
                stroke: groupObj.stroke,
                strokeWidth: groupObj.strokeWidth,
                fill: groupObj.fill
              }

              if (groupObj instanceof Path) {
                return {
                  ...groupObjData,
                  path: groupObj.path
                }
              }
              if (groupObj instanceof IText) {
                return {
                  ...groupObjData,
                  text: groupObj.text,
                  fontSize: groupObj.fontSize,
                  fontFamily: groupObj.fontFamily,
                  originX: groupObj.originX,
                  originY: groupObj.originY
                }
              }
              return groupObjData
            })

            return {
              ...baseData,
              objects: groupObjects,
              isForceArrow: obj.getObjects().some(o => o instanceof IText && ['F', 'D', 'V', 'A'].includes(o.text || ''))
            }
          }

          // Handle text objects
          if (obj instanceof IText) {
            return {
              ...baseData,
              text: obj.text,
              fontSize: obj.fontSize,
              fontFamily: obj.fontFamily,
              originX: obj.originX,
              originY: obj.originY
            }
          }

          // Handle paths
          if (obj instanceof Path) {
            return {
              ...baseData,
              path: obj.path
            }
          }

          return baseData
        })

      const json = {
        version: '5.3.0',
        objects: objects
      }

      console.log('Saving canvas state:', json)

      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = 'fbd-design.json'
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error saving canvas state:', error)
      alert('Error saving the design. Please try again.')
    }
  }

  // Import canvas state
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !canvasRef.current) return

    const reader = new FileReader()
    
    if (file.name.endsWith('.json')) {
      reader.onload = async (e) => {
        try {
          const canvas = canvasRef.current
          if (!canvas) return

          console.log('Reading JSON file...')
          const jsonData = JSON.parse(e.target?.result as string)
          console.log('Parsed JSON data:', jsonData)

          if (!jsonData.objects || !Array.isArray(jsonData.objects)) {
            throw new Error('Invalid JSON format: missing objects array')
          }

          // Remove all non-grid objects but keep grid
          canvas.getObjects().forEach(obj => {
            if (!(obj instanceof Line && obj.stroke === '#ddd')) {
              canvas.remove(obj)
            }
          })

          // Process each object
          for (const objData of jsonData.objects) {
            try {
              let obj: FabricObject | null = null

              // Handle special objects first
              if (objData.type === 'path' && objData.path) {
                // Handle support symbols
                const isSupport = Object.values(SUPPORT_SYMBOLS).some(path => 
                  objData.path.toString() === path.toString()
                )
                
                if (isSupport) {
                  const pathOptions = {
                    stroke: objData.stroke || '#000000',
                    fill: objData.type === 'pinned' ? '#000000' : 'transparent',
                    left: objData.left || 0,
                    top: objData.top || 0,
                    scaleX: objData.scaleX || 1,
                    scaleY: objData.scaleY || 1,
                    angle: objData.angle || 0,
                    strokeWidth: objData.strokeWidth || 1,
                    selectable: true,
                    hasControls: true,
                    hasBorders: true
                  }
                  obj = new Path(objData.path, pathOptions)
                } else {
                  const pathOptions = {
                    ...objData,
                    left: objData.left || 0,
                    top: objData.top || 0,
                    scaleX: objData.scaleX || 1,
                    scaleY: objData.scaleY || 1,
                    angle: objData.angle || 0,
                    strokeWidth: objData.strokeWidth || 1,
                    selectable: true,
                    hasControls: true,
                    hasBorders: true
                  }
                  obj = new Path(objData.path, pathOptions)
                }
              } else if (objData.isForceArrow && objData.objects) {
                // Recreate Force arrow group
                const groupObjects: FabricObject[] = []
                
                for (const groupObjData of objData.objects) {
                  let groupObj: FabricObject | null = null
                  
                  if (groupObjData.type === 'path') {
                    const pathOptions = {
                      stroke: groupObjData.stroke,
                      fill: groupObjData.fill,
                      strokeWidth: groupObjData.strokeWidth,
                      left: groupObjData.left || 0,
                      top: groupObjData.top || 0,
                      scaleX: groupObjData.scaleX || 1,
                      scaleY: groupObjData.scaleY || 1,
                      angle: groupObjData.angle || 0,
                      selectable: true,
                      hasControls: true,
                      hasBorders: true
                    }
                    groupObj = new Path(groupObjData.path, pathOptions)
                  } else if (groupObjData.type === 'i-text') {
                    const textOptions = {
                      fontSize: groupObjData.fontSize,
                      fontFamily: groupObjData.fontFamily,
                      fill: groupObjData.fill,
                      left: groupObjData.left || 0,
                      top: groupObjData.top || 0,
                      originX: groupObjData.originX || 'center',
                      originY: groupObjData.originY || 'center',
                      selectable: true,
                      hasControls: true,
                      hasBorders: true
                    }
                    groupObj = new IText(groupObjData.text || '', textOptions)
                  }
                  
                  if (groupObj) {
                    groupObjects.push(groupObj)
                  }
                }
                
                if (groupObjects.length > 0) {
                  const groupOptions = {
                    left: objData.left,
                    top: objData.top,
                    scaleX: objData.scaleX,
                    scaleY: objData.scaleY,
                    angle: objData.angle,
                    selectable: true,
                    hasControls: true,
                    hasBorders: true
                  }
                  obj = new Group(groupObjects, groupOptions)
                }
              } else {
                // Handle regular objects
                switch (objData.type.toLowerCase()) {
                  case 'rect': {
                    const rectOptions = {
                      left: objData.left || 0,
                      top: objData.top || 0,
                      width: objData.width || 40,
                      height: objData.height || 30,
                      fill: objData.fill || 'transparent',
                      stroke: objData.stroke || '#000000',
                      strokeWidth: objData.strokeWidth || 1,
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1,
                      angle: objData.angle || 0,
                      selectable: true,
                      hasControls: true,
                      hasBorders: true
                    }
                    obj = new Rect(rectOptions)
                    break
                  }
                  case 'circle': {
                    const circleOptions = {
                      left: objData.left || 0,
                      top: objData.top || 0,
                      radius: objData.radius || 20,
                      fill: objData.fill || 'transparent',
                      stroke: objData.stroke || '#000000',
                      strokeWidth: objData.strokeWidth || 1,
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1,
                      angle: objData.angle || 0,
                      selectable: true,
                      hasControls: true,
                      hasBorders: true
                    }
                    obj = new Circle(circleOptions)
                    break
                  }
                  case 'ellipse': {
                    const ellipseOptions = {
                      left: objData.left || 0,
                      top: objData.top || 0,
                      rx: objData.rx || 25,
                      ry: objData.ry || 15,
                      fill: objData.fill || 'transparent',
                      stroke: objData.stroke || '#000000',
                      strokeWidth: objData.strokeWidth || 1,
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1,
                      angle: objData.angle || 0,
                      selectable: true,
                      hasControls: true,
                      hasBorders: true
                    }
                    obj = new Ellipse(ellipseOptions)
                    break
                  }
                  case 'triangle': {
                    const triangleOptions = {
                      left: objData.left || 0,
                      top: objData.top || 0,
                      width: objData.width || 30,
                      height: objData.height || 30,
                      fill: objData.fill || 'transparent',
                      stroke: objData.stroke || '#000000',
                      strokeWidth: objData.strokeWidth || 1,
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1,
                      angle: objData.angle || 0,
                      selectable: true,
                      hasControls: true,
                      hasBorders: true
                    }
                    obj = new Triangle(triangleOptions)
                    break
                  }
                  case 'line': {
                    const lineOptions = {
                      left: objData.left || 0,
                      top: objData.top || 0,
                      stroke: objData.stroke || '#000000',
                      strokeWidth: objData.strokeWidth || 2,
                      strokeDashArray: objData.strokeDashArray,
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1,
                      angle: objData.angle || 0,
                      selectable: true,
                      hasControls: true,
                      hasBorders: true
                    }
                    obj = new Line([0, 0, objData.width || 100, 0], lineOptions)
                    break
                  }
                  case 'text':
                  case 'i-text': {
                    const textOptions = {
                      left: objData.left || 0,
                      top: objData.top || 0,
                      fontSize: objData.fontSize || 20,
                      fontFamily: objData.fontFamily,
                      fill: objData.fill || '#000000',
                      originX: objData.originX || 'center',
                      originY: objData.originY || 'center',
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1,
                      angle: objData.angle || 0,
                      selectable: true,
                      hasControls: true,
                      hasBorders: true
                    }
                    obj = new IText(objData.text || '', textOptions)
                    break
                  }
                  default:
                    console.warn('Unsupported object type:', objData.type)
                }
              }

              if (obj) {
                obj.set({
                  left: objData.left || 0,
                  top: objData.top || 0,
                  scaleX: objData.scaleX || 1,
                  scaleY: objData.scaleY || 1,
                  angle: objData.angle || 0,
                  stroke: objData.stroke || '#000000',
                  strokeWidth: objData.strokeWidth || 1,
                  fill: objData.fill || 'transparent',
                  selectable: true,
                  hasControls: true,
                  hasBorders: true
                })
                canvas.add(obj)
                console.log('Added object:', objData.type)
              }
            } catch (objError) {
              console.error('Error creating object:', objError, objData)
            }
          }

          canvas.requestRenderAll()
          console.log('Canvas render complete')
        } catch (error) {
          console.error('Error loading JSON file:', error)
          alert('Invalid JSON file format. Please ensure you are using a file exported from this application.')
        }
      }
      reader.readAsText(file)
    } else if (file.name.endsWith('.svg')) {
      reader.onload = (e) => {
        try {
          const canvas = canvasRef.current
          if (!canvas) return

          // Remove all non-grid objects but keep grid
          const gridLines = canvas.getObjects().filter(obj => 
            obj instanceof Line && obj.stroke === '#ddd'
          )
          canvas.clear()
          gridLines.forEach(line => canvas.add(line))

          const svgString = e.target?.result as string
          
          // Create a temporary canvas to load SVG
          // const tempCanvas = new StaticCanvas(null, {
          //   width: canvas.width,
          //   height: canvas.height
          // })

          // Parse SVG using loadFromJSON
          const parser = new DOMParser()
          const doc = parser.parseFromString(svgString, 'image/svg+xml')
          const svgElement = doc.querySelector('svg')

          if (!svgElement) {
            throw new Error('Invalid SVG file')
          }

          // Get SVG dimensions
          // const svgWidth = parseFloat(svgElement.getAttribute('width') || '800')
          // const svgHeight = parseFloat(svgElement.getAttribute('height') || '600')

          // Extract shapes from SVG
          const shapes = Array.from(svgElement.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon'))
          
          // Process each shape
          shapes.forEach(shape => {
            let fabricObject: FabricObject | null = null
            const type = shape.tagName.toLowerCase()
            const fill = shape.getAttribute('fill') || 'transparent'
            const stroke = shape.getAttribute('stroke') || '#000000'
            const strokeWidth = parseFloat(shape.getAttribute('stroke-width') || '1')

            switch (type) {
              case 'rect': {
                fabricObject = new Rect({
                  left: parseFloat(shape.getAttribute('x') || '0'),
                  top: parseFloat(shape.getAttribute('y') || '0'),
                  width: parseFloat(shape.getAttribute('width') || '0'),
                  height: parseFloat(shape.getAttribute('height') || '0'),
                  fill,
                  stroke,
                  strokeWidth
                })
                break
              }
              case 'circle': {
                fabricObject = new Circle({
                  left: parseFloat(shape.getAttribute('cx') || '0'),
                  top: parseFloat(shape.getAttribute('cy') || '0'),
                  radius: parseFloat(shape.getAttribute('r') || '0'),
                  fill,
                  stroke,
                  strokeWidth,
                  originX: 'center',
                  originY: 'center'
                })
                break
              }
              case 'ellipse': {
                fabricObject = new Ellipse({
                  left: parseFloat(shape.getAttribute('cx') || '0'),
                  top: parseFloat(shape.getAttribute('cy') || '0'),
                  rx: parseFloat(shape.getAttribute('rx') || '0'),
                  ry: parseFloat(shape.getAttribute('ry') || '0'),
                  fill,
                  stroke,
                  strokeWidth,
                  originX: 'center',
                  originY: 'center'
                })
                break
              }
              case 'line': {
                fabricObject = new Line([
                  parseFloat(shape.getAttribute('x1') || '0'),
                  parseFloat(shape.getAttribute('y1') || '0'),
                  parseFloat(shape.getAttribute('x2') || '0'),
                  parseFloat(shape.getAttribute('y2') || '0')
                ], {
                  fill,
                  stroke,
                  strokeWidth
                })
                break
              }
              case 'path': {
                const d = shape.getAttribute('d')
                if (d) {
                  fabricObject = new Path(d, {
                    fill,
                    stroke,
                    strokeWidth
                  })
                }
                break
              }
              case 'polygon':
              case 'polyline': {
                const points = shape.getAttribute('points')
                if (points) {
                  const coords = points.trim().split(/\s+/).map(point => {
                    const [x, y] = point.split(',').map(Number)
                    return { x, y }
                  })
                  
                  let pathData = `M ${coords[0].x},${coords[0].y}`
                  for (let i = 1; i < coords.length; i++) {
                    pathData += ` L ${coords[i].x},${coords[i].y}`
                  }
                  if (type === 'polygon') {
                    pathData += ' Z'
                  }
                  
                  fabricObject = new Path(pathData, {
                    fill: type === 'polygon' ? fill : 'transparent',
                    stroke,
                    strokeWidth
                  })
                }
                break
              }
            }

            if (fabricObject) {
              // Handle transform attribute
              const transform = shape.getAttribute('transform')
              if (transform) {
                const translateMatch = transform.match(/translate\(([-\d.]+)[,\s]+([-\d.]+)\)/)
                if (translateMatch) {
                  const tx = parseFloat(translateMatch[1])
                  const ty = parseFloat(translateMatch[2])
                  fabricObject.set({
                    left: fabricObject.left! + tx,
                    top: fabricObject.top! + ty
                  })
                }

                const rotateMatch = transform.match(/rotate\(([-\d.]+)(?:[,\s]+([-\d.]+)[,\s]+([-\d.]+))?\)/)
                if (rotateMatch) {
                  fabricObject.set({
                    angle: parseFloat(rotateMatch[1])
                  })
                }
              }

              // Make object interactive
              fabricObject.set({
                selectable: true,
                hasControls: true,
                hasBorders: true
              })

              canvas.add(fabricObject)
            }
          })

          // Scale and center all objects
          const objects = canvas.getObjects().filter(obj => !(obj instanceof Line && obj.stroke === '#ddd'))
          if (objects.length > 0) {
            // Calculate group bounds
            const bounds = objects.reduce((acc, obj) => {
              const objBounds = obj.getBoundingRect()
              return {
                left: Math.min(acc.left, objBounds.left),
                top: Math.min(acc.top, objBounds.top),
                right: Math.max(acc.right, objBounds.left + objBounds.width),
                bottom: Math.max(acc.bottom, objBounds.top + objBounds.height)
              }
            }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity })

            const groupWidth = bounds.right - bounds.left
            const groupHeight = bounds.bottom - bounds.top

            // Calculate scale to fit canvas
            const scaleX = (canvas.width! * 0.8) / groupWidth
            const scaleY = (canvas.height! * 0.8) / groupHeight
            const scale = Math.min(scaleX, scaleY)

            // Calculate center offset
            const offsetX = (canvas.width! - groupWidth * scale) / 2 - bounds.left * scale
            const offsetY = (canvas.height! - groupHeight * scale) / 2 - bounds.top * scale

            // Apply transform to all objects
            objects.forEach(obj => {
              obj.set({
                left: obj.left! * scale + offsetX,
                top: obj.top! * scale + offsetY,
                scaleX: obj.scaleX! * scale,
                scaleY: obj.scaleY! * scale
              })
            })
          }

          canvas.requestRenderAll()
        } catch (error) {
          console.error('Error loading SVG file:', error)
          alert('Error loading SVG file: ' + (error as Error).message)
        }
      }

      reader.onerror = (error) => {
        console.error('FileReader error:', error)
        alert('Error reading file: ' + ((error.target as FileReader)?.error?.message || 'Unknown error'))
      }

      reader.readAsText(file)
    } else {
      alert('Please upload a .json or .svg file')
    }
    
    // Reset file input
    if (event.target) {
      event.target.value = ''
    }
  }

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
        {/* <span>• {isMac ? 'Cmd' : 'Ctrl'}+Drag: Pan • {isMac ? 'Cmd' : 'Ctrl'}+Scroll: Zoom • Scroll: Pan • Pinch: Zoom{isMac ? ' • 2-Finger: Pan' : ''}</span> */}
      </div>
    </div>
  );
};

export default Canvas; 
