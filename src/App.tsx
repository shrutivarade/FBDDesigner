import { useState, useEffect } from 'react'
import './App.css'
import Canvas from './components/Canvas'
import TopToolBar from './components/TopToolBar'

function App() {
  const [selectedTool, setSelectedTool] = useState<string | null>('select');

  const handleToolSelect = (tool: string) => {
    setSelectedTool(tool);
  };

  // Global ESC key handler to reset to select mode
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTool('select');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className="app">
      <TopToolBar selectedTool={selectedTool} onToolSelect={handleToolSelect} />
      <main className="app-main">
        <Canvas selectedTool={selectedTool} onToolSelect={handleToolSelect} />
      </main>
    </div>
  )
}

export default App
