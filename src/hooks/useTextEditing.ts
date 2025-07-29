import { useState, useEffect, useCallback } from 'react';
import type { TextShape } from '../components/BasicObjects/Text';
import { TextDrawer } from '../components/BasicObjects/Text';


export const useTextEditing = () => {
  const [editingText, setEditingText] = useState<TextShape | null>(null);
  const [textCursorPosition, setTextCursorPosition] = useState(0);
  const [showTextCursor, setShowTextCursor] = useState(false);
  const [textSelectionStart, setTextSelectionStart] = useState<number | null>(null);
  const [textSelectionEnd, setTextSelectionEnd] = useState<number | null>(null);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [lastClickedTextId, setLastClickedTextId] = useState<string | null>(null);

  // Text cursor blinking effect
  useEffect(() => {
    if (editingText) {
      setShowTextCursor(true);
      const interval = setInterval(() => {
        setShowTextCursor(prev => !prev);
      }, 600);
      return () => clearInterval(interval);
    } else {
      setShowTextCursor(false);
    }
  }, [editingText]);

  // Force cursor visibility when cursor position changes
  useEffect(() => {
    if (editingText) {
      setShowTextCursor(true);
    }
  }, [editingText, textCursorPosition]);

  const startEditing = useCallback((textShape: TextShape, cursorPos: number = 0) => {
    setEditingText(textShape);
    setTextCursorPosition(cursorPos);
    setTextSelectionStart(null);
    setTextSelectionEnd(null);
    setShowTextCursor(true);
  }, []);

  const finishEditing = useCallback((): TextShape | null => {
    if (!editingText) return null;
    
    const updatedText = TextDrawer.finishEditing(editingText);
    setEditingText(null);
    setTextCursorPosition(0);
    setTextSelectionStart(null);
    setTextSelectionEnd(null);
    setShowTextCursor(false);
    
    return updatedText;
  }, [editingText]);

  const updateText = useCallback((newText: string) => {
    if (!editingText) return null;
    
    const updatedText = TextDrawer.updateText(editingText, newText);
    setEditingText(updatedText);
    return updatedText;
  }, [editingText]);

  const handleTextClick = useCallback((textShape: TextShape, isDoubleClick?: boolean) => {
    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - lastClickTime;
    const actualDoubleClick = isDoubleClick || (timeSinceLastClick < 400 && lastClickedTextId === textShape.id);
    
    setLastClickTime(currentTime);
    setLastClickedTextId(textShape.id);
    
    return actualDoubleClick;
  }, [lastClickTime, lastClickedTextId]);

  // Helper function to delete selected text
  const deleteSelectedText = useCallback((): { newText: string; newCursorPos: number } => {
    if (!editingText) return { newText: '', newCursorPos: 0 };
    
    if (textSelectionStart !== null && textSelectionEnd !== null) {
      const start = Math.min(textSelectionStart, textSelectionEnd);
      const end = Math.max(textSelectionStart, textSelectionEnd);
      const newText = editingText.text.slice(0, start) + editingText.text.slice(end);
      return { newText, newCursorPos: start };
    }
    return { newText: editingText.text, newCursorPos: textCursorPosition };
  }, [editingText, textSelectionStart, textSelectionEnd, textCursorPosition]);

  // Helper function to clear selection
  const clearSelection = useCallback(() => {
    setTextSelectionStart(null);
    setTextSelectionEnd(null);
  }, []);

  return {
    editingText,
    textCursorPosition,
    showTextCursor,
    textSelectionStart,
    textSelectionEnd,
    setTextCursorPosition,
    setTextSelectionStart,
    setTextSelectionEnd,
    startEditing,
    finishEditing,
    updateText,
    handleTextClick,
    deleteSelectedText,
    clearSelection
  };
}; 