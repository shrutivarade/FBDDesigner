import rough from 'roughjs';

export interface CircleShape {
  id: string;
  type: 'circle';
  x: number;
  y: number;
  radius: number;
  strokeColor: string;
  fillColor?: string;
}

export class CircleDrawer {
  static draw(
    ctx: CanvasRenderingContext2D,
    shape: CircleShape
  ): void {
    const roughCanvas = rough.canvas(ctx.canvas);
    
    roughCanvas.circle(
      shape.x,
      shape.y,
      shape.radius * 2, // roughjs expects diameter
      {
        stroke: shape.strokeColor,
        strokeWidth: 2,
        fill: shape.fillColor,
        roughness: 1.5,
        bowing: 1
      }
    );
  }

  static createCircle(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    strokeColor: string = '#4e4e4e', // Using theme's davys-gray
    fillColor?: string
  ): CircleShape {
    // Calculate center and radius from drag start/end points
    const centerX = (startX + endX) / 2;
    const centerY = (startY + endY) / 2;
    const radius = Math.sqrt(
      Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
    ) / 2;

    return {
      id: `circle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'circle',
      x: centerX,
      y: centerY,
      radius,
      strokeColor,
      fillColor
    };
  }
}
