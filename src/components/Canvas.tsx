import { useEffect, useRef, useState } from 'react'
import { Canvas as FabricCanvas, Line, Rect, Path, IText, Group, Circle, Ellipse, Triangle, Image as FabricImage, StaticCanvas } from 'fabric'
import type { TPointerEvent, TPointerEventInfo, Object as FabricObject } from 'fabric'
import { Box, Button, IconButton, Tooltip } from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import ImageIcon from '@mui/icons-material/Image'

// Declare fabric namespace
declare const fabric: {
  loadSVGFromString: (
    svgString: string, 
    callback: (objects: FabricObject[], options: any) => void
  ) => void;
  Group: typeof Group;
}

// Define colors for different types of arrows
const ARROW_COLORS = {
  force: '#2196F3',        // Blue
  displacement: '#4CAF50', // Green
  velocity: '#9C27B0',     // Purple
  acceleration: '#FF5722'  // Orange
}

// Define support symbols
const SUPPORT_SYMBOLS = {
  pinned: 'M 0 -20 L 20 20 L -20 20 Z M -25 20 L 25 20',
  roller: 'M 0 -20 L 20 20 L -20 20 Z M -25 20 L 25 20 M -10 20 A 4 4 0 1 0 -10 28 A 4 4 0 1 0 -10 20 M 10 20 A 4 4 0 1 0 10 28 A 4 4 0 1 0 10 20',
  fixed: 'M 0 -50 L 0 0 M 0 0 L -6 8 M 0 -8 L -6 0 M 0 -16 L -6 -8 M 0 -24 L -6 -16 M 0 -32 L -6 -24 M 0 -40 L -6 -32 M 0 -48 L -6 -40',
  spring: 'M 0 -50 L 0 -42 M 0 -42 L -15 -36 M -15 -36 L 15 -30 M 15 -30 L -15 -24 M -15 -24 L 15 -18 M 15 -18 L 0 -12 M 0 -12 L 0 -5 M -25 -5 L 25 -5'
}

// Helper function to create arrows with labels
const createArrowWithLabel = (label: string, color: string) => {
  const line = new Path('M -30 0 L 30 0', {
    stroke: color,
    strokeWidth: 2,
  })

  const arrowhead = new Path('M 20 -8 L 35 0 L 20 8 Z', {
    stroke: color,
    strokeWidth: 2,
    fill: color,
  })

  const text = new IText(label, {
    left: 40,
    top: -12,
    fontSize: 16,
    fill: color,
    fontWeight: 'bold',
  })

  return new Group([line, arrowhead, text], {
    selectable: true,
    hasControls: true,
    hasBorders: true,
  })
}

// Create preview object for mouse movement
const createPreviewObject = (tool: string) => {
  switch (tool) {
    case 'point':
      return new Circle({
        radius: 4,
        fill: '#000000',
        originX: 'center',
        originY: 'center',
      })

    case 'line':
    case 'dottedLine':
      return new Line([0, 0, 30, 30], {
        stroke: '#000000',
        strokeWidth: 2,
        strokeDashArray: tool === 'dottedLine' ? [3, 3] : undefined,
      })

    case 'triangle':
      return new Triangle({
        width: 30,
        height: 30,
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 2,
      })

    case 'rectangle':
      return new Rect({
        width: 40,
        height: 30,
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 2,
      })

    case 'polygon':
      return new Path('M 0 -15 L 15 -5 L 15 5 L 0 15 L -15 5 L -15 -5 Z', {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 2,
      })

    case 'circle':
      return new Circle({
        radius: 20,
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 2,
      })

    case 'ellipse':
      return new Ellipse({
        rx: 25,
        ry: 15,
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 2,
      })

    case 'arc':
    case 'dottedArc':
      return new Path('M -20 0 A 20 20 0 0 1 20 0', {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 2,
        strokeDashArray: tool === 'dottedArc' ? [3, 3] : undefined,
      })

    case 'beam':
      return new Rect({
        width: 200,
        height: 10,
        fill: '#666666',
        originX: 'center',
        originY: 'center',
      })

    case 'force':
    case 'displacement':
    case 'velocity':
    case 'acceleration': {
      const label = tool === 'force' ? 'F' :
                   tool === 'displacement' ? 'D' :
                   tool === 'velocity' ? 'V' : 'A'
      const color = ARROW_COLORS[tool as keyof typeof ARROW_COLORS]
      const line = new Path('M -30 0 L 30 0', {
        stroke: color,
        strokeWidth: 2,
      })
      const arrowhead = new Path('M 20 -8 L 35 0 L 20 8 Z', {
        stroke: color,
        strokeWidth: 2,
        fill: color,
      })
      const text = new IText(label, {
        left: 40,
        top: -12,
        fontSize: 16,
        fill: color,
        fontWeight: 'bold',
      })
      return new Group([line, arrowhead, text], {
        originX: 'center',
        originY: 'center',
      })
    }

    case 'pinned':
    case 'roller':
    case 'fixed':
    case 'spring': {
      return new Path(SUPPORT_SYMBOLS[tool as keyof typeof SUPPORT_SYMBOLS], {
        stroke: '#000000',
        strokeWidth: 2,
        fill: tool === 'pinned' ? '#000000' : 'transparent',
        originX: 'center',
        originY: 'center',
      })
    }

    case 'text':
      return new IText('Text', {
        fontSize: 20,
        fill: '#000000',
        backgroundColor: 'transparent',
        padding: 8,
        originX: 'center',
        originY: 'center',
      })

    default:
      return null
  }
}

