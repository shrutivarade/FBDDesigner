import { useEffect, useRef, useState } from 'react'
import { Canvas as FabricCanvas, Line, Rect, Path, IText, Group, Circle, Ellipse, Triangle } from 'fabric'
import type { TPointerEvent, TPointerEventInfo } from 'fabric'
import { Box } from '@mui/material'

interface CanvasProps {
  selectedTool: string | null
  onObjectPlaced: () => void
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

export default function Canvas({ selectedTool, onObjectPlaced }: CanvasProps) {
  const canvasRef = useRef<FabricCanvas | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [previewObject, setPreviewObject] = useState<any>(null)

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
    const gridSize = 20
    const width = canvas.width || 0
    const height = canvas.height || 0

    for (let i = 0; i < width; i += gridSize) {
      canvas.add(
        new Line([i, 0, i, height], {
          stroke: '#ddd',
          selectable: false,
          evented: false
        })
      )
    }
    for (let i = 0; i < height; i += gridSize) {
      canvas.add(
        new Line([0, i, width, i], {
          stroke: '#ddd',
          selectable: false,
          evented: false
        })
      )
    }

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return
      canvas.setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
      canvas.requestRenderAll()
    }

    window.addEventListener('resize', handleResize)

    // Handle keyboard events for delete
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = canvas.getActiveObjects()
        activeObjects.forEach(obj => canvas.remove(obj))
        canvas.discardActiveObject()
        canvas.requestRenderAll()
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

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas id="fbd-canvas" />
    </Box>
  )
} 