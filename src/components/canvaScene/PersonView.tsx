import React from 'react';
import '../../styles/PersonView.css';

interface PersonViewProps {
    rotateCamera: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

const PersonView: React.FC<PersonViewProps> = ({ rotateCamera }) => {
    return (
        <>
            <div className="person-view-instructions">
                Appuyez sur V pour sortir de la vue première personne<br/>
                Utilisez ZQSD ou les flèches pour vous déplacer<br/>
                Maintenez le clic gauche pour regarder autour de vous<br/>
                Molette de la souris pour zoomer/dézoomer<br/>
                Échap : libérer la souris
            </div>
            <div className="person-view-controls">
                {/* Rotation vers le haut */}
                <div style={{ gridColumn: '2/3' }}>
                    <button
                        onClick={() => rotateCamera('up')}
                        className="control-button"
                    >
                        ↑
                    </button>
                </div>
                {/* Rotation gauche */}
                <div>
                    <button
                        onClick={() => rotateCamera('left')}
                        className="control-button"
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
                        className="control-button"
                    >
                        →
                    </button>
                </div>
                {/* Rotation vers le bas */}
                <div style={{ gridColumn: '2/3' }}>
                    <button
                        onClick={() => rotateCamera('down')}
                        className="control-button"
                    >
                        ↓
                    </button>
                </div>
            </div>
        </>
    );
};

export default PersonView; 