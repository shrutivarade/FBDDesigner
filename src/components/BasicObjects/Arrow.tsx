import rough from 'roughjs';

export interface ArrowShape {
  id: string;
  type: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeColor: string;
}

export class ArrowDrawer {
  static draw(
    ctx: CanvasRenderingContext2D,
    shape: ArrowShape
  ): void {
    const roughCanvas = rough.canvas(ctx.canvas);
    
    // Draw the main line
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

    // Calculate arrowhead
    const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
    const arrowLength = 15;
    const arrowAngle = Math.PI / 6; // 30 degrees

    // Arrowhead points
    const arrowX1 = shape.x2 - arrowLength * Math.cos(angle - arrowAngle);
    const arrowY1 = shape.y2 - arrowLength * Math.sin(angle - arrowAngle);
    const arrowX2 = shape.x2 - arrowLength * Math.cos(angle + arrowAngle);
    const arrowY2 = shape.y2 - arrowLength * Math.sin(angle + arrowAngle);

    // Draw arrowhead lines
    roughCanvas.line(
      shape.x2,
      shape.y2,
      arrowX1,
      arrowY1,
      {
        stroke: shape.strokeColor,
        strokeWidth: 2,
        roughness: 1.5,
        bowing: 1
      }
    );

    roughCanvas.line(
      shape.x2,
      shape.y2,
      arrowX2,
      arrowY2,
      {
        stroke: shape.strokeColor,
        strokeWidth: 2,
        roughness: 1.5,
        bowing: 1
      }
    );
  }

  static createArrow(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    strokeColor: string = '#4e4e4e' // Using theme's davys-gray
  ): ArrowShape {
    return {
      id: `arrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'arrow',
      x1: startX,
      y1: startY,
      x2: endX,
      y2: endY,
      strokeColor
    };
  }
}
