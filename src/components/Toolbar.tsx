import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider } from '@mui/material'
import { SvgIcon } from '@mui/material'

interface ToolbarProps {
  selectedTool: string | null
  onToolSelect: (tool: string) => void
}

// Define all tools with their SVG paths
const tools = [
  {
    category: 'Geometry',
    items: [
      {
        id: 'point',
        name: 'Point',
        icon: 'M 12 12 m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0'
      },
      {
        id: 'line',
        name: 'Line',
        icon: 'M 4 20 L 20 4'
      },
      {
        id: 'dottedLine',
        name: 'Dotted Line',
        icon: 'M 4 20 L 20 4',
        strokeDashArray: [3, 3]
      },
      {
        id: 'triangle',
        name: 'Triangle',
        icon: 'M 12 4 L 20 20 L 4 20 Z'
      },
      {
        id: 'rectangle',
        name: 'Rectangle',
        icon: 'M 4 6 L 20 6 L 20 18 L 4 18 Z'
      },
      {
        id: 'polygon',
        name: 'Polygon',
        icon: 'M 12 4 L 20 8 L 20 16 L 12 20 L 4 16 L 4 8 Z'
      },
      {
        id: 'circle',
        name: 'Circle',
        icon: 'M 12 12 m -8 0 a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0'
      },
      {
        id: 'ellipse',
        name: 'Ellipse',
        icon: 'M 12 12 m -10 0 a 10 6 0 1 0 20 0 a 10 6 0 1 0 -20 0'
      },
      {
        id: 'arc',
        name: 'Arc',
        icon: 'M 4 16 A 12 12 0 0 1 20 16'
      },
      {
        id: 'dottedArc',
        name: 'Dotted Arc',
        icon: 'M 4 16 A 12 12 0 0 1 20 16',
        strokeDashArray: [3, 3]
      }
    ]
  },
  {
    category: 'Basic Elements',
    items: [
      {
        id: 'beam',
        name: 'Beam',
        icon: 'M 2 10 L 22 10 L 22 14 L 2 14 Z'
      }
    ]
  },
  {
    category: 'Forces',
    items: [
      {
        id: 'force',
        name: 'Force',
        icon: 'M 4 12 L 20 12 M 16 6 L 20 12 L 16 18',
        color: '#2196F3'
      },
      {
        id: 'displacement',
        name: 'Displacement',
        icon: 'M 4 12 L 20 12 M 16 6 L 20 12 L 16 18',
        color: '#4CAF50'
      },
      {
        id: 'velocity',
        name: 'Velocity',
        icon: 'M 4 12 L 20 12 M 16 6 L 20 12 L 16 18',
        color: '#9C27B0'
      },
      {
        id: 'acceleration',
        name: 'Acceleration',
        icon: 'M 4 12 L 20 12 M 16 6 L 20 12 L 16 18',
        color: '#FF5722'
      }
    ]
  },
  {
    category: 'Supports',
    items: [
      {
        id: 'pinned',
        name: 'Pinned Support',
        icon: 'M 12 4 L 20 20 L 4 20 Z M 2 20 L 22 20'
      },
      {
        id: 'roller',
        name: 'Roller Support',
        icon: 'M 12 4 L 20 20 L 4 20 Z M 2 20 L 22 20 M 8 20 C 8 22 6 22 6 20 C 6 18 8 18 8 20 M 18 20 C 18 22 16 22 16 20 C 16 18 18 18 18 20'
      },
      {
        id: 'fixed',
        name: 'Fixed Support',
        icon: 'M 12 2 L 12 22 M 12 22 L 8 18 M 12 18 L 8 14 M 12 14 L 8 10 M 12 10 L 8 6'
      },
      {
        id: 'spring',
        name: 'Spring Support',
        icon: 'M 12 4 L 12 8 M 12 8 L 8 10 L 16 12 L 8 14 L 16 16 L 12 18 M 12 18 L 12 20 M 4 20 L 20 20'
      }
    ]
  },
  {
    category: 'Other',
    items: [
      {
        id: 'text',
        name: 'Text',
        icon: 'M 6 4 L 18 4 M 12 4 L 12 20 M 8 20 L 16 20'
      }
    ]
  }
]

export default function Toolbar({ selectedTool, onToolSelect }: ToolbarProps) {
  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {tools.map((section) => (
        <Box key={section.category}>
          <Typography
            variant="subtitle2"
            sx={{
              px: 2,
              py: 1,
              bgcolor: 'action.hover',
              color: 'text.secondary',
              fontWeight: 'medium'
            }}
          >
            {section.category}
          </Typography>
          <List>
            {section.items.map((tool) => (
              <ListItem key={tool.id} disablePadding>
                <ListItemButton
                  selected={selectedTool === tool.id}
                  onClick={() => onToolSelect(tool.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <SvgIcon 
                      viewBox="0 0 24 24"
                      sx={{
                        '& path': {
                          stroke: (tool as any).color || '#000',
                          strokeWidth: 2,
                          fill: tool.id === 'beam' || tool.id === 'pinned' ? '#000' : 'none',
                          strokeDasharray: (tool as any).strokeDashArray ? (tool as any).strokeDashArray.join(' ') : 'none'
                        }
                      }}
                    >
                      <path d={tool.icon} />
                    </SvgIcon>
                  </ListItemIcon>
                  <ListItemText 
                    primary={tool.name}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: '0.9rem'
                      }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
        </Box>
      ))}
    </Box>
  )
} 