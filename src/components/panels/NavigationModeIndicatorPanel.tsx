import React, { useState } from 'react';
import '../../styles/NavigationCompact.css';

interface NavigationModeIndicatorProps {
    is2DView: boolean;
    isObjectOnlyView?: boolean;
    firstPersonView: boolean;
    navigationMode: 'orbit' | 'move';
    setNavigationMode: (value: React.SetStateAction<'orbit' | 'move'>) => void;
}

const NavigationModeIndicator: React.FC<NavigationModeIndicatorProps> = ({
    is2DView,
    isObjectOnlyView,
    firstPersonView,
    navigationMode,
    setNavigationMode
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Fonction pour gérer les mouvements de caméra
    const handleCameraMove = (direction: 'forward' | 'backward' | 'left' | 'right' | 'zoomIn' | 'zoomOut' | 'rotateLeft' | 'rotateRight' | 'rotateUp' | 'rotateDown') => {
        // Créer un événement personnalisé avec la direction
        console.log('handleCameraMove appelé avec direction:', direction);
        
        try {
            const event = new CustomEvent('cameraControl', { 
                detail: { 
                    direction,
                    mode: navigationMode
                } 
            });
            
            // Dispatcher l'événement pour qu'il soit capturé par le composant MoveControls
            window.dispatchEvent(event);
            console.log('Événement cameraControl dispatché avec succès');
        } catch (error) {
            console.error('Erreur lors du dispatch de l\'événement cameraControl:', error);
        }
    };

    if (is2DView || isObjectOnlyView || firstPersonView) return null;
    
    const isOrbitMode = navigationMode === 'orbit';
    
    return (
        <div className="navigation-mode-indicator-compact">
            <div className="nav-mode-toggle" onClick={() => setIsExpanded(!isExpanded)}>
                <span>{isExpanded ? "▼" : "▲"}</span>
            </div>
            
            {isExpanded && (
                <div className="nav-mode-label">
                    Mode: {isOrbitMode ? 'Orbite' : 'Déplacement'}
                    <button
                        onClick={() => setNavigationMode(prev => prev === 'orbit' ? 'move' : 'orbit')}
                        className="nav-mode-button"
                    >
                        Changer (N)
                    </button>
                </div>
            )}
            
            <div className="nav-controls-grid">
                {/* Rotation verticale haut */}
                <button 
                    className="nav-button rotate-button"
                    onClick={() => handleCameraMove('rotateUp')}
                    title="Rotation haut"
                >
                    ⬆
                </button>
                
                {/* Avancer */}
                <button 
                    className="nav-button move-button"
                    onClick={() => handleCameraMove('forward')}
                    title="Avancer"
                >
                    ▲
                </button>
                
                {/* Zoom in */}
                <button 
                    className="nav-button zoom-button"
                    onClick={() => handleCameraMove('zoomIn')}
                    title="Zoom +"
                >
                    +
                </button>
                
                {/* Rotation gauche */}
                <button 
                    className="nav-button rotate-button"
                    onClick={() => handleCameraMove('rotateLeft')}
                    title="Rotation gauche"
                >
                    ↺
                </button>
                
                {/* Mode */}
                <button
                    onClick={() => setNavigationMode(prev => prev === 'orbit' ? 'move' : 'orbit')}
                    className="nav-button mode-button"
                    title={isOrbitMode ? "Mode Orbite" : "Mode Déplacement"}
                >
                    {isOrbitMode ? "O" : "D"}
                </button>
                
                {/* Rotation droite */}
                <button 
                    className="nav-button rotate-button"
                    onClick={() => handleCameraMove('rotateRight')}
                    title="Rotation droite"
                >
                    ↻
                </button>
                
                {/* Gauche */}
                <button 
                    className="nav-button move-button"
                    onClick={() => handleCameraMove('left')}
                    title="Gauche"
                >
                    ◄
                </button>
                
                {/* Reculer */}
                <button 
                    className="nav-button move-button"
                    onClick={() => handleCameraMove('backward')}
                    title="Reculer"
                >
                    ▼
                </button>
                
                {/* Droite */}
                <button 
                    className="nav-button move-button"
                    onClick={() => handleCameraMove('right')}
                    title="Droite"
                >
                    ►
                </button>
                
                {/* Rotation verticale bas */}
                <button 
                    className="nav-button rotate-button"
                    onClick={() => handleCameraMove('rotateDown')}
                    title="Rotation bas"
                >
                    ⬇
                </button>
                
                {/* Zoom out */}
                <button 
                    className="nav-button zoom-button"
                    onClick={() => handleCameraMove('zoomOut')}
                    title="Zoom -"
                >
                    -
                </button>
            </div>
        </div>
    );
};

export default NavigationModeIndicator;