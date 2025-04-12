import React, { useState, useEffect, useMemo } from 'react';
import { ObjectData, FacesData } from '../../types/ObjectData';
import '../../styles/Controls.css';
import { useTextures } from '../../services/TextureService';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import '../../styles/ObjectPanel.css';
import Select, { SingleValue } from 'react-select';
import ParametricDataPanel from '../ParametricDataPanel';
import { BACKEND_URL } from '../../config/env';
        
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
    handleUpdateObjectParametricData: (id: string, object : any) => void;
    parametricData?: any;
};

// Type pour les noms des faces
type FaceName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

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
    onUpdateRoomDimensions,
    onDeselectObject,
    onAddObject,
    onExtendObject,
    onUpdateFaces,
    parametricData,
    handleUpdateObjectParametricData
}) => {
    const [width, setWidth] = useState(object.scale[0]);
    const [height, setHeight] = useState(object.scale[1]);
    const [depth, setDepth] = useState(object.scale[2]);
    const [texture, setTexture] = useState(object.texture);
    const [color] = useState<string | undefined>(object.color);
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
    // État pour les variantes sélectionnées
    const [selectedVariantsState, setSelectedVariantsState] = useState<Record<string, string>>({});
    
    // État pour suivre les options désactivées pour chaque position
    const [disabledOptions, setDisabledOptions] = useState<Record<string, Set<string>>>({});
    
    // Fonction pour extraire les variantes à partir du libtech en utilisant le template
    const extractSelectedVariants = () => {
        if (!parametricData || !parametricData.template_bis || !parametricData.item_details?.libtech) {
            return {};
        }
        
        const template = parametricData.template_bis;
        const libtech = parametricData.item_details.libtech;
        const selectedVariants: Record<string, string> = {};
        
        // Trouver les positions des underscores dans le template
        const templateParts = template.split('_');
        let libtechCopy = libtech;
        
        // Pour chaque partie du template sauf la dernière
        for (let i = 0; i < templateParts.length - 1; i++) {
            // Extraire la partie fixe du template
            const fixedPart = templateParts[i];
            
            // Trouver l'index de cette partie fixe dans le libtech
            const fixedPartIndex = libtechCopy.indexOf(fixedPart);
            
            if (fixedPartIndex !== -1) {
                // Avancer dans le libtech
                libtechCopy = libtechCopy.substring(fixedPartIndex + fixedPart.length);
                
                // Si nous ne sommes pas à la fin du template
                if (i < templateParts.length - 1) {
                    // Trouver la prochaine partie fixe
                    const nextFixedPart = templateParts[i + 1];
                    
                    // Extraire la variante entre les parties fixes
                    const nextFixedPartIndex = libtechCopy.indexOf(nextFixedPart);
                    
                    if (nextFixedPartIndex !== -1) {
                        const variant = libtechCopy.substring(0, nextFixedPartIndex).trim();
                        
                        // Enregistrer la variante pour cette position
                        let z = i+1
                        selectedVariants[z.toString()] = variant;
                    }
                }
            }
        }
        console.log("selectedVariants", selectedVariants)
        return selectedVariants;
    };
    
    // Extraire les variantes sélectionnées à partir du libtech
    const selectedVariants = extractSelectedVariants();
    
    // Initialiser l'état des variantes sélectionnées
    useEffect(() => {
        setSelectedVariantsState(selectedVariants);
    }, [parametricData]);
    
    // Fonction pour mettre à jour la description avec une nouvelle variante
    const updateDescriptionWithNewVariant = (position: string, newVariant: string) => {
        if (!parametricData || !parametricData.template_bis || !parametricData.item_details?.libtech) {
            return;
        }
        
        const template = parametricData.template_bis;
        const libtech = parametricData.item_details.libtech;
        const templateParts = template.split('_');
        
        // Créer une copie de la description actuelle
        let updatedLibtech = libtech;
        
        let startIndex = 0;
        
        for (let i = 0; i < templateParts.length - 1; i++) {
            const fixedPart = templateParts[i];
            const nextFixedPart = templateParts[i + 1];
            
            // Trouver l'index de la partie fixe actuelle
            const fixedPartIndex = updatedLibtech.indexOf(fixedPart, startIndex);
            
            if (fixedPartIndex !== -1) {
                // Avancer dans le libtech
                startIndex = fixedPartIndex + fixedPart.length;
                
                // Trouver l'index de la prochaine partie fixe
                const nextFixedPartIndex = updatedLibtech.indexOf(nextFixedPart, startIndex);
                
                if (nextFixedPartIndex !== -1) {
                    // Si c'est la position que nous cherchons
                    if ((i + 1).toString() === position) {
                        // Remplacer la variante
                        updatedLibtech = updatedLibtech.substring(0, startIndex) + 
                                         newVariant + 
                                         updatedLibtech.substring(nextFixedPartIndex);
                        
                        // Mettre à jour la description dans l'interface
                        if (parametricData.item_details) {
                            parametricData.item_details.libtech = updatedLibtech;
                        }
                        
                        // Mettre à jour les variantes sélectionnées
                        const updatedVariants = {...selectedVariantsState};
                        updatedVariants[position] = newVariant;
                        setSelectedVariantsState(updatedVariants);
                        
                        break;
                    }
                }
            }
        }
    };
    
     
    // Fonction pour construire la carte des combinaisons valides
    const buildValidCombinationsMap = () => {
        if (!parametricData || !parametricData.similar_libtechs_details) {
            return new Map();
        }
        
        const positionsMap = new Map();
        
        // Initialiser la carte pour chaque position
        Object.keys(parametricData.variables_by_position).forEach(position => {
            positionsMap.set(position, new Map());
        });
        
        // Analyser chaque libtech similaire pour trouver les combinaisons valides
        parametricData.similar_libtechs_details.forEach((detail: { libtech?: string }) => {
            if (!detail.libtech) return;
            
            const libtech = detail.libtech;
            const template = parametricData.template_bis;
            const templateParts = template.split('_');
            
            let libtechCopy = libtech;
            const variants: Record<string, string> = {};
            
            // Extraire les variantes du libtech
            for (let i = 0; i < templateParts.length - 1; i++) {
                const fixedPart = templateParts[i];
                const fixedPartIndex = libtechCopy.indexOf(fixedPart);
                
                if (fixedPartIndex !== -1) {
                    libtechCopy = libtechCopy.substring(fixedPartIndex + fixedPart.length);
                    
                    if (i < templateParts.length - 1) {
                        const nextFixedPart = templateParts[i + 1];
                        const nextFixedPartIndex = libtechCopy.indexOf(nextFixedPart);
                        
                        if (nextFixedPartIndex !== -1) {
                            const variant = libtechCopy.substring(0, nextFixedPartIndex).trim();
                            const position = (i + 1).toString();
                            variants[position] = variant;
                        }
                    }
                }
            }
            
            // Ajouter cette combinaison à la carte
            Object.entries(variants).forEach(([position, variant]) => {
                if (!positionsMap.has(position)) {
                    positionsMap.set(position, new Map());
                }
                
                const variantMap = positionsMap.get(position);
                if (!variantMap.has(variant)) {
                    variantMap.set(variant, new Set());
                }
                
                // Ajouter les autres variantes comme valides pour cette combinaison
                Object.entries(variants).forEach(([otherPosition, otherVariant]) => {
                    if (position !== otherPosition) {
                        variantMap.get(variant).add(`${otherPosition}:${otherVariant}`);
                    }
                });
            });
        });
        
        return positionsMap;
    };
    
    // Construire la carte des combinaisons valides
    const validCombinationsMap = useMemo(() => buildValidCombinationsMap(), [parametricData]);
    
    // Fonction pour mettre à jour les options désactivées lorsqu'une variante est sélectionnée
    const updateDisabledOptions = (selectedPosition: string, selectedValue: string) => {
        if (!selectedValue) {
            // Si aucune valeur n'est sélectionnée, réactiver toutes les options
            setDisabledOptions({});
            return;
        }
        
        // Obtenir les combinaisons valides pour la valeur sélectionnée
        const validCombinations = validCombinationsMap.get(selectedPosition)?.get(selectedValue);
        if (!validCombinations) return;
        
        // Créer un nouvel objet pour les options désactivées
        const newDisabledOptions: Record<string, Set<string>> = {};
        
        // Pour chaque position
        Object.keys(parametricData.variables_by_position).forEach(position => {
            if (position !== selectedPosition) {
                // Créer un ensemble pour cette position
                newDisabledOptions[position] = new Set();
                
                // Pour chaque option de cette position
                const options = parametricData.variables_by_position[position];
                if (Array.isArray(options)) {
                    options.forEach(option => {
                        // Vérifier si cette option est valide avec la sélection actuelle
                        const isValid = validCombinations.has(`${position}:${option}`);
                        if (!isValid) {
                            newDisabledOptions[position].add(option);
                        }
                    });
                }
            }
        });
        
        setDisabledOptions(newDisabledOptions);
    };
    
    // Fonction pour vérifier si une option est désactivée
    const isOptionDisabled = (position: string, option: string) => {
        return disabledOptions[position]?.has(option) || false;
    };
    
    // Fonction pour générer la description actuelle
    const generateCurrentDescription = () => {
        if (!parametricData || !parametricData.template_bis) {
            return '';
        }
        
        let description = parametricData.template_bis;
        
        // Remplacer les underscores par les variantes sélectionnées
        Object.entries(selectedVariantsState).forEach(([position, variant]) => {
            description = description.replace('_', variant);
            console.log("position", position, "variant", variant)
        });
        
        return description;
    };
    
    // Fonction pour vérifier si la description actuelle correspond à une description similaire
    const checkMatchingDescription = () => {
        if (!parametricData || !parametricData.similar_libtechs_details) {
            return { exists: false, suggestions: [] };
        }
        
        const currentDescription = generateCurrentDescription();
        
        // Vérifier si la description existe exactement
        const matchingDetail = parametricData.similar_libtechs_details.find((detail: { libtech?: string, prix?: number }) => 
            detail.libtech && detail.libtech.trim() === currentDescription.trim()
        );
        
        if (matchingDetail) {
            // Mettre à jour la description et le prix dans l'objet
            if (parametricData.item_details) {
                parametricData.item_details.libtech = matchingDetail.libtech;
                parametricData.item_details.prix = matchingDetail.prix;
                handleUpdateObjectParametricData(object.id, parametricData);
            }
            return { exists: true, suggestions: [] };
        }
        
        // Si la description n'existe pas, trouver les suggestions
        const suggestions: string[] = [];
        
        // Analyser chaque libtech similaire pour trouver les différences
        parametricData.similar_libtechs_details.forEach((detail: { libtech?: string }) => {
            if (!detail.libtech) return;
            
            const libtech = detail.libtech;
            const template = parametricData.template_bis;
            const templateParts = template.split('_');
            
            let libtechCopy = libtech;
            const variants: Record<string, string> = {};
            
            // Extraire les variantes du libtech
            for (let i = 0; i < templateParts.length - 1; i++) {
                const fixedPart = templateParts[i];
                const fixedPartIndex = libtechCopy.indexOf(fixedPart);
                
                if (fixedPartIndex !== -1) {
                    libtechCopy = libtechCopy.substring(fixedPartIndex + fixedPart.length);
                    
                    if (i < templateParts.length - 1) {
                        const nextFixedPart = templateParts[i + 1];
                        const nextFixedPartIndex = libtechCopy.indexOf(nextFixedPart);
                        
                        if (nextFixedPartIndex !== -1) {
                            const variant = libtechCopy.substring(0, nextFixedPartIndex).trim();
                            const position = (i + 1).toString();
                            variants[position] = variant;
                        }
                    }
                }
            }
            
            // Comparer avec les variantes sélectionnées
            let differences = 0;
            let suggestion = "";
            
            Object.entries(variants).forEach(([position, variant]) => {
                if (selectedVariantsState[position] !== variant) {
                    differences++;
                    suggestion += `Position ${position}: ${selectedVariantsState[position] || '_'} → ${variant}\n`;
                }
            });
            
            // Si la différence est faible (1 ou 2 positions), ajouter comme suggestion
            if (differences <= 2) {
                suggestions.push(`Modification suggérée: ${suggestion.trim()}`);
            }
        });
        
        return { exists: false, suggestions };
    };
    
    // Obtenir l'état de la description
    const descriptionState = useMemo(() => checkMatchingDescription(), [selectedVariantsState, parametricData]);
    
    // Effet pour mettre à jour les options désactivées lorsque les variantes sélectionnées changent
    useEffect(() => {
        // Réinitialiser les options désactivées
        setDisabledOptions({});
        
        // Pour chaque variante sélectionnée, mettre à jour les options désactivées
        Object.entries(selectedVariantsState).forEach(([position, value]) => {
            if (value) {
                updateDisabledOptions(position, value);
            }
        });
    }, [selectedVariantsState]);
    
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
            url: `${BACKEND_URL}/files/fenêtre.glb`,
            price: 200,
            details: 'Fenêtre',
            position: object.position,
            gltf: mesh,
            rotation: object.rotation,
            scale: [1, 1, 1],
            color: '#FFFFFF',
            parentScale: object.scale,
            texture: '',
            isBatiChiffrageObject: false
        };
        onAddObject(newWindow);
    };

    const handleAddDoor = () => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: '#8B4513' });
        const mesh = new THREE.Mesh(geometry, material);

        const newDoor: ObjectData = {
            id: uuidv4(),
            url: `${BACKEND_URL}/files/porte.glb`,
            price: 500,
            details: 'Porte',
            position: object.position,
            gltf: mesh,
            rotation: object.rotation,
            scale: [1, 1, 1],
            color: '#8B4513',
            parentScale: object.scale,
            texture: '',
            isBatiChiffrageObject: false
        };
        onAddObject(newDoor);
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
                                {parametricData.template_bis ? (
                                    <p className="item-description">
                                        {(() => {
                                            const template = parametricData.template_bis;
                                            const libtech = parametricData.item_details.libtech;
                                            const parts = template.split('_');
                                            const result = [];
                                            
                                            let currentLibtech = libtech;
                                            let currentIndex = 0;

                                            for (let i = 0; i < parts.length; i++) {
                                                const part = parts[i];
                                                const partIndex = currentLibtech.indexOf(part, currentIndex);
                                                
                                                if (partIndex !== -1) {
                                                    // Si ce n'est pas le début, il y a une variante avant
                                                    if (partIndex > 0 && i > 0) {
                                                        const variant = currentLibtech.substring(0, partIndex);
                                                        result.push(<strong key={`variant-${i}`}>{variant}</strong>);
                                                    }
                                                    
                                                    // Ajouter la partie fixe
                                                    result.push(<span key={`fixed-${i}`}>{part}</span>);
                                                    
                                                    // Avancer dans le libtech
                                                    currentLibtech = currentLibtech.substring(partIndex + part.length);
                                                    currentIndex = 0;
                                                }
                                            }
                                            
                                            // Si il reste du texte après la dernière partie fixe
                                            if (currentLibtech.length > 0) {
                                                result.push(<strong key="variant-last">{currentLibtech}</strong>);
                                            }
                                            
                                            return result;
                                        })()}
                                    </p>
                                ) : (
                                    <p className="item-description">{parametricData.item_details.libtech}</p>
                                )}
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
                            {Object.entries(parametricData.variables_by_position).map(([position, options], index) => {
                                // Déterminer la valeur par défaut en utilisant les variantes extraites du libtech
                                const defaultOption = selectedVariants[position] || 
                                    (Array.isArray(options) && options.length > 0 ? options[0] : null);
                                
                                console.log("Position:", position, "Index:", index, "Options:", options, "Default:", defaultOption);
                                return (
                                <div key={position} className="variable-position">
                                    <span className="position-label">Position {index + 1}:</span>
                                    <Select
                                        className="position-select"
                                        options={Array.isArray(options) ? options.map(option => ({ 
                                            value: option, 
                                            label: option,
                                            isDisabled: isOptionDisabled(position, option)
                                        })) : []}
                                        defaultValue={defaultOption ? { value: defaultOption, label: defaultOption } : null}
                                        value={selectedVariantsState[position] ? 
                                            { value: selectedVariantsState[position], label: selectedVariantsState[position] } : 
                                            defaultOption ? { value: defaultOption, label: defaultOption } : null}
                                        onChange={(selectedOption: SingleValue<{value: string, label: string}>) => {
                                            console.log(`Changed position ${position} to:`, selectedOption);
                                            if (selectedOption) {
                                                updateDescriptionWithNewVariant(position, selectedOption.value);
                                                updateDisabledOptions(position, selectedOption.value);
                                            }
                                        }}
                                        isSearchable={false}
                                        isDisabled={Array.isArray(options) && options.length <= 1}
                                    />
                                </div>
                                );
                            })}
                            
                            {/* Afficher un message sur la correspondance de la description */}
                            <div className="description-status">
                                {descriptionState.exists ? (
                                    <div className="matching-description">
                                        <p>✓ Cette description correspond à un article existant</p>
                                    </div>
                                ) : (
                                    <div className="non-matching-description">
                                        <p>⚠ Cette description ne correspond à aucun article existant</p>
                                        {descriptionState.suggestions.length > 0 && (
                                            <div className="suggestions">
                                                <p>Suggestions pour obtenir une description existante:</p>
                                                <ul>
                                                    {descriptionState.suggestions.map((suggestion, index) => (
                                                        <li key={index}>{suggestion}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
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
