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
  const [toolInstance, setToolInstance] = useState(0)

  const handleToolSelect = (toolId: string) => {
    if (toolId === selectedTool) {
      // If the same tool is selected again, increment the instance
      setToolInstance(prev => prev + 1)
    } else {
      // If a different tool is selected, update the tool and reset instance
      setSelectedTool(toolId)
      setToolInstance(0)
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
