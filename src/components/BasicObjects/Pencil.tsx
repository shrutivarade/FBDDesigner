import rough from 'roughjs';

export interface PencilShape {
  id: string;
  type: 'pencil';
  points: { x: number; y: number }[];
  strokeColor: string;
}

export class PencilDrawer {
  static draw(
    ctx: CanvasRenderingContext2D,
    shape: PencilShape
  ): void {
    if (shape.points.length < 2) return;
    
    const roughCanvas = rough.canvas(ctx.canvas);
    
    // Draw as a curve connecting all points
    // For roughjs, we'll create a path string
    let pathString = `M ${shape.points[0].x} ${shape.points[0].y}`;
    
    for (let i = 1; i < shape.points.length; i++) {
      pathString += ` L ${shape.points[i].x} ${shape.points[i].y}`;
    }
    
    roughCanvas.path(pathString, {
      stroke: shape.strokeColor,
      strokeWidth: 2,
      roughness: 0.8, // Less rough for smoother pencil strokes
      bowing: 0.5,
      fill: 'none'
    });
  }

  static createPencil(
    points: { x: number; y: number }[],
    strokeColor: string = '#4e4e4e' // Using theme's davys-gray
  ): PencilShape {
    return {
      id: `pencil_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'pencil',
      points: [...points],
      strokeColor
    };
  }

  static addPoint(
    shape: PencilShape,
    point: { x: number; y: number }
  ): PencilShape {
    return {
      ...shape,
      points: [...shape.points, point]
    };
  }
}
