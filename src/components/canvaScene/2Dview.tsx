import React from 'react';

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
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '20px',
            zIndex: 1000,
            display: 'flex',
            gap: '10px'
        }}>
            <div style={{
                display: 'flex',
                gap: '5px',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '5px',
                borderRadius: '4px'
            }}>
                <button
                    onClick={() => setZoom2D(prev => Math.min(prev - 10, 200))}
                    style={{
                        padding: '8px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        width: '40px',
                        height: '40px'
                    }}
                >
                    +
                </button>
                <button
                    onClick={() => setZoom2D(prev => Math.max(prev + 10, 50))}
                    style={{
                        padding: '8px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        width: '40px',
                        height: '40px'
                    }}
                >
                    -
                </button>
            </div>
            <button
                onClick={() => setShowAllDimensions(!showAllDimensions)}
                style={{
                    padding: '8px 16px',
                    backgroundColor: showAllDimensions ? '#4CAF50' : '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}
            >
                {showAllDimensions ? 'Masquer dimensions' : 'Afficher dimensions'}
            </button>
        </div>
    );
};

export default TwoDView; 