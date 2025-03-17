import React, { useState, useEffect } from 'react';
import { ObjectData } from '../../types/ObjectData';
import '../../styles/Controls.css';
import { useTextures } from '../../services/TextureService';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';

type ObjectPanelProps = {
    object: ObjectData;
    onUpdateTexture: (id: string, newTexture: string) => void;
    onUpdateColor: (id: string, newColor: string) => void;
    onUpdateScale: (id: string, newScale: [number, number, number]) => void;
    onUpdatePosition: (id: string, position: [number, number, number]) => void;
    onRemoveObject: (id: string) => void;
    onMoveObject: () => void;
    onClosePanel: () => void;
    onRotateObject: (id: string, newRotation: [number, number, number]) => void;
    onToggleShowDimensions: (id: string) => void;
    customTextures: Record<string, string>;
    onUpdateRoomDimensions?: (floorId: string, width: number, length: number, height: number) => void;
    onDeselectObject: (id: string) => void;
    onAddObject: (object: ObjectData) => void;
};

const ObjectPanel: React.FC<ObjectPanelProps> = ({
    object,
    onUpdateTexture,
    onUpdateColor,
    onUpdateScale,
    onUpdatePosition,
    onRemoveObject,
    onMoveObject,
    onClosePanel,
    onRotateObject,
    onToggleShowDimensions,
    customTextures,
    onUpdateRoomDimensions,
    onDeselectObject,
    onAddObject,
}) => {
    const [width, setWidth] = useState(object.scale[0]);
    const [height, setHeight] = useState(object.scale[1]);
    const [depth, setDepth] = useState(object.scale[2]);
    const [texture, setTexture] = useState(object.texture);
    const [color, setColor] = useState<string | undefined>(object.color);
    const [rotation, setRotation] = useState<[number, number, number]>(object.rotation || [0, 0, 0]);
    const [isRotating, setIsRotating] = useState(false);
    const [showDimensions, setShowDimensions] = useState(false);
    const [position, setPosition] = useState<[number, number, number]>(object.position);
    const [curvature, setCurvature] = useState(0);
    const [stretch, setStretch] = useState(1);
    const [selectedAxis, setSelectedAxis] = useState<'x' | 'y' | 'z'>('y');
    
    // États pour les dimensions de la pièce
    const [roomWidth, setRoomWidth] = useState(object.scale[0]);
    const [roomLength, setRoomLength] = useState(object.scale[2]);
    const [roomHeight, setRoomHeight] = useState(3); // Valeur par défaut
    
    // Vérifier si l'objet est un sol ou un mur
    const isFloor = object.details.includes('Sol');
    const isWall = object.details.includes('Mur');
    const isRoomComponent = isFloor || isWall;
    
    // Utilisation du hook personnalisé pour récupérer les textures
    const { textures: apiTextures, isLoading: isLoadingTextures, error: texturesError } = useTextures();

    // Styles pour le bouton "Aucune couleur"
    const noColorButtonStyle = {
        marginTop: '10px',
        padding: '8px 16px',
        backgroundColor: '#f0f0f0',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'center' as const,
    };

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
        
        // Mettre à jour les dimensions de la pièce si c'est un sol
        if (isFloor) {
            setRoomWidth(object.scale[0]);
            setRoomLength(object.scale[2]);
            
            // Essayer de trouver un mur associé pour obtenir la hauteur
            const floorNumberMatch = object.details.match(/Étage (\d+)/);
            const floorNumber = floorNumberMatch ? parseInt(floorNumberMatch[1]) : 0;
            const floorLabel = floorNumber === 0 ? 'Rez-de-chaussée' : `Étage ${floorNumber}`;
            
            // Stocker la hauteur actuelle pour une utilisation ultérieure
            setRoomHeight(3); // Valeur par défaut si on ne peut pas déterminer
        }
    }, [object.scale, object.rotation, object.position, isFloor]);

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
        
        // Vérifier si l'objet est une fenêtre ou une porte
        const isWindowOrDoor = object.details === 'Fenêtre' || object.details === 'Porte';
        
        if (isWindowOrDoor) {
            // Calculer les limites en fonction des dimensions du mur parent
            // Pour un mur vertical, la hauteur est sur l'axe Y et la largeur sur l'axe X
            const wallWidth = object.parentScale?.[0] || 1;  // Largeur du mur
            const wallHeight = object.parentScale?.[1] || 1; // Hauteur du mur
            
            // Définir les limites de déplacement
            let minLimit = 0;
            let maxLimit = 0;
            
            if (axis === 'x') {
                // Limite le déplacement horizontal à la largeur du mur
                minLimit = -wallWidth / 4;
                maxLimit = wallWidth / 4;
            } else if (axis === 'y') {
                // Limite le déplacement vertical à la hauteur du mur
                minLimit = -wallHeight / 4;
                maxLimit = wallHeight / 4;
            } else if (axis === 'z') {
                // Pour la profondeur, on limite à une petite valeur pour rester sur le mur
                minLimit = -0.1;
                maxLimit = 0.1;
            }
            
            // Contraindre la valeur dans les limites
            value = Math.max(minLimit, Math.min(maxLimit, value));
        }
        
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

    // Styles pour le séparateur de textures
    const textureDividerStyle = {
        width: '100%',
        height: '1px',
        backgroundColor: '#ccc',
        margin: '10px 0',
    };

    // Fonction pour appliquer une texture
    const applyTexture = (textureUrl: string) => {
        setTexture(textureUrl);
        onUpdateTexture(object.id, textureUrl);
    };

    // Fonction pour appliquer une couleur
    const applyColor = (colorValue: string) => {
        setColor(colorValue);
        onUpdateColor(object.id, colorValue);
    };

    // Fonction pour gérer les erreurs de chargement d'image
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = e.target as HTMLImageElement;
        target.src = "textures/Cube_BaseColor.png"; 
        target.onerror = null; // Éviter les boucles infinies
    };

    // Fonction pour mettre à jour les dimensions de la pièce
    const handleUpdateRoomDimensions = () => {
        alert("test");
        if (onUpdateRoomDimensions && isFloor) {
            onUpdateRoomDimensions(object.id, roomWidth, roomLength, roomHeight);
        }
    };

    const handleAddWindow = () => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: '#FFFFFF' });
        const mesh = new THREE.Mesh(geometry, material);

        const newWindow: ObjectData = {
            id: uuidv4(),
            url: 'http://127.0.0.1:5000/files/fenêtre.gltf',
            price: 200,
            details: 'Fenêtre',
            position: [
                object.position[0],
                object.position[1],
                object.position[2]
            ],
            gltf: mesh,
            rotation: object.rotation,
            scale: [1, 1, 1],
            color: '#FFFFFF',
            parentScale: object.scale
        };
        onAddObject(newWindow);
    };

    const handleAddDoor = () => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: '#8B4513' });
        const mesh = new THREE.Mesh(geometry, material);

        const newDoor: ObjectData = {
            id: uuidv4(),
            url: 'http://127.0.0.1:5000/files/porte.gltf',
            price: 500,
            details: 'Porte',
            position: [
                object.position[0],
                object.position[1],
                object.position[2]
            ],
            gltf: mesh,
            rotation: object.rotation,
            scale: [1, 1, 1],
            color: '#8B4513',
            parentScale: object.scale
        };
        onAddObject(newDoor);
    };

    return (
        <div className="object-panel">
            <div className='close'>
                <button className='bouton-close' onClick={() => {
                    onDeselectObject(object.id);
                    onClosePanel();
                }}>x</button>
            </div>
            <div className='title_popup'>
                <p className='modif'>modification de l'objet</p>
            </div>
            <p className='texte'>{object.details}</p>

            {isRoomComponent && onUpdateRoomDimensions && (
                <div className="room-dimensions-section">
                    <h4>Dimensions de la pièce</h4>
                    <div className="dimension-control">
                        <label>Largeur (m): </label>
                        <input 
                            type="number" 
                            value={roomWidth} 
                            onChange={(e) => setRoomWidth(Number(e.target.value))}
                            min="1"
                            step="0.5"
                        />
                    </div>
                    <div className="dimension-control">
                        <label>Longueur (m): </label>
                        <input 
                            type="number" 
                            value={roomLength} 
                            onChange={(e) => setRoomLength(Number(e.target.value))}
                            min="1"
                            step="0.5"
                        />
                    </div>
                    <div className="dimension-control">
                        <label>Hauteur (m): </label>
                        <input 
                            type="number" 
                            value={roomHeight} 
                            onChange={(e) => setRoomHeight(Number(e.target.value))}
                            min="1"
                            step="0.5"
                        />
                    </div>
                    <div className="dimension-info">
                        <strong>Surface totale:</strong> {(roomWidth * roomLength).toFixed(2)} m²
                    </div>
                    {isFloor && (
                        <button 
                            onClick={handleUpdateRoomDimensions}
                            className="update-room-button"
                    >
                            Mettre à jour la pièce
                        </button>
                    )}
                </div>
            )}

            {(!isRoomComponent || isWall || isFloor) && (
                <>
                    <div className="panel-section">
                        <h3 className="section-title">Dimensions</h3>
                        <div className='container-label'>
                            <label className='titre-label'>largeur</label>
                            <input className='selection'
                                type="number"
                                step="0.01"
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
                                step="0.01"
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
                                step="0.01"
                                value={depth}
                                onChange={(e) => {
                                    const newDepth = parseFloat(e.target.value) || 0;
                                    setDepth(newDepth);
                                    handleUpdateScale(width, height, newDepth);
                                }}
                            />
                        </div>
                    </div>
                    {/* dans le cas ou c'est un mur  */}
                    {isWall && (
                    <div className='panel-section'>
                        <h3 className="section-title">Ajouter un élément</h3>
                        <button className='bouton-popup' onClick={handleAddWindow}>
                            <p>
                                <strong>Ajouter une fenêtre:</strong> 
                            </p>
                        </button>
                        <button className='bouton-popup' onClick={handleAddDoor}>
                            <p>
                                <strong>Ajouter une porte:</strong> 
                            </p>
                        </button>
                    </div>
                    )}



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
                                min="-50"
                                max="50"
                                step="0.01"
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

                    <div className="panel-section">
                        <h3 className="section-title">Déformation</h3>
                        <div className="deformation-controls">
                            <div className="deformation-group">
                                <label>Courbure</label>
                                <span className="deformation-value">{curvature.toFixed(1)}</span>
                            </div>
                            <input
                                type="range"
                                min="-50"
                                max="50"
                                step="0.01"
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
                                min="-50"
                                max="50"
                                step="0.01"
                                value={stretch}
                                onChange={(e) => setStretch(parseFloat(e.target.value))}
                                className="deformation-slider"
                                onMouseDown={handleRangeMouseDown}
                            />
                        </div>
                    </div>

                    <div className="panel-section">
                        <h3 className="section-title">Texture</h3>
                        
                        <div className="texture-selector">
                            {isLoadingTextures ? (
                                <p className="texture-loading">Chargement des textures...</p>
                            ) : texturesError ? (
                                <div className="texture-error">
                                    <p>Erreur lors du chargement des textures API</p>
                                    <p className="error-details">{texturesError}</p>
                                    <p>Les textures par défaut sont toujours disponibles.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="texture-grid">
                                       
                                        
                                        {/* Textures personnalisées */}
                                        {Object.entries(customTextures).map(([name, url]) => (
                                            <div 
                                                key={url}
                                                className={`texture-option ${texture === url ? 'selected' : ''}`}
                                                onClick={() => applyTexture(url)}
                                            >
                                                <img 
                                                    src={url} 
                                                    alt={name}
                                                    className="texture-preview"
                                                    onError={handleImageError}
                                                />
                                                <span>{name.replace(/\.[^/.]+$/, "")}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Textures de l'API */}
                                    {apiTextures.length > 0 ? (
                                        <>
                                            <div style={textureDividerStyle}></div>
                                            <h4>Textures API</h4>
                                            <div className="texture-grid">
                                                {apiTextures.map((textureItem, index) => (
                                                    <div 
                                                        key={`api-${index}`}
                                                        className={`texture-option ${texture === textureItem.fullUrl ? 'selected' : ''}`}
                                                        onClick={() => applyTexture(textureItem.fullUrl)}
                                                    >
                                                        <img 
                                                            src={textureItem.fullUrl} 
                                                            alt={textureItem.name}
                                                            className="texture-preview"
                                                            onError={handleImageError}
                                                        />
                                                        <span>{textureItem.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : !texturesError && (
                                        <div className="texture-info">
                                            <p>Aucune texture disponible depuis l'API.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="panel-section">
                        <h3 className="section-title">Couleur</h3>
                        <div className="color-selector">
                            <div className="color-preview" style={{ backgroundColor: color || '#FFFFFF' }}></div>
                            <input
                                type="color"
                                value={color || '#FFFFFF'}
                                onChange={(e) => applyColor(e.target.value)}
                                className="color-picker"
                            />
                            <button 
                                className="no-color-button"
                                style={noColorButtonStyle}
                                onClick={() => {
                                    setColor(undefined);
                                    onUpdateColor(object.id, '');
                                }}
                            >
                                Aucune couleur
                            </button>
                            <div className="color-presets">
                                {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#000000'].map((presetColor) => (
                                    <div
                                        key={presetColor}
                                        className={`color-preset ${color === presetColor ? 'selected' : ''}`}
                                        style={{ backgroundColor: presetColor }}
                                        onClick={() => applyColor(presetColor)}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

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
                                rotation[0],
                                (rotation[1] + Math.PI / 2) % (Math.PI * 2),
                                rotation[2]
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
