import rough from 'roughjs';

export interface RectangleShape {
  id: string;
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor?: string;
}

export class RectangleDrawer {
  static draw(
    ctx: CanvasRenderingContext2D,
    shape: RectangleShape
  ): void {
    const roughCanvas = rough.canvas(ctx.canvas);
    
    roughCanvas.rectangle(
      shape.x,
      shape.y,
      shape.width,
      shape.height,
      {
        stroke: shape.strokeColor,
        strokeWidth: 2,
        fill: shape.fillColor,
        roughness: 1.5,
        bowing: 1
      }
    );
  }

  static createRectangle(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    strokeColor: string = '#4e4e4e', // Using theme's davys-gray
    fillColor?: string
  ): RectangleShape {
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    return {
      id: `rect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'rectangle',
      x,
      y,
      width,
      height,
      strokeColor,
      fillColor
    };
  }
}
