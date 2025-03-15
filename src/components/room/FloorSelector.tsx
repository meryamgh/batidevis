import React from 'react';
import '../../styles/Controls.css';

interface FloorSelectorProps {
    currentFloor: number;
    selectedFloor2D: number;
    setSelectedFloor2D: React.Dispatch<React.SetStateAction<number>>;
    is2DView: boolean;
}

const FloorSelector: React.FC<FloorSelectorProps> = ({
    currentFloor,
    selectedFloor2D,
    setSelectedFloor2D,
    is2DView
}) => {
    if (!is2DView || currentFloor === 0) return null;

    return (
        <div className="floor-selector" style={{
            position: 'absolute',
            top: '80px',
            right: '20px',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '5px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            zIndex: 1000
        }}>
            <label style={{ marginRight: '10px' }}>Étage à visualiser:</label>
            <select 
                value={selectedFloor2D}
                onChange={(e) => setSelectedFloor2D(Number(e.target.value))}
                style={{
                    padding: '5px',
                    borderRadius: '3px'
                }}
            >
                {Array.from({ length: currentFloor + 1 }, (_, i) => (
                    <option key={i} value={i}>
                        {i === 0 ? 'Rez-de-chaussée' : `Étage ${i}`}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default FloorSelector; 