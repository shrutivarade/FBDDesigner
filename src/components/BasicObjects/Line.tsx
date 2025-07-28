import rough from 'roughjs';

export interface LineShape {
  id: string;
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeColor: string;
}

export class LineDrawer {
  static draw(
    ctx: CanvasRenderingContext2D,
    shape: LineShape
  ): void {
    const roughCanvas = rough.canvas(ctx.canvas);
    
    roughCanvas.line(
      shape.x1,
      shape.y1,
      shape.x2,
      shape.y2,
      {
        stroke: shape.strokeColor,
        strokeWidth: 2,
        roughness: 1.5,
        bowing: 1
      }
    );
  }

  static createLine(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    strokeColor: string = '#4e4e4e' // Using theme's davys-gray
  ): LineShape {
    return {
      id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'line',
      x1: startX,
      y1: startY,
      x2: endX,
      y2: endY,
      strokeColor
    };
  }
}
