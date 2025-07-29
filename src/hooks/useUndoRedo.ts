import { useState, useCallback } from 'react';
import type { Shape } from '../utils/hitTesting';

export const useUndoRedo = (initialShapes: Shape[] = []) => {
  const [history, setHistory] = useState<Shape[][]>([initialShapes]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Function to add current state to history
  const addToHistory = useCallback((newShapes: Shape[]) => {
    setHistory(prev => {
      // Remove any redo history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push([...newShapes]);
      // Limit history size to prevent memory issues
      return newHistory.length > 50 ? newHistory.slice(1) : newHistory;
    });
    setHistoryIndex(prev => {
      const newIndex = prev + 1;
      return newIndex > 49 ? 49 : newIndex;
    });
  }, [historyIndex]);

  // Undo function
  const undo = useCallback((): Shape[] | null => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      return [...history[newIndex]];
    }
    return null;
  }, [history, historyIndex]);

  // Redo function
  const redo = useCallback((): Shape[] | null => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      return [...history[newIndex]];
    }
    return null;
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo
  };
}; 