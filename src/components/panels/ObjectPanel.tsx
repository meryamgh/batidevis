import React, { useState, useEffect } from 'react';
import { ObjectData, FacesData } from '../../types/ObjectData';
import '../../styles/Controls.css';
import { useTextures } from '../../services/TextureService';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import '../../styles/ObjectPanel.css';
import Select, { SingleValue } from 'react-select';
import ParametricDataPanel from '../ParametricDataPanel';

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
    onExtendObject: (object: ObjectData, direction: 'left' | 'right' | 'front' | 'back' | 'up' | 'down') => ObjectData;
    onUpdateFaces?: (id: string, faces: FacesData) => void;
    parametricData?: any;
};

// Type pour les noms des faces
type FaceName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

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
    onExtendObject,
    onUpdateFaces,
    parametricData,
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
    const [recalculateYPosition, setRecalculateYPosition] = useState(false);
    // États pour les dimensions de la pièce
    const [roomWidth, setRoomWidth] = useState(object.scale[0]);
    const [roomLength, setRoomLength] = useState(object.scale[2]);
    const [roomHeight, setRoomHeight] = useState(3); // Valeur par défaut
    // État pour suivre le dernier objet étendu
    const [lastExtendedObject, setLastExtendedObject] = useState<ObjectData>(object);
    // État pour suivre tous les objets étendus
    const [extendedObjects, setExtendedObjects] = useState<ObjectData[]>([]);
    const [selectedFace, setSelectedFace] = useState<FaceName>('front');
    const [faces, setFaces] = useState<FacesData>(object.faces || {});
    
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


    const getMinYAxis = (object: ObjectData) => {
        if (object.boundingBox) {
            return -object.boundingBox.min[1] / 2;
        }
        return 0;
    }

    const toggleDimensions = () => {
        onToggleShowDimensions(object.id);
        setShowDimensions(!showDimensions);
    };

    useEffect(() => {
        if (object) {
            console.log('Updating dimensions:', object.scale);
            setWidth(object.scale[0]);
            setHeight(object.scale[1]);
            setDepth(object.scale[2]);
            setRotation(object.rotation || [0, 0, 0]);
            setPosition(object.position);
            
            if (isFloor) {
                setRoomWidth(object.scale[0]);
                setRoomLength(object.scale[2]);
                setRoomHeight(3);
            }
        }
    }, [object, isFloor]);

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
        console.log('updateScale');
        setWidth(newWidth);
        setHeight(newHeight);
        setDepth(newDepth);
        onUpdateScale(object.id, [newWidth, newHeight, newDepth]);

        setRecalculateYPosition(true);
    };

    useEffect(() => {
        
        if (object && recalculateYPosition) {
            updateYPosition(); 
        }
    }, [recalculateYPosition]);

    const updateYPosition = () => { 
        console.log("new height", height)
        const minY = getMinYAxis(object);
        if (minY !== position[1]) {
            console.log('minY', minY);
            const newPosition: [number, number, number] = [position[0], minY, position[2]];
            onUpdatePosition(object.id, newPosition);
            setPosition(newPosition);
        }
        setRecalculateYPosition(false);
    }

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
            url: 'http://127.0.0.1:5000/files/fenêtre.glb',
            price: 200,
            details: 'Fenêtre',
            position: object.position,
            gltf: mesh,
            rotation: object.rotation,
            scale: [1, 1, 1],
            color: '#FFFFFF',
            parentScale: object.scale,
            texture: ''
        };
        onAddObject(newWindow);
    };

    const handleAddDoor = () => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: '#8B4513' });
        const mesh = new THREE.Mesh(geometry, material);

        const newDoor: ObjectData = {
            id: uuidv4(),
            url: 'http://127.0.0.1:5000/files/porte.glb',
            price: 500,
            details: 'Porte',
            position: object.position,
            gltf: mesh,
            rotation: object.rotation,
            scale: [1, 1, 1],
            color: '#8B4513',
            parentScale: object.scale,
            texture: ''
        };
        onAddObject(newDoor);
    };

    // Modifier la fonction handleWallDimensionChange
    const handleWallDimensionChange = (e: React.ChangeEvent<HTMLInputElement>, dimension: 'width' | 'height' | 'depth') => {
        const value = parseFloat(e.target.value);
        if (isNaN(value)) return;

        console.log('Input value changed:', dimension, value);

        // Créer une copie des dimensions actuelles
        let newDimensions: [number, number, number] = [width, height, depth];

        // Mettre à jour la dimension appropriée
        switch (dimension) {
            case 'width':
                newDimensions[0] = Math.max(0.5, value);
                break;
            case 'height':
                newDimensions[1] = Math.max(0.5, value);
                break;
            case 'depth':
                newDimensions[2] = Math.max(0.1, value);
                break;
        }

        console.log('New dimensions:', newDimensions);

        // Mettre à jour l'état local
        setWidth(newDimensions[0]);
        setHeight(newDimensions[1]);
        setDepth(newDimensions[2]);

        // Mettre à jour l'objet
        onUpdateScale(object.id, newDimensions);
    };

    const renderDimensionsInputs = () => {
        
        return (
            <>
                <div className='container-label'>
                    <label className='titre-label'>largeur</label>
                    <input className='selection'
                        type="number"
                        step="0.01"
                        value={width}
                        onChange={(e) => {
                            const newWidth = parseFloat(e.target.value) || 0;
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
                            handleUpdateScale(width, height, newDepth);
                        }}
                    />
                </div>
            </>
        );
    };

    // Ajouter l'objet original à extendedObjects lors de l'initialisation
    useEffect(() => {
        if (extendedObjects.length === 0) {
            setExtendedObjects([object]);
            setLastExtendedObject(object);
        }
    }, []); // Dépendance vide pour n'exécuter qu'une seule fois

    // Fonction pour gérer l'extension d'objet avec suivi
    const handleExtendWithTracking = (direction: 'left' | 'right' | 'front' | 'back' | 'up' | 'down') => {
        try {
            console.log('=== Début de l\'extension ===');
            console.log('État actuel des objets étendus:', extendedObjects);
            console.log('Dernier objet étendu:', lastExtendedObject);

            // Utiliser le dernier objet étendu comme source pour la nouvelle extension
            // n'utilise plus le dernier objet étendu mais l'objet original et rajoute la distance qu'il faut pour le creer au bon endroit
            const sourceObject = extendedObjects.length > 0 
                ? extendedObjects[extendedObjects.length - 1] 
                : object;
            
            console.log('Objet source sélectionné:', {
                id: sourceObject.id,
                position: sourceObject.position,
                details: sourceObject.details
            });
            
            if (!sourceObject) {
                console.error("Pas d'objet source trouvé pour l'extension");
                return;
            }
            
            // Utiliser la fonction onExtendObject fournie dans les props
            console.log('Appel de onExtendObject avec direction:', direction);
            const newObject = onExtendObject(sourceObject, direction);
            
            console.log('Nouvel objet créé:', {
                id: newObject.id,
                position: newObject.position,
                details: newObject.details
            });

            // Vérifier si le nouvel objet a bien un nouvel ID
            if (newObject.id === sourceObject.id) {
                console.error('ERREUR: Le nouvel objet a le même ID que la source!');
                return;
            }

            // Vérifier si la position est différente
            const samePosition = newObject.position.every((val, idx) => val === sourceObject.position[idx]);
            if (samePosition) {
                console.warn('ATTENTION: Le nouvel objet a la même position que la source!');
            }

            // Mettre à jour les états locaux
            console.log('Mise à jour des états locaux');
            console.log('Ancien état extendedObjects:', extendedObjects);
            
            setLastExtendedObject(newObject);
            setExtendedObjects(prev => {
                const newState = [...prev, newObject];
                console.log('Nouvel état extendedObjects:', newState);
                return newState;
            });

            console.log('=== Fin de l\'extension ===');
        } catch (error) {
            console.error("Erreur lors de l'extension de l'objet:", error);
        }
    };

    // Fonction pour annuler le dernier objet étendu
    const handleUndoLastExtend = () => {
        if (extendedObjects.length > 0) {
            const lastObject = extendedObjects[extendedObjects.length - 2] || object;
            const objectToRemove = extendedObjects[extendedObjects.length - 1];
            
            onRemoveObject(objectToRemove.id);
            setExtendedObjects(prev => prev.slice(0, -1));
            setLastExtendedObject(lastObject);
        }
    };

    // Fonction pour annuler tous les objets étendus
    const handleCancelAllExtends = () => {
        extendedObjects.forEach(obj => {
            onRemoveObject(obj.id);
        });
        setExtendedObjects([]);
        setLastExtendedObject(object);
    };

    // Réinitialiser le dernier objet étendu lors de la fermeture du panneau
    const handleClosePanel = () => {
        setLastExtendedObject(object);
        setExtendedObjects([]);
        onClosePanel();
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
        console.log("Applying texture to face:", {
            selectedFace,
            textureUrl,
            currentFaces: faces,
            objectId: object.id,
            objectType: object.type
        });

        const newFaces = {
            ...faces,
            [selectedFace]: {
                ...faces[selectedFace],
                texture: textureUrl,
                // Ne pas inclure la couleur par défaut
                color: undefined
            }
        };
        console.log("New faces configuration:", newFaces);
        
        setFaces(newFaces);
        if (onUpdateFaces) {
            console.log("Calling onUpdateFaces with:", {
                objectId: object.id,
                newFaces
            });
            onUpdateFaces(object.id, newFaces);
        } else {
            console.warn("onUpdateFaces is not defined");
        }
    };

    // Fonction pour appliquer une couleur à une face spécifique
    const applyColorToFace = (colorValue: string) => {
        const newFaces = {
            ...faces,
            [selectedFace]: {
                ...faces[selectedFace],
                color: colorValue
            }
        };
        setFaces(newFaces);
        onUpdateFaces?.(object.id, newFaces);
    };

    return (
        <div className="object-panel">
            <div className='close'>
                <button className='bouton-close' onClick={() => {
                    onDeselectObject(object.id);
                    handleClosePanel();
                }}>x</button>
            </div>
            <div className='title_popup'>
                <p className='modif'>modification de l'objet</p>
            </div>
            <p className='texte'>{object.details}</p>

            {isFloor && (
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
                        {renderDimensionsInputs()}
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
                                min={selectedAxis === 'y' ? getMinYAxis(object) : "-25"}
                                max="25"
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
                        <h3 className="section-title">Face sélectionnée</h3>
                        <div className="face-selector">
                            {object.type === 'wall' ? (
                                // Pour les murs, montrer toutes les faces
                                ['front', 'back', 'left', 'right', 'top', 'bottom'].map((face) => (
                                    <button
                                        key={face}
                                        className={`face-button ${selectedFace === face ? 'selected' : ''}`}
                                        onClick={() => setSelectedFace(face as FaceName)}
                                    >
                                        {getFaceName(face as FaceName)}
                                    </button>
                                ))
                            ) : (
                                // Pour le sol, montrer uniquement la face supérieure
                                <button
                                    className="face-button selected"
                                    onClick={() => setSelectedFace('top')}
                                >
                                    Face supérieure
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="panel-section">
                        <h3 className="section-title">
                            {object.type === 'wall' || object.type === 'floor' 
                                ? `Texture - ${getFaceName(selectedFace)}`
                                : 'Texture'}
                        </h3>
                        
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
                                        {Object.entries(customTextures).map(([name, url]) => (
                                            <div 
                                                key={url}
                                                className={`texture-option ${
                                                    faces[selectedFace]?.texture === url ? 'selected' : ''
                                                }`}
                                                onClick={() => {
                                                    console.log('Texture clicked:', {
                                                        name,
                                                        url,
                                                        selectedFace,
                                                        currentFaces: faces
                                                    });
                                                    applyTextureToFace(url);
                                                }}
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
                                                        onClick={() => {
                                                            console.log('API Texture clicked:', {
                                                                name: textureItem.name,
                                                                url: textureItem.fullUrl,
                                                                selectedFace,
                                                                currentFaces: faces
                                                            });
                                                            if (object.type === 'wall' || object.type === 'floor') {
                                                                applyTextureToFace(textureItem.fullUrl);
                                                            } else {
                                                                applyTexture(textureItem.fullUrl);
                                                            }
                                                        }}
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
                        <h3 className="section-title">
                            {object.type === 'wall' || object.type === 'floor' 
                                ? `Couleur - ${getFaceName(selectedFace)}`
                                : 'Couleur'}
                        </h3>
                        <div className="color-selector">
                            <div className="color-preview" 
                                style={{ backgroundColor: faces[selectedFace]?.color || color || '#FFFFFF' }}
                            ></div>
                            <input
                                type="color"
                                value={faces[selectedFace]?.color || color || '#FFFFFF'}
                                onChange={(e) => applyColorToFace(e.target.value)}
                                className="color-picker"
                            />
                            <button 
                                className="no-color-button"
                                style={noColorButtonStyle}
                                onClick={() => {
                                    const newFaces = { ...faces };
                                    if (newFaces[selectedFace]) {
                                        delete newFaces[selectedFace].color;
                                    }
                                    setFaces(newFaces);
                                    onUpdateFaces?.(object.id, newFaces);
                                }}
                            >
                                Aucune couleur
                            </button>
                            <div className="color-presets">
                                {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#000000'].map((presetColor) => (
                                    <div
                                        key={presetColor}
                                        className={`color-preset ${faces[selectedFace]?.color === presetColor ? 'selected' : ''}`}
                                        style={{ backgroundColor: presetColor }}
                                        onClick={() => applyColorToFace(presetColor)}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="panel-section">
                <h3 className="section-title">Étendre l'objet</h3>
                <div className="extend-controls">
                    <div className="extend-row">
                        <button 
                            className="extend-button"
                            onClick={() => handleExtendWithTracking('left')}
                        >
                            ← Gauche
                        </button>
                        <button 
                            className="extend-button"
                            onClick={() => handleExtendWithTracking('right')}
                        >
                            Droite →
                        </button>
                    </div>
                    <div className="extend-row">
                        <button 
                            className="extend-button"
                            onClick={() => handleExtendWithTracking('front')}
                        >
                            ↑ Devant
                        </button>
                        <button 
                            className="extend-button"
                            onClick={() => handleExtendWithTracking('back')}
                        >
                            Derrière ↓
                        </button>
                    </div>
                    <div className="extend-controls-actions">
                        <button 
                            className="extend-control-button"
                            onClick={handleUndoLastExtend}
                            disabled={extendedObjects.length === 0}
                        >
                            Annuler dernier
                        </button>
                        <button 
                            className="extend-control-button"
                            onClick={handleCancelAllExtends}
                            disabled={extendedObjects.length === 0}
                        >
                            Annuler tout
                        </button>
                    </div>
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

            {parametricData && (
                <div className="panel-section">
                    <h3 className="section-title">Données Paramétriques</h3>
                    
                    {/* Item details section with improved display */}
                    {parametricData.item_details && (
                        <div className="item-details">
                            <h4>Détails de l'article</h4>
                            <div className="item-property">
                                <span className="item-label">Description:</span>
                                <p className="item-description">{parametricData.item_details.libtech}</p>
                            </div>
                            <div className="item-property">
                                <span className="item-label">Prix:</span>
                                <span className="item-value">{parametricData.item_details.prix.toFixed(2)} €</span>
                            </div>
                            <div className="item-property">
                                <span className="item-label">Unité:</span>
                                <span className="item-value">{parametricData.item_details.unite}</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Variables by position section with dropdown selectors */}
                    {parametricData.variables_by_position && (
                        <div className="variables-section">
                            <h4>Variantes disponibles</h4>
                            {Object.entries(parametricData.variables_by_position).map(([position, options]) => (
                                <div key={position} className="variable-position">
                                    <span className="position-label">Position {position}:</span>
                                    <Select
                                        className="position-select"
                                        options={Array.isArray(options) ? options.map(option => ({ value: option, label: option })) : []}
                                        defaultValue={Array.isArray(options) && options.length > 0 ? { value: options[0], label: options[0] } : null}
                                        onChange={(selectedOption: SingleValue<{value: string, label: string}>) => {
                                            console.log(`Changed position ${position} to:`, selectedOption);
                                            // Here you could implement functionality to update the object based on selection
                                        }}
                                        isSearchable={false}
                                        isDisabled={Array.isArray(options) && options.length <= 1}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Template section for reference */}
                    {parametricData.template && (
                        <div className="template-section">
                            <h4>Modèle complet</h4>
                            <p className="template-text">{parametricData.template}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Add Parametric Data Panel */}
            {object.parametricData && (
                <ParametricDataPanel parametricData={object.parametricData} />
            )}
        </div>
    );
};


// Ajouter les styles au document
if (!document.getElementById('extend-controls-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'extend-controls-styles';
    document.head.appendChild(styleSheet);
}

export default ObjectPanel;
