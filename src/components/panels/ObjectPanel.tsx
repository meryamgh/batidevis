import React, { useState, useEffect, useMemo } from 'react';
import { ObjectData } from '../../types/ObjectData';
import '../../styles/Controls.css';  
import '../../styles/ObjectPanel.css';
import Select, { SingleValue } from 'react-select'; 
import ParametricDataPanel from '../ParametricDataPanel';
        
type ObjectPanelProps = {
    object: ObjectData;
    onUpdateColor: (id: string, newColor: string) => void;
    onUpdatePosition: (id: string, position: [number, number, number]) => void;
    onClosePanel: () => void;
    onRotateObject: (id: string, newRotation: [number, number, number]) => void;
    onDeselectObject: (id: string) => void;
    handleUpdateObjectParametricData: (id: string, object : any) => void;
    parametricData?: any;
};


const ObjectPanel: React.FC<ObjectPanelProps> = ({
    object,
    onUpdatePosition,
    onClosePanel,
    onRotateObject,
    onDeselectObject,
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
    const [position, setPosition] = useState<[number, number, number]>(object.position);  
    const [recalculateYPosition, setRecalculateYPosition] = useState(false);
    // États pour les dimensions de la pièce
    const [roomWidth, setRoomWidth] = useState(object.scale[0]);
    const [roomLength, setRoomLength] = useState(object.scale[2]);
    const [roomHeight, setRoomHeight] = useState(3); // Valeur par défaut
    // État pour suivre le dernier objet étendu
    const [lastExtendedObject, setLastExtendedObject] = useState<ObjectData>(object);
    // État pour suivre tous les objets étendus
    const [extendedObjects, setExtendedObjects] = useState<ObjectData[]>([]);
    // État pour les variantes sélectionnées
    const [selectedVariantsState, setSelectedVariantsState] = useState<Record<string, string>>({});
    
    const [disabledOptions, setDisabledOptions] = useState<Record<string, Set<string>>>({});
    
    const extractSelectedVariants = () => {
        if (!parametricData || !parametricData.template_bis || !parametricData.item_details?.libtech) {
            return {};
        }
        
        const template = parametricData.template_bis;
        const libtech = parametricData.item_details.libtech;
        const selectedVariants: Record<string, string> = {};
        
        // Diviser le template en parties fixes
        const templateParts = template.split('_');
        
        // Si il n'y a qu'une seule partie, pas de variantes
        if (templateParts.length <= 1) {
            return selectedVariants;
        }
        
        let currentLibtech = libtech;
        let currentIndex = 0;
        let variantIndex = 0;
        
        // Pour chaque partie fixe du template
        for (let i = 0; i < templateParts.length; i++) {
            const fixedPart = templateParts[i];
            
            // Trouver cette partie fixe dans le libtech
            const fixedPartIndex = currentLibtech.indexOf(fixedPart, currentIndex);
            
            if (fixedPartIndex !== -1) {
                // Si ce n'est pas le début et qu'il y a du texte avant, c'est une variante
                if (fixedPartIndex > 0) {
                    const variant = currentLibtech.substring(0, fixedPartIndex).trim();
                    const position = variantIndex.toString();
                    selectedVariants[position] = variant;
                    variantIndex++;
                }
                
                // Avancer dans le libtech après cette partie fixe
                currentIndex = fixedPartIndex + fixedPart.length;
                currentLibtech = currentLibtech.substring(currentIndex);
                currentIndex = 0;
            }
        }
        
        // Si il reste du texte après la dernière partie fixe, c'est aussi une variante
        if (currentLibtech.length > 0) {
            const position = variantIndex.toString();
            selectedVariants[position] = currentLibtech.trim();
        }
        
        console.log("Extracted variants:", selectedVariants);
        return selectedVariants;
    };
    
    // Extraire les variantes sélectionnées à partir du libtech
    const selectedVariants = useMemo(() => extractSelectedVariants(), [parametricData]);
    
    // Initialiser l'état des variantes sélectionnées
    useEffect(() => {
        if (Object.keys(selectedVariants).length > 0) {
            console.log("Setting selectedVariantsState from extracted variants:", selectedVariants);
            setSelectedVariantsState(selectedVariants);
        }
    }, [selectedVariants]);
    
    // Effet pour synchroniser les variantes au chargement initial
    useEffect(() => {
        if (parametricData && parametricData.item_details?.libtech && Object.keys(selectedVariantsState).length === 0) {
            const extracted = extractSelectedVariants();
            if (Object.keys(extracted).length > 0) {
                console.log("Initial sync of variants:", extracted);
                setSelectedVariantsState(extracted);
            }
        }
    }, [parametricData]);

    // Réinitialiser les variantes sélectionnées si pas de données paramétriques ou pas de variantes dans le template
    useEffect(() => {
        if (!parametricData?.template_bis || !parametricData?.variables_by_position || !parametricData.template_bis.includes('_')) {
            setSelectedVariantsState({});
        }
    }, [parametricData]);
    
    // Fonction pour mettre à jour la description avec une nouvelle variante
    const updateDescriptionWithNewVariant = (position: string, newVariant: string) => {
        if (!parametricData || !parametricData.template_bis || !parametricData.item_details?.libtech) {
            return;
        }
        
        const template = parametricData.template_bis;
        const libtech = parametricData.item_details.libtech;
        const templateParts = template.split('_');
        
        // Si il n'y a qu'une seule partie, pas de variantes à mettre à jour
        if (templateParts.length <= 1) {
            return;
        }
        
        let currentLibtech = libtech;
        let currentIndex = 0;
        let updatedLibtech = libtech;
        let hasUpdated = false;
        let variantIndex = 0;
        
        // Pour chaque partie fixe du template
        for (let i = 0; i < templateParts.length; i++) {
            const fixedPart = templateParts[i];
            
            // Trouver cette partie fixe dans le libtech
            const fixedPartIndex = currentLibtech.indexOf(fixedPart, currentIndex);
            
            if (fixedPartIndex !== -1) {
                // Si ce n'est pas le début et qu'il y a du texte avant, c'est une variante
                if (fixedPartIndex > 0) {
                    const variant = currentLibtech.substring(0, fixedPartIndex).trim();
                    const currentPosition = variantIndex.toString();
                    
                    // Si c'est la position que nous cherchons, mettre à jour
                    if (currentPosition === position) {
                        // Calculer l'index global dans le libtech original
                        const globalIndex = libtech.length - currentLibtech.length + fixedPartIndex;
                        const variantStartIndex = globalIndex - variant.length;
                        
                        // Remplacer la variante
                        updatedLibtech = updatedLibtech.substring(0, variantStartIndex) + 
                                         newVariant + 
                                         updatedLibtech.substring(globalIndex);
                        
                        hasUpdated = true;
                        break;
                    }
                    variantIndex++;
                }
                
                // Avancer dans le libtech après cette partie fixe
                currentIndex = fixedPartIndex + fixedPart.length;
                currentLibtech = currentLibtech.substring(currentIndex);
                currentIndex = 0;
            }
        }
        
        // Si il reste du texte après la dernière partie fixe et que c'est la position recherchée
        if (!hasUpdated && currentLibtech.length > 0) {
            const currentPosition = variantIndex.toString();
            if (currentPosition === position) {
                // Remplacer la dernière variante
                const lastFixedPart = templateParts[templateParts.length - 1];
                const lastFixedPartIndex = updatedLibtech.lastIndexOf(lastFixedPart);
                
                if (lastFixedPartIndex !== -1) {
                    const variantStartIndex = lastFixedPartIndex + lastFixedPart.length;
                    updatedLibtech = updatedLibtech.substring(0, variantStartIndex) + newVariant;
                }
            }
        }
        
        // Mettre à jour la description dans l'interface
        if (parametricData.item_details) {
            parametricData.item_details.libtech = updatedLibtech;
        }
        
        // Mettre à jour les variantes sélectionnées
        const updatedVariants = {...selectedVariantsState};
        updatedVariants[position] = newVariant;
        setSelectedVariantsState(updatedVariants);
        
        // Mettre à jour les données paramétriques
        handleUpdateObjectParametricData(object.id, parametricData);
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
            
            // Si il n'y a qu'une seule partie, pas de variantes
            if (templateParts.length <= 1) {
                return;
            }
            
            let currentLibtech = libtech;
            let currentIndex = 0;
            const variants: Record<string, string> = {};
            
            // Pour chaque partie fixe du template
            for (let i = 0; i < templateParts.length; i++) {
                const fixedPart = templateParts[i];
                
                // Trouver cette partie fixe dans le libtech
                const fixedPartIndex = currentLibtech.indexOf(fixedPart, currentIndex);
                
                if (fixedPartIndex !== -1) {
                    // Si ce n'est pas le début et qu'il y a du texte avant, c'est une variante
                    if (fixedPartIndex > 0) {
                        const variant = currentLibtech.substring(0, fixedPartIndex).trim();
                        const position = (i).toString();
                        variants[position] = variant;
                    }
                    
                    // Avancer dans le libtech après cette partie fixe
                    currentIndex = fixedPartIndex + fixedPart.length;
                    currentLibtech = currentLibtech.substring(currentIndex);
                    currentIndex = 0;
                }
            }
            
            // Si il reste du texte après la dernière partie fixe, c'est aussi une variante
            if (currentLibtech.length > 0) {
                const lastPosition = (templateParts.length - 1).toString();
                variants[lastPosition] = currentLibtech.trim();
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
    
    // Fonction pour générer le texte avec les variantes sélectionnées
    const generateTextWithVariants = () => {
        if (!parametricData || !parametricData.template_bis) {
            return null;
        }
        
        const template = parametricData.template_bis;
        const parts = template.split('_');
        const result = [];
        let variantIndex = 0;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            // Ajouter la variante sélectionnée pour cette position (sauf pour la première partie)
            if (i > 0) {
                const position = (variantIndex - 1).toString();
                const selectedVariant = selectedVariantsState[position];
                if (selectedVariant) {
                    result.push(<strong key={`variant-${i-1}`} className="selected-variant">{selectedVariant}</strong>);
                } else {
                    result.push(<span key={`variant-${i-1}`} className="empty-variant">_</span>);
                }
            }
            
            // Ajouter la partie fixe
            result.push(<span key={`fixed-${i}`}>{part}</span>);
            variantIndex++;
        }
        
        // Ajouter la dernière variante si elle existe et n'a pas déjà été ajoutée
        const lastVariantIndex = Object.keys(selectedVariantsState).length - 1;
        if (lastVariantIndex >= 0) {
            const lastPosition = lastVariantIndex.toString();
            const lastVariant = selectedVariantsState[lastPosition];
            if (lastVariant && lastVariantIndex >= variantIndex - 1) {
                result.push(<strong key="variant-last" className="selected-variant">{lastVariant}</strong>);
            }
        }
        
        return result;
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
            
            // Si il n'y a qu'une seule partie, pas de variantes
            if (templateParts.length <= 1) {
                return;
            }
            
            let currentLibtech = libtech;
            let currentIndex = 0;
            const variants: Record<string, string> = {};
            
            // Pour chaque partie fixe du template
            for (let i = 0; i < templateParts.length; i++) {
                const fixedPart = templateParts[i];
                
                // Trouver cette partie fixe dans le libtech
                const fixedPartIndex = currentLibtech.indexOf(fixedPart, currentIndex);
                
                if (fixedPartIndex !== -1) {
                    // Si ce n'est pas le début et qu'il y a du texte avant, c'est une variante
                    if (fixedPartIndex > 0) {
                        const variant = currentLibtech.substring(0, fixedPartIndex).trim();
                        const position = (i).toString();
                        variants[position] = variant;
                    }
                    
                    // Avancer dans le libtech après cette partie fixe
                    currentIndex = fixedPartIndex + fixedPart.length;
                    currentLibtech = currentLibtech.substring(currentIndex);
                    currentIndex = 0;
                }
            }
            
            // Si il reste du texte après la dernière partie fixe, c'est aussi une variante
            if (currentLibtech.length > 0) {
                const lastPosition = (templateParts.length - 1).toString();
                variants[lastPosition] = currentLibtech.trim();
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
    
    // Fonction pour extraire toutes les variantes possibles depuis la source brute
    const extractAllPossibleVariants = () => {
        if (!parametricData || !parametricData.template_bis || !parametricData.similar_libtechs_details) {
            return {};
        }
        
        const allVariants: Record<string, Set<string>> = {};
        const template = parametricData.template_bis;
        const templateParts = template.split('_');
        
        // Si il n'y a qu'une seule partie, pas de variantes
        if (templateParts.length <= 1) {
            return {};
        }
        
        // Analyser chaque libtech similaire pour extraire toutes les variantes possibles
        parametricData.similar_libtechs_details.forEach((detail: { libtech?: string }) => {
            if (!detail.libtech) return;
            
            const libtech = detail.libtech;
            let currentLibtech = libtech;
            let currentIndex = 0;
            let variantIndex = 0;
            
            // Pour chaque partie fixe du template
            for (let i = 0; i < templateParts.length; i++) {
                const fixedPart = templateParts[i];
                
                // Trouver cette partie fixe dans le libtech
                const fixedPartIndex = currentLibtech.indexOf(fixedPart, currentIndex);
                
                if (fixedPartIndex !== -1) {
                    // Si ce n'est pas le début et qu'il y a du texte avant, c'est une variante
                    if (fixedPartIndex > 0) {
                        const variant = currentLibtech.substring(0, fixedPartIndex).trim();
                        const position = variantIndex.toString();
                        
                        if (!allVariants[position]) {
                            allVariants[position] = new Set();
                        }
                        allVariants[position].add(variant);
                        variantIndex++;
                    }
                    
                    // Avancer dans le libtech après cette partie fixe
                    currentIndex = fixedPartIndex + fixedPart.length;
                    currentLibtech = currentLibtech.substring(currentIndex);
                    currentIndex = 0;
                }
            }
            
            // Si il reste du texte après la dernière partie fixe, c'est aussi une variante
            if (currentLibtech.length > 0) {
                const position = variantIndex.toString();
                if (!allVariants[position]) {
                    allVariants[position] = new Set();
                }
                allVariants[position].add(currentLibtech.trim());
            }
        });
        
        // Convertir les Sets en Arrays
        const result: Record<string, string[]> = {};
        Object.entries(allVariants).forEach(([position, variantsSet]) => {
            result[position] = Array.from(variantsSet).sort();
        });
        
        console.log("Extracted all possible variants:", result);
        return result;
    };

    // Extraire toutes les variantes possibles depuis la source brute
    const allPossibleVariants = useMemo(() => extractAllPossibleVariants(), [parametricData]);
    
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
 


    const getMinYAxis = (object: ObjectData) => {
        if (object.boundingBox) {
            // Pour les murs, la position Y minimale doit être la moitié de la hauteur
            // car les murs sont centrés sur leur hauteur
            if (object.type === 'wall') {
                return object.scale[1] / 2; // La moitié de la hauteur du mur
            }
            // Pour les autres objets, utiliser la boundingBox
            return -object.boundingBox.min[1] / 2;
        }
        // Fallback pour les objets sans boundingBox
        if (object.type === 'wall') {
            return object.scale[1] / 2;
        }
        return 0;
    }

    

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

      
    

    // Ajouter l'objet original à extendedObjects lors de l'initialisation
    useEffect(() => {
        if (extendedObjects.length === 0) {
            setExtendedObjects([object]);
            setLastExtendedObject(object);
        }
    }, []); // Dépendance vide pour n'exécuter qu'une seule fois

   

    // Réinitialiser le dernier objet étendu lors de la fermeture du panneau
    const handleClosePanel = () => {
        setLastExtendedObject(object);
        setExtendedObjects([]);
        onClosePanel();
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
            {parametricData && (
                <div className="panel-section">
                    <h3 className="section-title">Données Paramétriques</h3>
                    
                    {/* Item details section with improved display */}
                    {parametricData.item_details && (
                        <div className="item-details">
                            <h4>Détails de l'article</h4>
                            <div className="item-property">
                                <span className="item-label">Description:</span>
                                {parametricData.template_bis && parametricData.template_bis.includes('_') && parametricData.variables_by_position ? (
                                    <div className="item-description" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                                        {(() => {
                                            // On reprend la logique de Variantes disponibles
                                            const template = parametricData.template_bis;
                                            const parts = template.split('_');
                                            const result = [];
                                            let variantIndex = 0;
                                            for (let i = 0; i < parts.length; i++) {
                                                // Partie fixe
                                                result.push(<span key={`fixed-${i}`}>{parts[i]}</span>);
                                                // Variante (sauf après le dernier)
                                                if (i < parts.length - 1) {
                                                    const position = variantIndex.toString();
                                                    const options = allPossibleVariants[position] || [];
                                                    const currentVariant = selectedVariantsState[position] || '';
                                                    result.push(
                                                        <span key={`select-${i}`} style={{ minWidth: 80, display: 'inline-block', margin: '0 2px' }}>
                                                            <Select
                                                                className="inline-variant-select"
                                                                options={options.map((option: string) => ({ value: option, label: option }))}
                                                                value={currentVariant ? { value: currentVariant, label: currentVariant } : null}
                                                                onChange={(selectedOption) => {
                                                                    if (selectedOption) {
                                                                        updateDescriptionWithNewVariant(position, selectedOption.value);
                                                                        updateDisabledOptions(position, selectedOption.value);
                                                                    }
                                                                }}
                                                                isSearchable={false}
                                                                isClearable={false}
                                                                menuPortalTarget={document.body}
                                                                menuPosition="fixed"
                                                                styles={{
                                                                    control: (base) => ({ ...base, minHeight: 24, height: 24, fontSize: 13 }),
                                                                    dropdownIndicator: (base) => ({ ...base, padding: 2 }),
                                                                    indicatorsContainer: (base) => ({ ...base, height: 24 }),
                                                                    valueContainer: (base) => ({ ...base, padding: '0 4px' }),
                                                                    menu: (base) => ({ ...base, zIndex: 100000 })
                                                                }}
                                                            />
                                                        </span>
                                                    );
                                                    variantIndex++;
                                                }
                                            }
                                            return result;
                                        })()}
                                    </div>
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
                            <span className="item-label">
                            Texte:
                            {descriptionState.exists && (
                                <span className="status-badge valid">✓ Valide</span>
                            )}
                            {!descriptionState.exists && Object.keys(selectedVariantsState).length > 0 && (
                                <span className="status-badge invalid">⚠ Non valide</span>
                            )}
                        </span>
                        </div>
                    )}

                    {/* TEXTE AVEC VARIANTES SÉLECTIONNÉES */}
                    {/* <div className="item-property">
                        <span className="item-label">
                            Texte:
                            {descriptionState.exists && (
                                <span className="status-badge valid">✓ Valide</span>
                            )}
                            {!descriptionState.exists && Object.keys(selectedVariantsState).length > 0 && (
                                <span className="status-badge invalid">⚠ Non valide</span>
                            )}
                        </span>
                        <div className="text-display">
                            {parametricData.template_bis ? (
                                <p className="text-with-variants">
                                    {generateTextWithVariants()}
                                </p>
                            ) : (
                                <p className="text-with-variants">{parametricData.item_details?.libtech || 'Aucun texte disponible'}</p>
                            )}
                        </div>
                    </div> */}

{/*                     
                    {parametricData.variables_by_position && (
                        <div className="variables-section">
                            <h4>Variantes disponibles</h4>
                            {Object.entries(allPossibleVariants).map(([position, options], index) => {
                                // Utiliser la variante extraite du libtech ou la première option disponible
                                const currentVariant = selectedVariantsState[position] || 
                                    (Array.isArray(options) && options.length > 0 ? options[0] : null);
                                
                                console.log(`Position ${position}:`, {
                                    currentVariant,
                                    availableOptions: options,
                                    selectedVariantsState: selectedVariantsState[position]
                                });
                                
                                return (
                                <div key={position} className="variable-position">
                                    <span className="position-label">Position {index + 1}:</span>
                                    <Select
                                        className="position-select"
                                        options={Array.isArray(options) ? options.map(option => ({ 
                                            value: option, 
                                            label: option,
                                            // isDisabled: isOptionDisabled(position, option)
                                        })) : []}
                                        value={currentVariant ? { value: currentVariant, label: currentVariant } : null}
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
                    )} */}
                    
                    {/* Template section for reference */}
                    {/* {parametricData.template && (
                        <div className="template-section">
                            <h4>Modèle complet</h4>
                            <p className="template-text">{parametricData.template}</p>
                        </div>
                    )} */}
                </div>
            )}

            {/* Add Parametric Data Panel
            {object.parametricData && (
                <ParametricDataPanel parametricData={object.parametricData} />
            )} */}
        </div>
    );
};


// Ajouter les styles au document
if (!document.getElementById('extend-controls-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'extend-controls-styles';
    document.head.appendChild(styleSheet);
}
// Ajout d'un style global pour garantir la visibilité des menus react-select inline
if (!document.getElementById('inline-variant-select-menu-style')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'inline-variant-select-menu-style';
    styleSheet.innerHTML = `.inline-variant-select__menu { z-index: 100010 !important; }`;
    document.head.appendChild(styleSheet);
}

export default ObjectPanel;