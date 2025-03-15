import React from 'react';

interface PersonViewProps {
    rotateCamera: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

const PersonView: React.FC<PersonViewProps> = ({ rotateCamera }) => {
    return (
        <>
            <div style={{
                position: 'fixed',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '10px',
                borderRadius: '5px',
                zIndex: 1000
            }}>
                Appuyez sur V pour sortir de la vue première personne<br/>
                Utilisez ZQSD ou les flèches pour vous déplacer<br/>
                Maintenez le clic gauche pour regarder autour de vous<br/>
                Molette de la souris pour zoomer/dézoomer<br/>
                Échap : libérer la souris
            </div>
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 40px)',
                gap: '5px',
                zIndex: 1000
            }}>
                {/* Rotation vers le haut */}
                <div style={{ gridColumn: '2/3' }}>
                    <button
                        onClick={() => rotateCamera('up')}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '5px',
                            border: 'none',
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ↑
                    </button>
                </div>
                {/* Rotation gauche */}
                <div>
                    <button
                        onClick={() => rotateCamera('left')}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '5px',
                            border: 'none',
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ←
                    </button>
                </div>
                {/* Case du milieu vide */}
                <div></div>
                {/* Rotation droite */}
                <div>
                    <button
                        onClick={() => rotateCamera('right')}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '5px',
                            border: 'none',
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        →
                    </button>
                </div>
                {/* Rotation vers le bas */}
                <div style={{ gridColumn: '2/3' }}>
                    <button
                        onClick={() => rotateCamera('down')}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '5px',
                            border: 'none',
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ↓
                    </button>
                </div>
            </div>
        </>
    );
};

export default PersonView; 