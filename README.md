# FBD Designer

A React application built with Vite, Material UI, and Rough.js for creating hand-drawn style diagrams and drawings.

## Features

- **React 19** with TypeScript for modern component development
- **Vite** for fast development and building
- **Material UI** for beautiful, responsive UI components
- **Rough.js** for hand-drawn style graphics and sketching
- Interactive drawing canvas with multiple tools
- Customizable stroke width and roughness settings
- Modern, clean interface with Material Design

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the local development URL (usually `http://localhost:5173`)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run type-check` - Run TypeScript type checking
- `npm run preview` - Preview production build
- `npm run commit` - Interactive commit with conventional format
- `npm run commit:retry` - Retry commit if previous failed

## Technologies Used

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Material UI** - Component library
- **Rough.js** - Hand-drawn style graphics
- **Emotion** - CSS-in-JS styling

## Drawing Tools

The application includes:
- **Rectangle Tool** - Draw rectangles by clicking and dragging
- **Circle Tool** - Draw circles with radius based on drag distance
- **Line Tool** - Draw straight lines
- **Stroke Width Control** - Adjust line thickness (1-10px)
- **Roughness Control** - Adjust the hand-drawn style (0-5)
- **Clear Canvas** - Reset the drawing area

## Usage

1. Select a drawing tool (Rectangle, Circle, or Line)
2. Adjust stroke width and roughness using the sliders
3. Click and drag on the canvas to draw
4. Use "Clear Canvas" to start over

## Project Structure

```
src/
├── App.tsx          # Main application component
├── main.tsx         # Application entry point
├── index.css        # Global styles
└── assets/          # Static assets
```

## Commit Standards

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification. Please use the interactive commit tool for properly formatted commit messages:

```bash
npm run commit
```

See [COMMIT_STANDARDS.md](./COMMIT_STANDARDS.md) for detailed guidelines.

### Git Hooks

- **Pre-commit**: Runs ESLint and TypeScript type checking
- **Commit-msg**: Validates commit message format

## License

MIT License
