import React from 'react';
import { startDraggingPanel } from '../utils/panelUtils.js';
import '../styles/MainPage.css';
import '../styles/Controls.css';

type DevisMainPagePanelProps = {
    onAddObject: (url: string) => void;
};

const DevisMainPagePanel: React.FC<DevisMainPagePanelProps> = ({ onAddObject }) => {
    return (
        <div className="left-panel">
            <button onClick={() => onAddObject('/wall_with_door.gltf')}>
                Add Object 1
            </button>
            <button onClick={() => onAddObject('/porte_fenetre.gltf')}>
                Add Object 2
            </button>

            <div id="floating-panel" className="floating-panel" onMouseDown={(e) => startDraggingPanel(e)}></div>
        </div>
    );
};

export default DevisMainPagePanel;
