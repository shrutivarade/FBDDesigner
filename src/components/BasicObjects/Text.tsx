export interface TextShape {
  id: string;
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  strokeColor: string;
  isEditing?: boolean;
}

export class TextDrawer {
  static draw(
    ctx: CanvasRenderingContext2D,
    shape: TextShape,
    showCursor: boolean = false,
    cursorPosition: number = 0,
    selectionStart: number | null = null,
    selectionEnd: number | null = null
  ): void {
    if (!shape.text && !showCursor) return;
    
    // Set font properties
    ctx.font = `${shape.fontSize}px ${shape.fontFamily}`;
    ctx.fillStyle = shape.strokeColor;
    ctx.textBaseline = 'top';
    
    // Split text into lines for multiline support
    const lines = shape.text.split('\n');
    const lineHeight = shape.fontSize * 1.2; // 20% line spacing
    
    // Draw text input background when editing (subtle indication)
    if (showCursor && shape.isEditing) {
      ctx.save();
      ctx.fillStyle = 'rgba(193, 247, 220, 0.1)'; // Very subtle tea green background
      ctx.strokeStyle = 'rgba(193, 247, 220, 0.4)'; // Subtle tea green border
      ctx.lineWidth = 1;
      
      // Calculate text bounds for background
      const textWidth = TextDrawer.getTextWidth(ctx, shape);
      const textHeight = TextDrawer.getTextHeight(shape);
      const padding = 4;
      
      // Draw subtle input background
      ctx.fillRect(
        shape.x - padding, 
        shape.y - padding, 
        Math.max(textWidth + padding * 2, 30), // Minimum width for empty text
        textHeight + padding * 2
      );
      
      // Draw subtle border with rounded corners effect
      ctx.setLineDash([2, 2]); // Subtle dashed border
      ctx.strokeRect(
        shape.x - padding, 
        shape.y - padding, 
        Math.max(textWidth + padding * 2, 30),
        textHeight + padding * 2
      );
      ctx.setLineDash([]); // Reset line dash
      
      ctx.restore();
    }
    
    // Draw selection highlighting if there's a selection
    if (selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd) {
      const start = Math.min(selectionStart, selectionEnd);
      const end = Math.max(selectionStart, selectionEnd);
      
      ctx.save();
      ctx.fillStyle = 'rgba(0, 123, 255, 0.3)'; // Blue selection highlight
      
      let charCount = 0;
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineStart = charCount;
        const lineEnd = charCount + line.length;
        const y = shape.y + (lineIndex * lineHeight);
        
        // Check if selection intersects with this line
        if (start <= lineEnd && end >= lineStart) {
          const selectionStartInLine = Math.max(0, start - lineStart);
          const selectionEndInLine = Math.min(line.length, end - lineStart);
          
          const textBeforeSelection = line.substring(0, selectionStartInLine);
          const selectedText = line.substring(selectionStartInLine, selectionEndInLine);
          
          const startX = shape.x + ctx.measureText(textBeforeSelection).width;
          const selectionWidth = ctx.measureText(selectedText).width;
          
          // Draw selection rectangle
          ctx.fillRect(startX, y, selectionWidth, shape.fontSize);
        }
        
        charCount = lineEnd + 1; // +1 for newline character
      }
      
      ctx.restore();
    }
    
    // Draw each line of text
    lines.forEach((line, lineIndex) => {
      const y = shape.y + (lineIndex * lineHeight);
      if (line) {
        ctx.fillText(line, shape.x, y);
      }
    });
    
    // Draw cursor if editing
    if (showCursor && shape.isEditing) {
      // Calculate cursor position across multiple lines
      let currentPos = 0;
      let cursorX = shape.x;
      let cursorY = shape.y;
      
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineEndPos = currentPos + line.length;
        
        if (cursorPosition <= lineEndPos) {
          // Cursor is in this line
          const posInLine = cursorPosition - currentPos;
          const textBeforeCursor = line.substring(0, posInLine);
          cursorX = shape.x + ctx.measureText(textBeforeCursor).width;
          cursorY = shape.y + (lineIndex * lineHeight);
          break;
        }
        
        // Move to next line (add 1 for the newline character)
        currentPos = lineEndPos + 1;
      }
      
      // Draw prominent blinking cursor
      ctx.save();
      ctx.strokeStyle = '#4e4e4e'; // Bright blue cursor for better visibility
      ctx.lineWidth = 2; // Thicker cursor
      ctx.lineCap = 'round'; // Rounded ends
      
      // Add a subtle glow effect
      ctx.shadowColor = '#4e4e4eff';
      ctx.shadowBlur = 2;
      
      ctx.beginPath();
      ctx.moveTo(cursorX, cursorY - 2); // Start slightly above text
      ctx.lineTo(cursorX, cursorY + shape.fontSize + 2); // End slightly below text
      ctx.stroke();
      
      ctx.restore();
    }
  }

  static createText(
    x: number,
    y: number,
    text: string = '',
    fontSize: number = 16,
    fontFamily: string = 'Arial, sans-serif',
    strokeColor: string = '#4e4e4e' // Using theme's davys-gray
  ): TextShape {
    return {
      id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      x,
      y,
      text,
      fontSize,
      fontFamily,
      strokeColor,
      isEditing: true
    };
  }

  static updateText(
    shape: TextShape,
    newText: string
  ): TextShape {
    return {
      ...shape,
      text: newText
    };
  }

  static finishEditing(shape: TextShape): TextShape {
    return {
      ...shape,
      isEditing: false
    };
  }

  static getTextWidth(
    ctx: CanvasRenderingContext2D,
    shape: TextShape
  ): number {
    ctx.font = `${shape.fontSize}px ${shape.fontFamily}`;
    const lines = shape.text.split('\n');
    let maxWidth = 0;
    
    lines.forEach(line => {
      const lineWidth = ctx.measureText(line).width;
      maxWidth = Math.max(maxWidth, lineWidth);
    });
    
    return maxWidth;
  }

  static getTextHeight(shape: TextShape): number {
    const lines = shape.text.split('\n');
    const lineHeight = shape.fontSize * 1.2;
    return lines.length * lineHeight;
  }

  static getCursorPositionFromPoint(
    ctx: CanvasRenderingContext2D,
    shape: TextShape,
    clickX: number,
    clickY: number
  ): number {
    ctx.font = `${shape.fontSize}px ${shape.fontFamily}`;
    const lines = shape.text.split('\n');
    const lineHeight = shape.fontSize * 1.2;
    
    // Find which line was clicked
    const lineIndex = Math.floor((clickY - shape.y) / lineHeight);
    const clampedLineIndex = Math.max(0, Math.min(lines.length - 1, lineIndex));
    
    // Calculate position within the line
    let charCount = 0;
    for (let i = 0; i < clampedLineIndex; i++) {
      charCount += lines[i].length + 1; // +1 for newline
    }
    
    const line = lines[clampedLineIndex];
    const relativeX = clickX - shape.x;
    
    // Find the closest character position in the line
    let bestPosition = 0;
    let bestDistance = Math.abs(relativeX);
    
    for (let i = 0; i <= line.length; i++) {
      const textBeforeChar = line.substring(0, i);
      const charX = ctx.measureText(textBeforeChar).width;
      const distance = Math.abs(relativeX - charX);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPosition = i;
      }
    }
    
    return charCount + bestPosition;
  }
}
