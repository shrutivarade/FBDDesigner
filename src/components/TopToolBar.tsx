import React from 'react';
import CursorIcon from '../assets/Cursor.svg';
import RectIcon from '../assets/Rect.svg';
import CircleIcon from '../assets/Circle.svg';
import LineIcon from '../assets/Line.svg';
import ArrowIcon from '../assets/Arrow.svg';
import PencilIcon from '../assets/PencilSVG.svg';
import TextIcon from '../assets/Text.svg';

interface TopToolBarProps {
  selectedTool: string | null;
  onToolSelect: (tool: string) => void;
}

const TopToolBar: React.FC<TopToolBarProps> = ({ selectedTool, onToolSelect }) => {
  return (
    <div className="top-toolbar">
      <div className="toolbar-container">
        <button
          className={`tool-button ${selectedTool === 'select' ? 'active' : ''}`}
          onClick={() => onToolSelect('select')}
          title="Select Tool"
        >
          <img src={CursorIcon} alt="Select" />
        </button>
        <button
          className={`tool-button ${selectedTool === 'rectangle' ? 'active' : ''}`}
          onClick={() => onToolSelect(selectedTool === 'rectangle' ? 'select' : 'rectangle')}
          title="Rectangle Tool"
        >
          <img src={RectIcon} alt="Rectangle" />
        </button>
        <button
          className={`tool-button ${selectedTool === 'circle' ? 'active' : ''}`}
          onClick={() => onToolSelect(selectedTool === 'circle' ? 'select' : 'circle')}
          title="Circle Tool"
        >
          <img src={CircleIcon} alt="Circle" />
        </button>
        <button
          className={`tool-button ${selectedTool === 'line' ? 'active' : ''}`}
          onClick={() => onToolSelect(selectedTool === 'line' ? 'select' : 'line')}
          title="Line Tool"
        >
          <img src={LineIcon} alt="Line" />
        </button>
        <button
          className={`tool-button ${selectedTool === 'arrow' ? 'active' : ''}`}
          onClick={() => onToolSelect(selectedTool === 'arrow' ? 'select' : 'arrow')}
          title="Arrow Tool"
        >
          <img src={ArrowIcon} alt="Arrow" />
        </button>
        <button
          className={`tool-button ${selectedTool === 'pencil' ? 'active' : ''}`}
          onClick={() => onToolSelect(selectedTool === 'pencil' ? 'select' : 'pencil')}
          title="Pencil Tool"
        >
          <img src={PencilIcon} alt="Pencil" />
        </button>
        <button
          className={`tool-button ${selectedTool === 'text' ? 'active' : ''}`}
          onClick={() => onToolSelect(selectedTool === 'text' ? 'select' : 'text')}
          title="Text Tool"
        >
          <img src={TextIcon} alt="Text" />
        </button>
      </div>
    </div>
  );
};

export default TopToolBar;