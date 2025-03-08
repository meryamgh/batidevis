import React from 'react';
import '../../styles/Controls.css';

type RoomControlsProps = {
    is2DView: boolean;
    toggleView: () => void;
    creatingWallMode: boolean;
    setCreatingWallMode: (mode: boolean) => void;
    handleGenerateQuote: () => void;
};

const RoomControls: React.FC<RoomControlsProps> = ({
    is2DView,
    toggleView,
    creatingWallMode,
    setCreatingWallMode,
    handleGenerateQuote
}) => {
    return (
        <div className="room-controls">
            <button onClick={toggleView}>
                {is2DView ? 'Vue 3D' : 'Vue 2D'}
            </button>
            {is2DView && (
                <button
                    onClick={() => setCreatingWallMode(!creatingWallMode)}
                    className={creatingWallMode ? 'active' : ''}
                >
                    {creatingWallMode ? 'Arrêter création mur' : 'Créer mur'}
                </button>
            )}
            <button onClick={handleGenerateQuote}>
                Générer devis
            </button>
        </div>
    );
};

export default RoomControls; 