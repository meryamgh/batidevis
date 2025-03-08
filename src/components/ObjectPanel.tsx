import React, { useState, useEffect } from 'react';
import { ObjectData } from '../types/ObjectData';
import '../styles/Controls.css';

type ObjectPanelProps = {
    object: ObjectData;
    onUpdateTexture: (id: string, newTexture: string) => void;
    onUpdateScale: (id: string, newScale: [number, number, number]) => void;
    onUpdatePosition: (id: string, position: [number, number, number]) => void;
    onRemoveObject: (id: string) => void;
    onMoveObject: () => void;
    onClosePanel: () => void;
    onRotateObject: (id: string, newRotation: [number, number, number]) => void;
    onToggleShowDimensions: (id: string) => void;
    customTextures: Record<string, string>;
};

const ObjectPanel: React.FC<ObjectPanelProps> = ({
    object,
    onUpdateTexture,
    onUpdateScale,
    onUpdatePosition,
    onRemoveObject,
    onMoveObject,
    onClosePanel,
    onRotateObject,
    onToggleShowDimensions,
    customTextures,
}) => {
    const [width, setWidth] = useState(object.scale[0]);
    const [height, setHeight] = useState(object.scale[1]);
    const [depth, setDepth] = useState(object.scale[2]);
    const [texture, setTexture] = useState(object.texture);
    const [rotation, setRotation] = useState<[number, number, number]>(object.rotation || [0, 0, 0]);
    const [isRotating, setIsRotating] = useState(false);
    const [showDimensions, setShowDimensions] = useState(false);
    const [position, setPosition] = useState<[number, number, number]>(object.position);
    const [curvature, setCurvature] = useState(0);
    const [stretch, setStretch] = useState(1);
    const [selectedAxis, setSelectedAxis] = useState<'x' | 'y' | 'z'>('y');

    const toggleDimensions = () => {
        onToggleShowDimensions(object.id);
        setShowDimensions(!showDimensions);
    };

    useEffect(() => {
        setWidth(object.scale[0]);
        setHeight(object.scale[1]);
        setDepth(object.scale[2]);
        setRotation(object.rotation || [0, 0, 0]);
        setPosition(object.position);
    }, [object.scale, object.rotation, object.position]);

    useEffect(() => {
        setTexture(object.texture);
    }, [object.texture]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isRotating) {
                const deltaX = e.movementX;
                const deltaY = e.movementY;
                const rotationSpeed = 0.01;
                const newRotation: [number, number, number] = [
                    rotation[0] - deltaY * rotationSpeed,
                    rotation[1] + deltaX * rotationSpeed,
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

    const handleUpdatePosition = (axis: 'x' | 'y' | 'z', value: number) => {
        const newPosition: [number, number, number] = [...position];
        const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
        newPosition[axisIndex] = value;
        setPosition(newPosition);
        onUpdatePosition(object.id, newPosition);
    };

    const toggleRotation = () => {
        setIsRotating(!isRotating);
    };

    // Empêcher la propagation des événements pour les contrôles de type range
    const handleRangeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
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

            {/* Section Dimensions */}
            <div className="panel-section">
                <h3 className="section-title">Dimensions</h3>
                <div className='container-label'>
                    <label className='titre-label'>largeur</label>
                    <input className='selection'
                        type="number"
                        step="0.1"
                        value={width}
                        onChange={(e) => {
                            const newWidth = parseFloat(e.target.value) || 0;
                            setWidth(newWidth);
                            handleUpdateScale(newWidth, height, depth);
                        }}
                    />
                </div>
                <div className='container-label'>
                    <label className='titre-label'>hauteur</label>
                    <input className='selection'
                        type="number"
                        step="0.1"
                        value={height}
                        onChange={(e) => {
                            const newHeight = parseFloat(e.target.value) || 0;
                            setHeight(newHeight);
                            handleUpdateScale(width, newHeight, depth);
                        }}
                    />
                </div>
                <div className='container-label'>
                    <label className='titre-label'>profondeur</label>
                    <input className='selection'
                        type="number"
                        step="0.1"
                        value={depth}
                        onChange={(e) => {
                            const newDepth = parseFloat(e.target.value) || 0;
                            setDepth(newDepth);
                            handleUpdateScale(width, height, newDepth);
                        }}
                    />
                </div>
            </div>

            {/* Section Position */}
            <div className="panel-section">
                <h3 className="section-title">Position</h3>
                <div className="axis-selector">
                    <button 
                        className={`axis-button ${selectedAxis === 'x' ? 'selected' : ''}`}
                        onClick={() => setSelectedAxis('x')}
                    >
                        X
                    </button>
                    <button 
                        className={`axis-button ${selectedAxis === 'y' ? 'selected' : ''}`}
                        onClick={() => setSelectedAxis('y')}
                    >
                        Y
                    </button>
                    <button 
                        className={`axis-button ${selectedAxis === 'z' ? 'selected' : ''}`}
                        onClick={() => setSelectedAxis('z')}
                    >
                        Z
                    </button>
                </div>
                <div className="deformation-group">
                    <input
                        type="range"
                        min="-10"
                        max="10"
                        step="0.1"
                        value={position[selectedAxis === 'x' ? 0 : selectedAxis === 'y' ? 1 : 2]}
                        onChange={(e) => handleUpdatePosition(selectedAxis, parseFloat(e.target.value))}
                        className="position-slider"
                        onMouseDown={handleRangeMouseDown}
                    />
                    <span className="deformation-value">
                        {position[selectedAxis === 'x' ? 0 : selectedAxis === 'y' ? 1 : 2].toFixed(1)}
                    </span>
                </div>
            </div>

            {/* Section Déformation */}
            <div className="panel-section">
                <h3 className="section-title">Déformation</h3>
                <div className="deformation-controls">
                    <div className="deformation-group">
                        <label>Courbure</label>
                        <span className="deformation-value">{curvature.toFixed(1)}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={curvature}
                        onChange={(e) => setCurvature(parseFloat(e.target.value))}
                        className="deformation-slider"
                        onMouseDown={handleRangeMouseDown}
                    />
                    <div className="deformation-group">
                        <label>Étirement</label>
                        <span className="deformation-value">{stretch.toFixed(1)}</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={stretch}
                        onChange={(e) => setStretch(parseFloat(e.target.value))}
                        className="deformation-slider"
                        onMouseDown={handleRangeMouseDown}
                    />
                </div>
            </div>

            {/* Section Texture */}
            <div className="panel-section">
                <h3 className="section-title">Texture</h3>
                <div className="texture-selector">
                    {[
                        { value: "textures/Cube_BaseColor.png", label: "Cube BaseColor" },
                        { value: "textures/concrete_texture.jpg", label: "Concrete" },
                        { value: "textures/Bricks085_1K-PNG_Color.png", label: "Bricks" },
                        { value: "textures/Wood052_1K-PNG_Color.png", label: "Wood" },
                        { value: "textures/Wood052_1K-PNG_Displacement.png", label: "Wood Displacement" },
                        { value: "textures/Wood052_1K-PNG_Roughness.png", label: "Wood Roughness" },
                        ...Object.entries(customTextures).map(([name, url]) => ({
                            value: url,
                            label: name.replace(/\.[^/.]+$/, "")
                        }))
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
            </div>

            <p><strong>Prix:</strong> {object.price} €</p>

            <div className="button-section">
                <div className='bouton-container'>
                    <button onClick={() => {
                        onRemoveObject(object.id);
                        onClosePanel();
                    }} className='bouton-popup'>supprimer</button>
                    <button onClick={onMoveObject} className='bouton-popup'>déplacer</button>
                </div>
                <div className='bouton-container'>
                    <button className='bouton-popup'
                        onClick={() => {
                            const newRotation: [number, number, number] = [
                                rotation[0] + Math.PI / 2,
                                rotation[1] + Math.PI / 2,
                                rotation[2] + Math.PI / 2,
                            ];
                            setRotation(newRotation);
                            onRotateObject(object.id, newRotation);
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
                <button className='bouton-popup-last-last' onClick={toggleDimensions}>
                    {showDimensions ? 'masquer les dimensions' : 'afficher les dimensions'}
                </button>
            </div>
        </div>
    );
};

export default ObjectPanel;
