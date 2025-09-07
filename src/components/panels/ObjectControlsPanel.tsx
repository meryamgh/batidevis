import React, { useState, useEffect } from 'react';
import '../../styles/ObjectControlsCompact.css';
import { ObjectData, FacesData } from '../../types/ObjectData';
import {
    DeleteIcon,
    MoveIcon,
    RotateIcon,
    DuplicateIcon,
    DimensionsIcon,
    PositionIcon
} from '../icons/ControlIcons';
import { useTextures } from '../../services/TextureService';

// Type pour les noms des faces
type FaceName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

interface ObjectControlsProps {
    selectedObjectId: string | null;
    onRemoveObject: (id: string) => void;
    onUpdateScale: (id: string, newScale: [number, number, number]) => void;
    onMoveObject: () => void;
    onRotateObject: (id: string, rotation: [number, number, number]) => void;
    onUpdatePosition: (id: string, position: [number, number, number]) => void;
    onExtendObject: (object: any, direction: 'left' | 'right' | 'front' | 'back' | 'up' | 'down') => any;
    selectedObject?: ObjectData;
    onUpdateTexture?: (newTexture: string) => void;
    onUpdateFaces?: (id: string, faces: FacesData) => void;
    customTextures?: Record<string, string>;
}

const ObjectControls: React.FC<ObjectControlsProps> = ({
    selectedObjectId,
    onRemoveObject,
    onUpdateScale,
    onMoveObject,
    onRotateObject,
    onUpdatePosition,
    onExtendObject,
    selectedObject,
    onUpdateTexture,
    onUpdateFaces,
    customTextures = {}
}) => {
    const [currentRotation, setCurrentRotation] = useState<[number, number, number]>([0, 0, 0]);
    const [extendedObjects, setExtendedObjects] = useState<ObjectData[]>([]);
    const [lastExtendedObject, setLastExtendedObject] = useState<ObjectData | null>(null);
    const [selectedAxis, setSelectedAxis] = useState<'x' | 'y' | 'z'>('y');
    const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]); 
    const [width, setWidth] = useState(selectedObject?.scale[0] || 0);
    const [recalculateYPosition, setRecalculateYPosition] = useState(false);
    const [height, setHeight] = useState(selectedObject?.scale[1] || 0);
    const [depth, setDepth] = useState(selectedObject?.scale[2] || 0);
    const [showTexturePanel, setShowTexturePanel] = useState(false);
    const [selectedFace, setSelectedFace] = useState<FaceName>('front');
    const [faces, setFaces] = useState<FacesData>(selectedObject?.faces || {});
    
    // Utilisation du hook personnalisé pour récupérer les textures
    const { textures: apiTextures, isLoading: isLoadingTextures, error: texturesError } = useTextures();

    // Fonction pour gérer les erreurs de chargement d'image
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = e.target as HTMLImageElement;
        target.src = "textures/Cube_BaseColor.png"; 
        target.onerror = null; // Éviter les boucles infinies
    };

    

    // Fonction pour obtenir le nom lisible d'une face
    const getFaceName = (face: FaceName): string => {
        const names = {
            front: 'Face avant',
            back: 'Face arrière',
            left: 'Face gauche',
            right: 'Face droite',
            top: 'Face supérieure',
            bottom: 'Face inférieure'
        };
        return names[face];
    };

    // Fonction pour appliquer une texture à une face spécifique
    const applyTextureToFace = (textureUrl: string) => {
        if (!selectedObject) return;

        const newFaces = {
            ...faces,
            [selectedFace]: {
                ...faces[selectedFace],
                texture: textureUrl,
                color: undefined
            }
        };
        
        setFaces(newFaces);
        if (onUpdateFaces) {
            onUpdateFaces(selectedObject.id, newFaces);
        }
    };

    // Mettre à jour les états quand l'objet sélectionné change
    useEffect(() => {
        if (selectedObject) {
            setCurrentRotation(selectedObject.rotation || [0, 0, 0]);
            setPosition(selectedObject.position);
            setLastExtendedObject(selectedObject); 
            setWidth(selectedObject.scale[0] || 0);
            setHeight(selectedObject.scale[1] || 0);
            setDepth(selectedObject.scale[2] || 0);
        } else {
            // Réinitialiser les états quand aucun objet n'est sélectionné
            setCurrentRotation([0, 0, 0]);
            setPosition([0, 0, 0]);
            setLastExtendedObject(null);
            setExtendedObjects([]);
        }
    }, [selectedObject]);

    const handleRotate90 = () => {
        if (selectedObjectId) {
            const newRotation: [number, number, number] = [
                currentRotation[0],
                (currentRotation[1] + Math.PI / 2) % (Math.PI * 2),
                currentRotation[2]
            ];
            setCurrentRotation(newRotation);
            onRotateObject(selectedObjectId, newRotation);
        }
    };

    const handleUpdatePosition = (axis: 'x' | 'y' | 'z', value: number) => {
        if (!selectedObject) return;

        const newPosition: [number, number, number] = [...position];
        const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
        
        // Vérifier si l'objet est une fenêtre ou une porte
        const isWindowOrDoor = selectedObject.details === 'Fenêtre' || selectedObject.details === 'Porte';
        
        if (isWindowOrDoor) {
            // Calculer les limites en fonction des dimensions du mur parent
            const wallWidth = selectedObject.parentScale?.[0] || 1;
            const wallHeight = selectedObject.parentScale?.[1] || 1;
            
            let minLimit = 0;
            let maxLimit = 0;
            
            if (axis === 'x') {
                minLimit = -wallWidth / 4;
                maxLimit = wallWidth / 4;
            } else if (axis === 'y') {
                minLimit = -wallHeight / 4;
                maxLimit = wallHeight / 4;
            } else if (axis === 'z') {
                minLimit = -0.1;
                maxLimit = 0.1;
            }
            
            value = Math.max(minLimit, Math.min(maxLimit, value));
        }
        
        newPosition[axisIndex] = value;
        setPosition(newPosition);
        onUpdatePosition(selectedObject.id, newPosition);
    };

    const handleUpdateScale = (newWidth: number, newHeight: number, newDepth: number) => { 
        setWidth(newWidth);
        setHeight(newHeight);
        setDepth(newDepth);
        if (selectedObject) {
            onUpdateScale(selectedObject.id, [newWidth, newHeight, newDepth]);
        }

        // Ne recalculer automatiquement la position Y que pour les murs et uniquement si la position Y actuelle est proche de la position minimale
        if (selectedObject) {
            const minY = getMinYAxis(selectedObject);
            const currentY = position[1];
            // Seulement recalculer si la position actuelle est très proche de la position minimale (tolerance de 0.1)
            if (Math.abs(currentY - minY) < 0.1) {
                setRecalculateYPosition(true);
            }
        }
    };

    const getMinYAxis = (object: ObjectData) => {
        if (object.boundingBox) {
            return -object.boundingBox.min[1] / 2;
        }
        // Fallback pour les objets sans boundingBox
        if (object.type === 'wall') {
            return height / 2; // Utiliser la valeur locale height qui est à jour
        }
        return 0;
    }

    // Logique pour recalculer la position Y quand l'échelle change (uniquement pour les murs et dans des cas spécifiques)
    useEffect(() => {
        if (selectedObject && recalculateYPosition ) {
            const minY = getMinYAxis(selectedObject);
            // Recalculer seulement si nécessaire pour éviter d'écraser les positions définies manuellement
            const newPosition: [number, number, number] = [position[0], minY, position[2]];
            onUpdatePosition(selectedObject.id, newPosition);
            setPosition(newPosition);
            setRecalculateYPosition(false);
        } else if (recalculateYPosition) {
            // Pour les autres types d'objets, simplement réinitialiser le flag sans modifier la position
            setRecalculateYPosition(false);
        }
    }, [recalculateYPosition, height, selectedObject?.type, position]); // Ajouter les dépendances nécessaires

    const handleRangeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleExtendWithTracking = (direction: 'left' | 'right' | 'front' | 'back' | 'up' | 'down') => {
        if (!selectedObject) return;

        try {
            const sourceObject = extendedObjects.length > 0 
                ? extendedObjects[extendedObjects.length - 1] 
                : selectedObject;
            
            if (!sourceObject) {
                console.error("Pas d'objet source trouvé pour l'extension");
                return;
            }
            
            const newObject = onExtendObject(sourceObject, direction);
            
            if (newObject.id === sourceObject.id) {
                console.error('ERREUR: Le nouvel objet a le même ID que la source!');
                return;
            }

            setLastExtendedObject(newObject);
            console.log(lastExtendedObject);
            setExtendedObjects(prev => [...prev, newObject]);
        } catch (error) {
            console.error("Erreur lors de l'extension de l'objet:", error);
        }
    };

    return (
        <div className="object-controls-compact">
            <h3 className="controls-header" style={{ fontSize: '14px', marginBottom: '8px' }}>
                {selectedObject?.details?.includes('-') 
                    ? selectedObject.details.split('-')[0].trim() 
                    : selectedObject?.details}
            </h3>

            <div className="action-buttons" style={{ display: 'flex', flexDirection: 'row', gap: '2px', marginBottom: '4px', justifyContent: 'center', alignItems: 'center' }}>
                <button
                    className="icon-button"
                    onClick={() => selectedObjectId && onRemoveObject(selectedObjectId)}
                    disabled={!selectedObjectId}
                    title="Supprimer"
                    style={{ padding: '2px' }}
                >
                    <DeleteIcon />
                </button>
                <button
                    className="icon-button"
                    onClick={onMoveObject}
                    disabled={!selectedObjectId}
                    title="Déplacer"
                    style={{ padding: '2px' }}
                >
                    <MoveIcon />
                </button>
                <button
                    className="icon-button"
                    onClick={handleRotate90}
                    disabled={!selectedObjectId}
                    title="Rotation 90°"
                    style={{ padding: '2px' }}
                >
                    <RotateIcon />
                </button>
                <button
                    className="icon-button"
                    onClick={() => handleExtendWithTracking('right')}
                    disabled={!selectedObjectId}
                    title="Dupliquer"
                    style={{ padding: '2px' }}
                >
                    <DuplicateIcon />
                </button>
                <button
                    className="icon-button"
                    onClick={() => {
                        if (selectedObject) {
                            const newWidth = width * 0.8;
                            const newHeight = height * 0.8;
                            const newDepth = depth * 0.8;
                            handleUpdateScale(newWidth, newHeight, newDepth);
                        }
                    }}
                    disabled={!selectedObjectId}
                    title="Plus petit"
                    style={{ padding: '2px' }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 13H5V11H19V13Z" fill="currentColor"/>
                    </svg>
                </button>
                <button
                    className="icon-button"
                    onClick={() => {
                        if (selectedObject) {
                            const newWidth = width * 1.2;
                            const newHeight = height * 1.2;
                            const newDepth = depth * 1.2;
                            handleUpdateScale(newWidth, newHeight, newDepth);
                        }
                    }}
                    disabled={!selectedObjectId}
                    title="Plus grand"
                    style={{ padding: '2px' }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 13H5V11H19V13Z" fill="currentColor"/>
                        <path d="M13 19V5H11V19H13Z" fill="currentColor"/>
                    </svg>
                </button>
            </div>

            <div className="dimensions-section" style={{ marginTop: '4px', width: '100%' }}>
                <div className="section-header" style={{ marginBottom: '2px', display: 'flex', alignItems: 'center' }}>
                    <DimensionsIcon />
                    <span style={{ fontSize: '8px', marginLeft: '2px' }}>Dimensions</span>
                </div>
                <div className="dimension-row" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                    <label style={{ fontSize: '11px', marginRight: '2px', width: '15px' }}>L:</label>
                    <input
                        type="number"
                        step="0.01"
                        value={width}
                        onChange={(e) => {
                            const newWidth = parseFloat(e.target.value) || 0;
                            handleUpdateScale(newWidth, height, depth);
                        }}
                        style={{ width: '80px', height: '24px', fontSize: '12px' }}
                    />
                    <label style={{ fontSize: '11px', margin: '0 2px 0 8px', width: '15px' }}>H:</label>
                    <input
                        type="number"
                        step="0.01"
                        value={height}
                        onChange={(e) => {
                            const newHeight = parseFloat(e.target.value) || 0;
                            handleUpdateScale(width, newHeight, depth);
                        }}
                        style={{ width: '80px', height: '24px', fontSize: '12px' }}
                    />
                    <label style={{ fontSize: '11px', margin: '0 2px 0 8px', width: '15px' }}>P:</label>
                    <input
                        type="number"
                        step="0.01"
                        value={depth}
                        onChange={(e) => {
                            const newDepth = parseFloat(e.target.value) || 0;
                            handleUpdateScale(width, height, newDepth);
                        }}
                        style={{ width: '80px', height: '24px', fontSize: '12px' }}
                    />
                </div>
            </div>

            <div className="position-section" style={{ marginTop: '4px', width: '100%' }}>
                <div className="section-header" style={{ marginBottom: '2px', display: 'flex', alignItems: 'center' }}>
                    <PositionIcon />
                    <span style={{ fontSize: '8px', marginLeft: '2px' }}>Position</span>
                </div>
                <div className="position-row" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                    <div className="axis-controls" style={{ display: 'flex', gap: '2px' }}>
                        <button 
                            className={`axis-button ${selectedAxis === 'x' ? 'selected' : ''}`}
                            onClick={() => setSelectedAxis('x')}
                            disabled={!selectedObjectId}
                            style={{ padding: '1px 4px', fontSize: '11px' }}
                        >
                            X
                        </button>
                        <button 
                            className={`axis-button ${selectedAxis === 'y' ? 'selected' : ''}`}
                            onClick={() => setSelectedAxis('y')}
                            disabled={!selectedObjectId}
                            style={{ padding: '1px 4px', fontSize: '11px' }}
                        >
                            Y
                        </button>
                        <button 
                            className={`axis-button ${selectedAxis === 'z' ? 'selected' : ''}`}
                            onClick={() => setSelectedAxis('z')}
                            disabled={!selectedObjectId}
                            style={{ padding: '1px 4px', fontSize: '11px' }}
                        >
                            Z
                        </button>
                    </div>
                    <input
                        type="range"
                        min={selectedAxis === 'y' && selectedObject ? getMinYAxis(selectedObject) : "-25"}
                        max="25"
                        step="0.01"
                        value={position[selectedAxis === 'x' ? 0 : selectedAxis === 'y' ? 1 : 2]}
                        onChange={(e) => handleUpdatePosition(selectedAxis, parseFloat(e.target.value))}
                        className="position-slider"
                        onMouseDown={handleRangeMouseDown}
                        disabled={!selectedObjectId}
                        style={{ width: '100%', height: '14px', margin: '0 4px' }}
                    />
                    <input
                        type="number"
                        className="position-value"
                        step="0.01"
                        min={selectedAxis === 'y' && selectedObject ? getMinYAxis(selectedObject) : -25}
                        max={25}
                        value={Number(position[selectedAxis === 'x' ? 0 : selectedAxis === 'y' ? 1 : 2].toFixed(2))}
                        onChange={(e) => {
                            const raw = parseFloat(e.target.value) || 0;
                            const rounded = Math.round(raw * 100) / 100;
                            handleUpdatePosition(selectedAxis, rounded);
                        }}
                        disabled={!selectedObjectId}
                        style={{ width: '90px', height: '22px', fontSize: '11px', textAlign: 'right' }}
                    />
                </div>
                {/* Champs de saisie manuelle pour la position */}
                <div className="position-inputs" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', width: '100%' }}>
                    <label style={{ fontSize: '11px', marginRight: '2px', width: '15px' }}>X:</label>
                    <input
                        type="number"
                        step="0.01"
                        value={position[0].toFixed(2)}
                        onChange={(e) => {
                            const newX = parseFloat(e.target.value) || 0;
                            handleUpdatePosition('x', newX);
                        }}
                        style={{ width: '80px', height: '24px', fontSize: '12px' }}
                    />
                    <label style={{ fontSize: '11px', margin: '0 2px 0 8px', width: '15px' }}>Y:</label>
                    <input
                        type="number"
                        step="0.01"
                        value={position[1].toFixed(2)}
                        onChange={(e) => {
                            const newY = parseFloat(e.target.value) || 0;
                            handleUpdatePosition('y', newY);
                        }}
                        style={{ width: '80px', height: '24px', fontSize: '12px' }}
                    />
                    <label style={{ fontSize: '11px', margin: '0 2px 0 8px', width: '15px' }}>Z:</label>
                    <input
                        type="number"
                        step="0.01"
                        value={position[2].toFixed(2)}
                        onChange={(e) => {
                            const newZ = parseFloat(e.target.value) || 0;
                            handleUpdatePosition('z', newZ);
                        }}
                        style={{ width: '80px', height: '24px', fontSize: '12px' }}
                    />
                </div>
            </div>

            {selectedObject?.type === 'wall' && (
                <div className="face-selector" style={{ marginBottom: '8px' }}>
                    <div className="section-header" style={{ marginBottom: '2px' }}>
                        <span style={{ fontSize: '8px' }}>Face sélectionnée</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                        {['front', 'back'].map((face) => (
                            <button
                                key={face}
                                className={`face-button ${selectedFace === face ? 'selected' : ''}`}
                                onClick={() => setSelectedFace(face as FaceName)}
                                style={{ 
                                    padding: '2px 4px', 
                                    fontSize: '8px',
                                    backgroundColor: selectedFace === face ? '#4a90e2' : '#f0f0f0',
                                    color: selectedFace === face ? 'white' : 'black',
                                    border: '1px solid #ccc',
                                    borderRadius: '3px'
                                }}
                            >
                                {getFaceName(face as FaceName)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="appearance-section" style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <button
                        className="icon-button"
                        onClick={() => setShowTexturePanel(!showTexturePanel)}
                        disabled={!selectedObjectId}
                        title="Appliquer texture"
                        style={{ padding: '2px' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 4H20V20H4V4ZM6 6V18H18V6H6Z" fill="currentColor"/>
                            <path d="M8 8H16V16H8V8Z" fill="currentColor"/>
                        </svg>
                    </button>
                    <span style={{ fontSize: '8px', marginTop: '1px' }}>Texture</span>
                </div>
                
            </div>

            {/* Panneau de textures */}
            {showTexturePanel && (
                <div className="texture-panel" style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: '0', 
                    width: '100%', 
                    backgroundColor: '#ffffff', 
                    borderRadius: '8px', 
                    padding: '10px', 
                    marginTop: '10px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                    zIndex: 1000,
                    border: '1px solid #ddd'
                }}>
                    {/* Bouton de fermeture */}
                    <button 
                        onClick={() => setShowTexturePanel(false)}
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: '#ffffff',
                            border: '1px solid #ddd',
                            fontSize: '18px',
                            cursor: 'pointer',
                            color: '#666',
                            padding: '4px',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1001,
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            fontWeight: 'bold'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.color = '#333';
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = '#adb5bd';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.color = '#666';
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#ddd';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                        }}
                        title="Fermer"
                    >
                        ×
                    </button>
                    <div className="texture-selector" style={{ maxHeight: '200px', overflowY: 'auto' }}>
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
                                <div className="texture-grid" style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', 
                                    gap: '5px' 
                                }}>
                                    {Object.entries(customTextures).map(([name, url]) => (
                                        <div 
                                            key={url}
                                            className="texture-option"
                                            onClick={() => {
                                                if (selectedObject?.type === 'wall') {
                                                    applyTextureToFace(url);
                                                } else if (onUpdateTexture) {
                                                    onUpdateTexture(url);
                                                }
                                            }}
                                            style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                alignItems: 'center', 
                                                cursor: 'pointer', 
                                                padding: '2px', 
                                                borderRadius: '4px',
                                                border: selectedObject?.type === 'wall' 
                                                    ? faces[selectedFace]?.texture === url 
                                                        ? '2px solid #4a90e2' 
                                                        : '1px solid #ddd'
                                                    : selectedObject?.texture === url 
                                                        ? '2px solid #4a90e2' 
                                                        : '1px solid #ddd'
                                            }}
                                        >
                                            <img 
                                                src={url} 
                                                alt={name}
                                                style={{ width: '100px', height: '40px', objectFit: 'cover', borderRadius: '2px' }}
                                                onError={handleImageError}
                                            />
                                            <span style={{ fontSize: '8px', marginTop: '2px', textAlign: 'center' }}>
                                                {name.replace(/\.[^/.]+$/, "")}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Textures de l'API */}
                                {apiTextures.length > 0 ? (
                                    <> 
                                        <h4 style={{ fontSize: '10px', margin: '5px 0' }}>Textures API</h4>
                                        <div className="texture-grid" style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', 
                                            gap: '5px' 
                                        }}>
                                            {apiTextures.map((textureItem, index) => (
                                                <div 
                                                    key={`api-${index}`}
                                                    className="texture-option"
                                                    onClick={() => {
                                                        if (selectedObject?.type === 'wall') {
                                                            applyTextureToFace(textureItem.fullUrl);
                                                        } else if (onUpdateTexture) {
                                                            onUpdateTexture(textureItem.fullUrl);
                                                        }
                                                    }}
                                                    style={{ 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        alignItems: 'center', 
                                                        cursor: 'pointer', 
                                                        padding: '2px', 
                                                        borderRadius: '4px',
                                                        border: selectedObject?.type === 'wall' 
                                                            ? faces[selectedFace]?.texture === textureItem.fullUrl 
                                                                ? '2px solid #4a90e2' 
                                                                : '1px solid #ddd'
                                                            : selectedObject?.texture === textureItem.fullUrl 
                                                                ? '2px solid #4a90e2' 
                                                                : '1px solid #ddd'
                                                    }}
                                                >
                                                    <img 
                                                        src={textureItem.fullUrl} 
                                                        alt={textureItem.name}
                                                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '2px' }}
                                                        onError={handleImageError}
                                                    />
                                                    <span style={{ fontSize: '8px', marginTop: '2px', textAlign: 'center' }}>
                                                        {textureItem.name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : !texturesError && (
                                    <div className="texture-info">
                                        <p style={{ fontSize: '10px', textAlign: 'center' }}>Aucune texture disponible depuis l'API.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ObjectControls; 