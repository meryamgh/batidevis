import React, { useState, useEffect } from 'react';
import { ObjectData } from '../types/ObjectData';
import '../styles/Controls.css';

type ObjectPanelProps = {
    object: ObjectData;
    onUpdateTexture: (id: string, newTexture: string) => void;
    onUpdateScale: (id: string, newScale: [number, number, number]) => void;
    onRemoveObject: (id: string) => void;
    onMoveObject: () => void;
    onClosePanel: () => void;
    onRotateObject: (id: string, newRotation: [number, number, number]) => void;
    onToggleShowDimensions: (id: string) => void; 
};

const ObjectPanel: React.FC<ObjectPanelProps> = ({
    object,
    onUpdateTexture,
    onUpdateScale,
    onRemoveObject,
    onMoveObject,
    onClosePanel,
    onRotateObject,
    onToggleShowDimensions,
}) => {
    const [width, setWidth] = useState(object.scale[0]);
    const [height, setHeight] = useState(object.scale[1]);
    const [depth, setDepth] = useState(object.scale[2]);
    const [texture, setTexture] = useState(object.texture);
    const [rotation, setRotation] = useState<[number, number, number]>(object.rotation || [0, 0, 0]);
    const [isRotating, setIsRotating] = useState(false);
    const [showDimensions, setShowDimensions] = useState(false);

    const toggleDimensions = () => {
        onToggleShowDimensions(object.id);  
        setShowDimensions(!showDimensions);
    };

    // Ensure the local state stays in sync with the incoming props
    useEffect(() => {
        setWidth(object.scale[0]);
        setHeight(object.scale[1]);
        setDepth(object.scale[2]);
        setRotation(object.rotation || [0, 0, 0]);
    }, [object.scale, object.rotation]);

    useEffect(() => {
        setTexture(object.texture);
    }, [object.texture]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isRotating) {
                const deltaX = e.movementX;
                const deltaY = e.movementY;

                const rotationSpeed = 0.01; // Reduce rotation speed for smoother movement
                const newRotation: [number, number, number] = [
                    rotation[0] - deltaY * rotationSpeed, // Rotate up/down with Y movement
                    rotation[1] + deltaX * rotationSpeed, // Rotate left/right with X movement
                    rotation[2],
                ];

                setRotation(newRotation);
                onRotateObject(object.id, newRotation);
            }
        };

        const handleMouseClick = () => {
            if (isRotating) {
                setIsRotating(false);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseClick);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseClick);
        };
    }, [isRotating, rotation, onRotateObject, object.id]);

    const handleUpdateScale = (newWidth: number, newHeight: number, newDepth: number) => {
        onUpdateScale(object.id, [newWidth, newHeight, newDepth]);
    };

    const toggleRotation = () => {
        setIsRotating(!isRotating);
    };

    return (
        <div className="object-panel">
            <div className='close'>
                <button className='bouton-close' onClick={onClosePanel}>x</button>
            </div>
            <div className='title_popup'>
                <p className='modif'>modification de l'objet</p>
            </div>
            <p className='texte'>{object.details}</p>
            <div className='container-label'>
                <label className='titre-label'>texture</label>
                <div className="texture-selector">
                    {[
                        { value: "textures/Cube_BaseColor.png", label: "Cube BaseColor" },
                        { value: "textures/concrete_texture.jpg", label: "Concrete" },
                        { value: "textures/Bricks085_1K-PNG_Color.png", label: "Bricks" },
                        { value: "textures/Wood052_1K-PNG_Color.png", label: "Wood" },

                        { value: "textures/Wood052_1K-PNG_Displacement.png", label: "Cube BaseColor" },
                        { value: "textures/Wood052_1K-PNG_Roughness.png", label: "Concrete" }
                    ].map((textureOption) => (
                        <div 
                            key={textureOption.value}
                            className={`texture-option ${texture === textureOption.value ? 'selected' : ''}`}
                            onClick={() => {
                                setTexture(textureOption.value);
                                onUpdateTexture(object.id, textureOption.value);
                            }}
                        >
                            <img 
                                src={textureOption.value} 
                                alt={textureOption.label}
                                className="texture-preview"
                            />
                            <span>{textureOption.label}</span>
                        </div>
                    ))}
                </div>
                <br /><br />
                <label className='titre-label'>largeur</label>
                <input className='selection'
                    type="number"
                    step="0.1"
                    value={width}
                    onChange={(e) => {
                        const newWidth = parseFloat(e.target.value) || 0;
                        setWidth(newWidth);
                        handleUpdateScale(newWidth, height, depth);
                        onUpdateScale(object.id, [newWidth, height, depth]);
                    }}
                    onBlur={() => handleUpdateScale(width, height, depth)}
                />
                <br /><br />
                <label className='titre-label'>hauteur</label>
                <input className='selection'
                    type="number"
                    step="0.1"
                    value={height}
                    onChange={(e) => {
                        const newHeight = parseFloat(e.target.value) || 0;
                        setHeight(newHeight);
                        handleUpdateScale(width, newHeight, depth);
                        onUpdateScale(object.id, [width, newHeight, depth]);
                    }}
                    onBlur={() => handleUpdateScale(width, height, depth)}
                />
                <br /><br />
                <label className='titre-label'>profondeur</label>
                <input className='selection'
                    type="number"
                    step="0.1"
                    value={depth}
                    onChange={(e) => {
                        const newDepth = parseFloat(e.target.value) || 0;
                        setDepth(newDepth);
                        handleUpdateScale(width, height, newDepth);
                        onUpdateScale(object.id, [width, height, newDepth]);
                    }}
                    onBlur={() => handleUpdateScale(width, height, depth)}
                />
            </div>
            <br />
            <p><strong>Prix:</strong> {object.price} €</p>

            <div className='bouton-container'>
                <button onClick={() => {
                    onRemoveObject(object.id);  // Supprimer l'objet
                    onClosePanel();             // Fermer le panneau
                }} className='bouton-popup'>supprimer</button>
                <button onClick={onMoveObject} className='bouton-popup'>déplacer</button>
            </div>
            <div className='bouton-container'>
                <button className='bouton-popup'
                    onClick={() => {
                        // Rotate the object by 90 degrees around all axes
                        const newRotation: [number, number, number] = [
                            rotation[0] + Math.PI / 2,
                            rotation[1] + Math.PI / 2,
                            rotation[2] + Math.PI / 2,
                        ];
                        setRotation(newRotation); // Update local state
                        onRotateObject(object.id, newRotation); // Call the handler
                    }}
                >
                    faire pivoter de 90°
                </button>
                <button className='bouton-popup'
                    onClick={toggleRotation}
                >
                    {isRotating ? 'arrêter la rotation' : 'pivoter avec la souris'}
                </button>
            </div>
            <button className='bouton-popup-last-last' onClick={() => toggleDimensions()}>
                {showDimensions ? 'masquer les dimensions' : 'afficher les dimensions'}
            </button>
        </div>

    );
};

export default ObjectPanel;
