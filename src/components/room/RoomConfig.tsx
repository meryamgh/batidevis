import React from 'react';
import '../../styles/Controls.css';

type RoomConfigProps = {
    roomConfig: {
        width: number;
        length: number;
        height: number;
    };
    setRoomConfig: (config: { width: number; length: number; height: number; }) => void;
    onGenerate: () => void;
    onClose: () => void;
};

const RoomConfig: React.FC<RoomConfigProps> = ({ roomConfig, setRoomConfig, onGenerate, onClose }) => {
    return (
        <div className="room-config-panel">
            <h3>Configuration de la pièce</h3>
            <div>
                <label>Largeur (m): </label>
                <input 
                    type="number" 
                    value={roomConfig.width} 
                    onChange={(e) => setRoomConfig({ ...roomConfig, width: Number(e.target.value) })}
                    min="1"
                    step="0.5"
                />
            </div>
            <div>
                <label>Longueur (m): </label>
                <input 
                    type="number" 
                    value={roomConfig.length} 
                    onChange={(e) => setRoomConfig({ ...roomConfig, length: Number(e.target.value) })}
                    min="1"
                    step="0.5"
                />
            </div>
            <div>
                <label>Hauteur (m): </label>
                <input 
                    type="number" 
                    value={roomConfig.height} 
                    onChange={(e) => setRoomConfig({ ...roomConfig, height: Number(e.target.value) })}
                    min="1"
                    step="0.5"
                />
            </div>
            <div className="surface-info">
                <strong>Surface totale:</strong> {(roomConfig.width * roomConfig.length).toFixed(2)} m²
            </div>
            <div className="room-config-buttons">
                <button onClick={onGenerate}>Créer la pièce</button>
                <button onClick={onClose}>Annuler</button>
            </div>
        </div>
    );
};

export default RoomConfig; 