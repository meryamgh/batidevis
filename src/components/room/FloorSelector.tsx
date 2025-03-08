import React from 'react';
import '../../styles/Controls.css';

type FloorSelectorProps = {
    currentFloor: number;
    selectedFloor2D: number;
    setSelectedFloor2D: (floor: number) => void;
    addNewFloor: () => void;
};

const FloorSelector: React.FC<FloorSelectorProps> = ({
    currentFloor,
    selectedFloor2D,
    setSelectedFloor2D,
    addNewFloor
}) => {
    return (
        <div className="floor-selector">
            <h3>Sélection de l'étage</h3>
            <div className="floor-buttons">
                {Array.from({ length: currentFloor + 1 }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => setSelectedFloor2D(i)}
                        className={selectedFloor2D === i ? 'selected' : ''}
                    >
                        {i === 0 ? 'Rez-de-chaussée' : `Étage ${i}`}
                    </button>
                ))}
                <button onClick={addNewFloor} className="add-floor">
                    + Ajouter un étage
                </button>
            </div>
        </div>
    );
};

export default FloorSelector; 