interface CanvasProps {
  selectedTool: string | null
  onObjectPlaced: () => void
}

interface FabricObjectData {
  type: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  radius?: number;
  rx?: number;
  ry?: number;
  points?: number[];
  path?: any;
  text?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  [key: string]: any;
}

export default function Canvas({ selectedTool, onObjectPlaced }: CanvasProps) {
  const canvasRef = useRef<FabricCanvas | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [previewObject, setPreviewObject] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize canvas
  useEffect(() => {
    if (!containerRef.current) return

    const canvas = new FabricCanvas('fbd-canvas', {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#f5f5f5',
      selection: true,
      preserveObjectStacking: true,
    })

    canvasRef.current = canvas

    // Add grid
    const addGrid = () => {
      const gridSize = 20
      const width = canvas.width || 0
      const height = canvas.height || 0
      const gridLines: FabricObject[] = []

      // Create vertical lines
      for (let i = 0; i < width; i += gridSize) {
        const line = new Line([i, 0, i, height], {
          stroke: '#ddd',
          selectable: false,
          evented: false,
          excludeFromExport: true,
          hoverCursor: 'default',
          objectCaching: false
        })
        gridLines.push(line)
      }

      // Create horizontal lines
      for (let i = 0; i < height; i += gridSize) {
        const line = new Line([0, i, width, i], {
          stroke: '#ddd',
          selectable: false,
          evented: false,
          excludeFromExport: true,
          hoverCursor: 'default',
          objectCaching: false
        })
        gridLines.push(line)
      }

      // Add all grid lines at once at the bottom layer
      if (gridLines.length > 0) {
        canvas.add(...gridLines)
        
        // Set properties for all grid lines
        gridLines.forEach(line => {
          line.set({
            lockMovementX: true,
            lockMovementY: true,
            lockRotation: true,
            lockScalingX: true,
            lockScalingY: true,
            hasControls: false,
            hasBorders: false,
            selectable: false
          })
        })
      }
    }

    addGrid()

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      canvas.setDimensions({ width, height })

      // Store non-grid objects
      const nonGridObjects = canvas.getObjects().filter(obj => 
        !(obj instanceof Line && obj.stroke === '#ddd')
      )

      // Clear canvas
      canvas.clear()

      // Add grid first (so it's at the bottom)
      addGrid()

      // Restore non-grid objects on top of the grid
      if (nonGridObjects.length > 0) {
        canvas.add(...nonGridObjects)
      }

      canvas.renderAll()
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Call once to set initial size

    // Handle keyboard events for delete
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = canvas.getActiveObjects()
        activeObjects.forEach(obj => {
          // Only delete non-grid objects
          if (!(obj instanceof Line && obj.stroke === '#ddd')) {
            canvas.remove(obj)
          }
        })
        canvas.discardActiveObject()
        canvas.renderAll()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
      canvas.dispose()
    }
  }, [])

  // Create objects based on selected tool
  const createObject = (tool: string, x: number, y: number) => {
    switch (tool) {
      case 'point':
        return new Circle({
          left: x,
          top: y,
          radius: 4,
          fill: '#000000',
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
        })

      case 'line':
      case 'dottedLine':
        return new Line([x - 15, y - 15, x + 15, y + 15], {
          stroke: '#000000',
          strokeWidth: 2,
          strokeDashArray: tool === 'dottedLine' ? [3, 3] : undefined,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
        })

      case 'triangle':
        return new Triangle({
          left: x,
          top: y,
          width: 30,
          height: 30,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
        })

      case 'rectangle':
        return new Rect({
          left: x,
          top: y,
          width: 40,
          height: 30,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
        })

      case 'polygon':
        return new Path('M 0 -15 L 15 -5 L 15 5 L 0 15 L -15 5 L -15 -5 Z', {
          left: x,
          top: y,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
        })

      case 'circle':
        return new Circle({
          left: x,
          top: y,
          radius: 20,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
        })

      case 'ellipse':
        return new Ellipse({
          left: x,
          top: y,
          rx: 25,
          ry: 15,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
        })

      case 'arc':
      case 'dottedArc':
        return new Path('M -20 0 A 20 20 0 0 1 20 0', {
          left: x,
          top: y,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2,
          strokeDashArray: tool === 'dottedArc' ? [3, 3] : undefined,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
        })

      case 'beam':
        return new Rect({
          left: x,
          top: y,
          width: 200,
          height: 10,
          fill: '#666666',
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
        })

      case 'force':
      case 'displacement':
      case 'velocity':
      case 'acceleration': {
        const label = tool === 'force' ? 'F' :
                     tool === 'displacement' ? 'D' :
                     tool === 'velocity' ? 'V' : 'A'
        const color = ARROW_COLORS[tool as keyof typeof ARROW_COLORS]
        const group = createArrowWithLabel(label, color)
        group.set({
          left: x,
          top: y,
          originX: 'center',
          originY: 'center',
        })
        return group
      }

      case 'pinned':
      case 'roller':
      case 'fixed':
      case 'spring': {
        const path = new Path(SUPPORT_SYMBOLS[tool as keyof typeof SUPPORT_SYMBOLS], {
          left: x,
          top: y,
          stroke: '#000000',
          strokeWidth: 2,
          fill: tool === 'pinned' ? '#000000' : 'transparent',
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
        })
        return path
      }

      case 'text':
        return new IText('Text', {
          left: x,
          top: y,
          fontSize: 20,
          fill: '#000000',
          backgroundColor: 'transparent',
          padding: 8,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
        })

      default:
        return null
    }
  }

  // Handle tool selection and preview
  useEffect(() => {
    if (!canvasRef.current || !selectedTool) return

    const canvas = canvasRef.current

    // Remove existing preview object
    if (previewObject) {
      canvas.remove(previewObject)
      setPreviewObject(null)
    }

    // Create new preview object
    const preview = createPreviewObject(selectedTool)
    if (preview) {
      preview.set({
        opacity: 0.5,
        selectable: false,
        evented: false,
      })
      canvas.add(preview)
      setPreviewObject(preview)
    }

    const handleMouseMove = (options: TPointerEventInfo<TPointerEvent>) => {
      if (!preview) return
      const pointer = canvas.getPointer(options.e)
      preview.set({
        left: pointer.x,
        top: pointer.y,
      })
      canvas.requestRenderAll()
    }

    const handleMouseDown = (options: TPointerEventInfo<TPointerEvent>) => {
      if (options.target && options.target !== preview) return

      const pointer = canvas.getPointer(options.e)
      const object = createObject(selectedTool, pointer.x, pointer.y)
      
      if (object) {
        canvas.add(object)
        canvas.setActiveObject(object)
        canvas.requestRenderAll()
        onObjectPlaced()
      }
    }

    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:down', handleMouseDown)

    return () => {
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:down', handleMouseDown)
      if (preview && canvas) {
        canvas.remove(preview)
      }
    }
  }, [selectedTool, onObjectPlaced])

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
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box
        sx={{
          p: 1,
          borderBottom: '1px solid #e0e0e0',
          bgcolor: 'background.paper',
          display: 'flex',
          gap: 1,
          alignItems: 'center'
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".json,.svg"
          onChange={handleFileUpload}
        />
        <Tooltip title="Import Design (JSON or SVG)">
          <IconButton 
            onClick={() => fileInputRef.current?.click()}
            size="small"
          >
            <FileUploadIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Save as JSON">
          <IconButton 
            onClick={saveCanvasState}
            size="small"
          >
            <SaveIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export as PNG">
          <IconButton 
            onClick={exportAsPNG}
            size="small"
          >
            <ImageIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export as SVG">
          <Button 
            size="small" 
            variant="outlined"
            onClick={exportAsSVG}
          >
            SVG
          </Button>
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1, position: 'relative' }}>
        <canvas id="fbd-canvas" />
      </Box>
    </Box>
  )
} 
