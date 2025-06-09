import { useState } from 'react'
import { Box, ThemeProvider, createTheme } from '@mui/material'
import Toolbar from './components/Toolbar'
import Canvas from './components/Canvas'
import './App.css'

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

function App() {
  const [selectedTool, setSelectedTool] = useState<string | null>(null)

  const handleToolSelect = (toolId: string) => {
    if (toolId === selectedTool) {
      // If the same tool is selected again, deselect it
      setSelectedTool(null)
    } else {
      // If a different tool is selected, update the tool
      setSelectedTool(toolId)
    }
  }

  const handleObjectPlaced = () => {
    // Reset tool selection after placing an object
    setSelectedTool(null)
  }

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: 240,
            borderRight: '1px solid #e0e0e0',
            bgcolor: 'background.paper',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Toolbar selectedTool={selectedTool} onToolSelect={handleToolSelect} />
        </Box>

        <Box
          sx={{
            flex: 1,
            bgcolor: '#f5f5f5',
            position: 'relative',
          }}
        >
          <Canvas selectedTool={selectedTool} onObjectPlaced={handleObjectPlaced} />
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App
