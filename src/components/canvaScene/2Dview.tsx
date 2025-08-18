import React from 'react';
import '../../styles/2Dview.css';

interface TwoDViewProps {
    setZoom2D: (value: React.SetStateAction<number>) => void;
    setShowAllDimensions: (value: React.SetStateAction<boolean>) => void;
    showAllDimensions: boolean;
}

const TwoDView: React.FC<TwoDViewProps> = ({
    setZoom2D,
    setShowAllDimensions,
    showAllDimensions
}) => {
    return (
        <div className="two-d-view-container">
            <div className="zoom-controls">
                <button
                    onClick={() => setZoom2D(prev => Math.min(prev - 10, 200))}
                    className="zoom-button zoom-in"
                >
                    +
                </button>
                <button
                    onClick={() => setZoom2D(prev => Math.max(prev + 10, 50))}
                    className="zoom-button zoom-out"
                >
                    -
                </button>
            </div>
            <button
                onClick={() => setShowAllDimensions(!showAllDimensions)}
                className={`dimensions-button ${showAllDimensions ? 'show' : 'hide'}`}
            >
                {showAllDimensions ? 'Masquer dimensions' : 'Afficher dimensions'}
            </button>
        </div>
    );
};

export default TwoDView; 