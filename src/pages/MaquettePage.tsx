import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createRoot, Root } from 'react-dom/client'; 
import { ObjectData, ObjectGroup } from '../types/ObjectData';
import * as THREE from 'three';
import '../styles/MaquettePage.css';
import { startDraggingPanel, closePanel, handleMouseMove } from '../utils/panelUtils';
import CanvasScene from '../components/CanvasScene';
import ObjectPanel from '../components/panels/ObjectPanel'; 
import TexturePanel from '../components/panels/TexturePanel';
import TextureUpload from '../components/panels/TextureUploadPanel';
import { useObjects } from '../hooks/useObjects';
import QuotePanel from '../components/panels/QuotePanel';
import NavigationHelpModal from '../components/panels/NavigationHelpModalPanel';
import '../styles/Controls.css';
import Toolbar from '../components/panels/ToolbarPanel';
import { useFloors } from '../hooks/useFloors';
import RoomConfigPanel from '../components/panels/RoomConfigPanel';
import FloorSelector from '../components/panels/FloorSelectorPanel'; 
import { v4 as uuidv4 } from 'uuid';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useMaquetteStore } from '../store/maquetteStore';
import { BACKEND_URL } from '../config/env';
import ObjectsPanel from '../components/panels/ObjectsPanel';
import ObjectControls from '../components/panels/ObjectControlsPanel';
import MultiSelectionPanel from '../components/panels/MultiSelectionPanel';
import { useAuth } from '../hooks/useAuth';
import { MaquetteService } from '../services/MaquetteService';
import { useLocation } from 'react-router-dom';
const MaquettePage: React.FC = () => {
    const { objects, quote, setObjects, setQuote } = useMaquetteStore();
    const { user } = useAuth();
    const location = useLocation();
    const raycaster = useRef(new THREE.Raycaster()); 
    const [showUpload, setShowUpload] = useState(false);
    const [showObjectUpload, setShowObjectUpload] = useState(false);
    const [showAIGeneration, setShowAIGeneration] = useState(false);
    const [isOrbitMode, setIsOrbitMode] = useState(true);
    const [isCharacterMode, setIsCharacterMode] = useState(false);
    const mouse = useRef(new THREE.Vector2());
    const cameraRef = useRef<THREE.Camera | null>(null); 
    const orbitControlsRef = useRef<any>(null);
    const groundPlaneRef = useRef<THREE.Mesh | null>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const draggerRef = useRef<HTMLDivElement>(null);
    const panelRootRef = useRef<Root | null>(null);  
    const [isMoving, setIsMoving] = useState<string | null>(null);
    const [isMovingMultiple, setIsMovingMultiple] = useState<boolean>(false);
    const [movingGroupCenter, setMovingGroupCenter] = useState<[number, number, number] | null>(null);
    const [movingGroupRelativePositions, setMovingGroupRelativePositions] = useState<Map<string, [number, number, number]>>(new Map());
    const [showDimensions, setShowDimensions] = useState<{ [key: string]: boolean }>({});
    const [viewMode, setViewMode] = useState<'3D' | '2D' | 'ObjectOnly'>('3D');
    const is2DView = viewMode === '2D' ;
    const isObjectOnlyView = viewMode === 'ObjectOnly';
    const [focusedObjectId, setFocusedObjectId] = useState<string | null>(null);
    const [showQuotePanel, setShowQuotePanel] = useState(true);
    const [quotePanelWidth, setQuotePanelWidth] = useState(300);
    const [isCreatingSurface, setIsCreatingSurface] = useState(false);
    const [surfaceStartPoint, setSurfaceStartPoint] = useState<THREE.Vector3 | null>(null);
    const [surfaceEndPoint, setSurfaceEndPoint] = useState<THREE.Vector3 | null>(null);
    const [surfacePreview, setSurfacePreview] = useState<THREE.Mesh | null>(null);
    const [selectedTexture, setSelectedTexture] = useState<string | undefined>(undefined);
    const [devisMetadata, setDevisMetadata] = useState<any>(null); // Métadonnées du devis

    

    const [creatingWallMode, setCreatingWallMode] = useState(false);
    const [walls2D, setWalls2D] = useState<THREE.Line[]>([]);
    const lineHelper = useRef<THREE.Line | null>(null);

    const [showRoomConfig, setShowRoomConfig] = useState(false);
    const [roomConfig, setRoomConfig] = useState({
        width: 10,
        length: 8,
        height: 3
    });
 
    const [currentFloor, setCurrentFloor] = useState(0);
    const [selectedFloor2D, setSelectedFloor2D] = useState(0);
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);


    const [showNavigationHelp, setShowNavigationHelp] = useState(false);
      const [showMenu, setShowMenu] = useState(false);

    // États pour la sélection multiple
    const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
    const [clipboard, setClipboard] = useState<ObjectGroup | null>(null);
    const [showMultiSelectionPanel, setShowMultiSelectionPanel] = useState(false);

    // Initialiser le hook useObjects avec les états mis à jour
    const objectsUtils = useObjects({
        objects, 
        quote, 
        setObjects,
        setQuote,
        setIsMoving,
        setShowDimensions,
        setFocusedObjectId,
    });

    // Fonction utilitaire pour charger les données d'une maquette
    const loadMaquetteData = async (data: any) => {
        if (!data.objects || !Array.isArray(data.objects)) {
            throw new Error('Format de données invalide');
        }
        
        console.log('🔍 Chargement de la maquette avec', data.objects.length, 'objets');
        
        // Nettoyer l'état actuel
        setObjects([]);
        setQuote([]);
        
        // Reconstruire avec les données
        const newObjects: ObjectData[] = [];
        const newQuote: ObjectData[] = [];
        
        for (const rawObjData of data.objects) { 
            const objData = cleanObjectData(rawObjData);
            
            console.log('📦 Objet:', objData.id, 'Type:', objData.type, 'URL:', objData.url, 'Position:', objData.position);
            
            // Distinguer les vrais objets 3D des lignes de devis pures
            // Un objet 3D valide doit avoir une position 3D et une géométrie
            const hasValid3DGeometry = objData.position && 
                                     Array.isArray(objData.position) && 
                                     objData.position.length === 3 &&
                                     (objData.url || objData.type === 'floor' || objData.type === 'wall' || objData.type === 'ceiling' || objData.type === 'object');
            
            if (hasValid3DGeometry) {
                console.log('✅ Vrai objet 3D détecté, ajouté à la maquette');
                // Les vrais objets 3D (murs, sols, etc.) vont dans la maquette
                // Utiliser les positions originales sans compensation
                const originalPosition = objData.position;
                
                if (objData.url) {
                    try {
                        const loader = new GLTFLoader();
                        const gltf = await loader.loadAsync(objData.url);
                        
                        const newObject: ObjectData = {
                            ...objData,
                            position: originalPosition, // Utiliser la position originale
                            gltf: gltf,
                            isBatiChiffrageObject: objData.isBatiChiffrageObject || false
                        };
                        
                        newObjects.push(newObject); 
                        console.log('✅ Objet 3D chargé avec URL:', objData.url);
                    } catch (error) {
                        console.error(`Erreur lors du chargement de l'objet ${objData.url}:`, error);
                    }
                } else {
                    const geometry = objData.type === 'floor' 
                        ? new THREE.PlaneGeometry(1, 1)
                        : new THREE.BoxGeometry(1, 1, 1);
                    
                    const material = new THREE.MeshStandardMaterial();
                    const mesh = new THREE.Mesh(geometry, material);
                    
                    const newObject: ObjectData = {
                        ...objData,
                        position: originalPosition, // Utiliser la position originale
                        gltf: mesh
                    };
                    
                    newObjects.push(newObject); 
                    console.log('✅ Objet 3D chargé avec géométrie par défaut');
                }
            } else {
                console.log('🚫 Ligne de devis pure détectée, ajoutée au quote uniquement');
            }
            
            // TOUS les objets vont dans le quote (pour la cohérence)
            newQuote.push({
                ...objData,
                gltf: undefined // Pas de représentation 3D dans le quote
            });
        }
         
        console.log('📊 Résultat du chargement:');
        console.log('  - Objets 3D chargés:', newObjects.length);
        console.log('  - Éléments de devis chargés:', newQuote.length);
        
        // Mettre à jour les états séparément
        setObjects(newObjects); // Seulement les vrais objets 3D
        setQuote(newQuote); // Tous les éléments (pour la cohérence)
        
        // Appliquer les textures et faces après un délai pour s'assurer que les objets sont bien chargés
        setTimeout(() => {
            for (const obj of newObjects) {
                if (obj.texture) { 
                    objectsUtils.handleUpdateTexture(obj.id, obj.texture);
                }
                if (obj.faces) { 
                    objectsUtils.handleUpdateFaces(obj.id, obj.faces);
                }
            }
        }, 500); // Délai plus long pour s'assurer que tous les objets sont bien chargés
    };

    // Fonction utilitaire pour charger les données d'une maquette en préservant les lignes de devis
    const loadMaquetteDataWithDevis = async (data: any, devisLines: ObjectData[]) => {
        if (!data.objects || !Array.isArray(data.objects)) {
            throw new Error('Format de données invalide');
        }
        
        console.log('🔍 Chargement de la maquette avec', data.objects.length, 'objets et', devisLines.length, 'lignes de devis à préserver');
        
        // Nettoyer seulement les objets 3D, pas le quote
        setObjects([]);
        
        // Reconstruire avec les données
        const newObjects: ObjectData[] = [];
        const maquetteQuoteItems: ObjectData[] = [];
        
        for (const rawObjData of data.objects) { 
            const objData = cleanObjectData(rawObjData);
            
            console.log('📦 Objet:', objData.id, 'Type:', objData.type, 'URL:', objData.url, 'Position:', objData.position);
            
            // Distinguer les vrais objets 3D des lignes de devis pures
            const hasValid3DGeometry = objData.position && 
                                     Array.isArray(objData.position) && 
                                     objData.position.length === 3 &&
                                     (objData.url || objData.type === 'floor' || objData.type === 'wall' || objData.type === 'ceiling' || objData.type === 'object');
            
            if (hasValid3DGeometry) {
                console.log('✅ Vrai objet 3D détecté, ajouté à la maquette');
                const originalPosition = objData.position;
                
                if (objData.url) {
                    try {
                        const loader = new GLTFLoader();
                        const gltf = await loader.loadAsync(objData.url);
                        
                        const newObject: ObjectData = {
                            ...objData,
                            position: originalPosition,
                            gltf: gltf,
                            isBatiChiffrageObject: objData.isBatiChiffrageObject || false
                        };
                        
                        newObjects.push(newObject); 
                        console.log('✅ Objet 3D chargé avec URL:', objData.url);
                    } catch (error) {
                        console.error(`Erreur lors du chargement de l'objet ${objData.url}:`, error);
                    }
                } else {
                    const geometry = objData.type === 'floor' 
                        ? new THREE.PlaneGeometry(1, 1)
                        : new THREE.BoxGeometry(1, 1, 1);
                    
                    const material = new THREE.MeshStandardMaterial();
                    const mesh = new THREE.Mesh(geometry, material);
                    
                    const newObject: ObjectData = {
                        ...objData,
                        position: originalPosition,
                        gltf: mesh
                    };
                    
                    newObjects.push(newObject); 
                    console.log('✅ Objet 3D chargé avec géométrie par défaut');
                }
            }
            
            // Ajouter les objets de la maquette au quote (sans gltf), mais exclure les lignes de devis
            // pour éviter les doublons avec les lignes venant du devis
            if (objData.type !== 'devis-item') {
                maquetteQuoteItems.push({
                    ...objData,
                    gltf: undefined
                });
            }
        }
        
        // Combiner intelligemment les objets de la maquette avec les lignes de devis préservées
        const combinedQuote: ObjectData[] = [];
        
        // 1. D'abord, ajouter toutes les lignes de devis (y compris celles qui correspondent à des objets 3D)
        for (const devisLine of devisLines) {
            // Vérifier si cette ligne de devis correspond à un objet 3D existant
            const correspondingObject = maquetteQuoteItems.find(item => 
                item.id === devisLine.id || 
                (item.details === devisLine.details && item.type === devisLine.type)
            );
            
            if (correspondingObject) {
                // Fusionner : utiliser l'objet 3D mais avec les données de prix du devis
                const mergedItem = {
                    ...correspondingObject,
                    price: devisLine.price,
                    quantity: devisLine.quantity,
                    unit: devisLine.unit
                };
                combinedQuote.push(mergedItem);
                console.log('🔄 Objet 3D + données devis fusionnés:', devisLine.details);
            } else {
                // Ligne de devis pure (sans objet 3D correspondant)
                combinedQuote.push(devisLine);
                console.log('➕ Ligne de devis pure ajoutée:', devisLine.details);
            }
        }
        
        // 2. NE PAS ajouter automatiquement les objets 3D qui ne sont pas dans le devis
        // Cela permet de garder des objets dans la maquette sans les facturer
         
        console.log('📊 Résultat du chargement avec fusion:');
        console.log('  - Objets 3D chargés:', newObjects.length);
        console.log('  - Objets de maquette dans quote (sans devis-item):', maquetteQuoteItems.length);
        console.log('  - Lignes de devis à traiter:', devisLines.length);
        console.log('  - Total éléments de quote FINAL:', combinedQuote.length);
        console.log('  - Détails dans combinedQuote:', combinedQuote.map(item => `${item.type}: ${item.details} (${item.price}€)`));
        
        // Mettre à jour les états
        setObjects(newObjects); // Seulement les vrais objets 3D
        setQuote(combinedQuote); // Objets de maquette + lignes de devis préservées
        
        // Appliquer les textures et faces après un délai
        setTimeout(() => {
            for (const obj of newObjects) {
                if (obj.texture) { 
                    objectsUtils.handleUpdateTexture(obj.id, obj.texture);
                }
                if (obj.faces) { 
                    objectsUtils.handleUpdateFaces(obj.id, obj.faces);
                }
            }
        }, 500);
    };

    // Charger automatiquement une maquette si elle est passée en paramètre de navigation
    useEffect(() => {
        console.log('🔄 MaquettePage - Démarrage du chargement des données');
        
        // Charger les données depuis location.state si disponibles (retour depuis FullQuote)
        if (location.state?.fromFullQuote && location.state?.devisData) {
            console.log('📊 Données reçues depuis FullQuote:', location.state.devisData);
            
            // Sauvegarder les métadonnées complètes du devis
            setDevisMetadata(location.state.devisData);
            console.log('💾 Métadonnées du devis sauvegardées dans MaquettePage');
            
            // Charger les lignes de devis dans le store si disponibles
            if (location.state.devisData.lines && Array.isArray(location.state.devisData.lines)) {
                console.log('📋 Chargement de', location.state.devisData.lines.length, 'lignes depuis FullQuote');
                console.log('📋 Détail des lignes reçues:', location.state.devisData.lines);
                // Convertir les lignes en format ObjectData pour le store
                const devisLinesFromFullQuote = location.state.devisData.lines.map((line: any, index: number) => ({
                    id: line.id || `devis-line-${index}-${Date.now()}`,
                    url: '',
                    price: line.price || 0,
                    details: line.details || 'Produit sans nom',
                    position: [0, 0, 0] as [number, number, number],
                    scale: [1, 1, 1] as [number, number, number],
                    texture: undefined,
                    rotation: [0, 0, 0] as [number, number, number],
                    color: '#ffffff',
                    startPoint: undefined,
                    endPoint: undefined,
                    parentScale: [1, 1, 1] as [number, number, number],
                    boundingBox: undefined,
                    faces: undefined,
                    type: 'devis-item' as const,
                    parametricData: undefined,
                    isBatiChiffrageObject: false,
                    gltf: undefined,
                    quantity: line.quantity || 1,
                    unit: line.unit || 'U'
                }));
                // Remplacer complètement le quote par les lignes venant de FullQuote
                // FullQuote contient l'état EXACT du devis (ce qui doit être facturé)
                setQuote(devisLinesFromFullQuote);
                console.log('✅ Quote remplacé par les lignes exactes de FullQuote (', devisLinesFromFullQuote.length, 'lignes)');
            }
        } else {
            // Fallback: charger les métadonnées du devis depuis localStorage (retour depuis FullQuote - ancien système)
            const devisMetadata = localStorage.getItem('devisMetadataForMaquette');
            if (devisMetadata) {
            try {
                const metadata = JSON.parse(devisMetadata);
                console.log('📊 Métadonnées du devis récupérées depuis FullQuote:', {
                    entreprise: {
                        devoTitle: metadata.info?.devoTitle,
                        devoName: metadata.info?.devoName,
                        devoSiren: metadata.info?.devoSiren
                    },
                    client: {
                        societeBatiment: metadata.info?.societeBatiment,
                        clientEmail: metadata.info?.clientEmail
                    },
                    devis: {
                        devisNumero: metadata.info?.devisNumero,
                        isDevisGratuit: metadata.info?.isDevisGratuit
                    },
                    totaux: metadata.totals,
                    logo: metadata.info?.logo ? 'PRÉSENT (' + metadata.info.logo.length + ' caractères)' : 'ABSENT',
                    mode: metadata.isEditingExisting ? 'MODIFICATION' : 'CRÉATION',
                    originalIds: metadata.isEditingExisting ? {
                        devisId: metadata.originalDevisId,
                        maquetteId: metadata.originalMaquetteId,
                        nom: metadata.originalDevisName
                    } : 'N/A'
                });
                
                // NE PAS nettoyer les métadonnées ici - elles seront nettoyées par FullQuote
                // localStorage.removeItem('devisMetadataForMaquette');
                console.log('📌 Métadonnées conservées pour FullQuote');
                
            } catch (error) {
                console.error('❌ Erreur lors du chargement des métadonnées du devis:', error);
                localStorage.removeItem('devisMetadataForMaquette');
            }
                    } else {
                console.log('📂 Aucune métadonnée de devis trouvée (navigation normale)');
            }
        }
        // Si on arrive sur /maquette sans données (nouveau devis), nettoyer les anciennes données
        // if (!location.state?.devisData && !location.state?.maquetteData) {
        //     console.log('🧹 Navigation vers nouveau devis - Nettoyage complet');
        //     localStorage.removeItem('devisDataToLoad');
        //     localStorage.removeItem('devisDataAutoSave');
        //     // Nettoyer aussi le store pour un nouveau devis
        //     setQuote([]);
        // }
        
        // D'abord, préparer les lignes de devis si elles existent
        let devisLines: ObjectData[] = [];
        if (location.state?.devisData) { 
            console.log('📋 Chargement des données de devis dans MaquettePage:', location.state.devisData);
            
            // Sauvegarder les métadonnées du devis (venant de MesDevisFactures)
            setDevisMetadata(location.state.devisData);
            console.log('💾 Métadonnées du devis sauvegardées depuis MesDevisFactures');
            
            // Les données du devis sont maintenant passées directement via location.state
            // Plus besoin de localStorage pour ce flux
            
            // Charger les lignes de devis dans le store pour les afficher dans QuotePanel
            if (location.state.devisData.lines && Array.isArray(location.state.devisData.lines)) {
                console.log('📋 Préparation de', location.state.devisData.lines.length, 'lignes de devis');
                
                // Convertir les lignes de devis en format ObjectData pour le store
                devisLines = location.state.devisData.lines.map((line: any, index: number) => ({
                    id: `devis-line-${index}-${Date.now()}`,
                    url: '',
                    price: line.price || 0,
                    details: line.details || 'Produit sans nom',
                    position: [0, 0, 0] as [number, number, number],
                    scale: [1, 1, 1] as [number, number, number],
                    texture: undefined,
                    rotation: [0, 0, 0] as [number, number, number],
                    color: '#ffffff',
                    startPoint: undefined,
                    endPoint: undefined,
                    parentScale: [1, 1, 1] as [number, number, number],
                    boundingBox: undefined,
                    faces: undefined,
                    type: 'devis-item' as const,
                    parametricData: undefined,
                    isBatiChiffrageObject: false,
                    gltf: undefined,
                    quantity: line.quantity || 1,
                    unit: line.unit || 'U'
                }));
                
                console.log('✅ Lignes de devis préparées');
            }
        }

        // Ensuite, charger la maquette en préservant les lignes de devis
        if (location.state?.maquetteData) {
            loadMaquetteDataWithDevis(location.state.maquetteData, devisLines);
         
            // Recentrer la caméra après le chargement de la maquette
            setTimeout(() => {
                if (orbitControlsRef.current) { 
                    orbitControlsRef.current.reset();
                    orbitControlsRef.current.update();
                }
            }, 1000);
        } else if (devisLines.length > 0) {
            // Si on a seulement des données de devis sans maquette, les charger directement
            setQuote(devisLines);
            console.log('✅ Lignes de devis chargées dans le store quote (sans maquette)');
        }
    }, [location.state, setQuote]);

    
 

    // Fonction pour étendre un objet
    const handleExtendObject = useCallback((sourceObject: ObjectData, direction: 'left' | 'right' | 'front' | 'back' | 'up' | 'down') => {
      

        // Calculer la nouvelle position en fonction de la direction
        const getNewPosition = () => {
            const [x, y, z] = sourceObject.position;
            const [width, height, depth] = sourceObject.scale;
            
            switch (direction) {
                case 'left':
                    return [x - width, y, z] as [number, number, number];
                case 'right':
                    return [x + width, y, z] as [number, number, number];
                case 'front':
                    return [x, y, z - depth] as [number, number, number];
                case 'back':
                    return [x, y, z + depth] as [number, number, number];
                case 'up':
                    return [x, y + height, z] as [number, number, number];
                case 'down':
                    return [x, y - height, z] as [number, number, number];
                default:
                    return [x, y, z] as [number, number, number];
            }
        };

        const newPosition = getNewPosition(); 

        // Créer une copie exacte de l'objet source avec la nouvelle position
        const newObject: ObjectData = {
            ...sourceObject,
            id: uuidv4(),
            position: newPosition
        };

        // Utiliser handleAddObject du hook useObjects pour ajouter l'objet
        objectsUtils.handleAddObjectFromData(newObject);

        return newObject;
    }, [objectsUtils]);

    // Fonction pour supprimer un objet (du devis ET de la maquette si c'est un objet 3D)
    const handleRemoveObject = useCallback((id: string) => {
        console.log('🗑️ MaquettePage.handleRemoveObject appelé pour ID:', id);
        console.log('📊 État actuel - objects:', objects.length, 'quote:', quote.length);
        
        // Trouver l'item dans le quote d'abord
        const itemInQuote = quote.find(item => item.id === id);
        if (!itemInQuote) {
            console.log('⚠️ Item non trouvé dans le quote:', id);
            return;
        }
        
        console.log('🔍 Item dans quote:', itemInQuote.details, 'type:', itemInQuote.type);
        
        // Debug: afficher quelques objets de la maquette pour comprendre la structure
        console.log('🏗️ Premiers objets dans maquette:', objects.slice(0, 2).map(obj => ({
            id: obj.id,
            details: obj.details,
            type: obj.type,
            price: obj.price
        })));
        
        // Vérifier si l'objet existe dans la maquette par ID
        let objectInMaquette = objects.find(obj => obj.id === id);
        console.log('🔍 Recherche par ID dans maquette:', objectInMaquette ? 'TROUVÉ' : 'NON TROUVÉ');
        
        // Si pas trouvé par ID, chercher par contenu (details, price) - on retire la condition sur le type
        if (!objectInMaquette) {
            // Essayer d'abord avec details + price + type
            objectInMaquette = objects.find(obj => 
                obj.details === itemInQuote.details && 
                obj.price === itemInQuote.price &&
                obj.type === itemInQuote.type
            );
            console.log('🔍 Recherche par contenu complet:', objectInMaquette ? `TROUVÉ: ${objectInMaquette.id}` : 'NON TROUVÉ');
            
            // Si toujours pas trouvé, essayer juste avec details + price
            if (!objectInMaquette) {
                objectInMaquette = objects.find(obj => 
                    obj.details === itemInQuote.details && 
                    obj.price === itemInQuote.price
                );
                console.log('🔍 Recherche par details + price:', objectInMaquette ? `TROUVÉ: ${objectInMaquette.id}` : 'NON TROUVÉ');
            }
            
            // En dernier recours, chercher juste par details
            if (!objectInMaquette) {
                objectInMaquette = objects.find(obj => 
                    obj.details === itemInQuote.details
                );
                console.log('🔍 Recherche par details seulement:', objectInMaquette ? `TROUVÉ: ${objectInMaquette.id}` : 'NON TROUVÉ');
            }
        }
        
        if (objectInMaquette) {
            // Objet 3D trouvé : supprimer de la maquette ET du devis
            console.log('🗑️ Suppression de la maquette ET du devis via removeObject');
            console.log('🎯 Suppression objet maquette ID:', objectInMaquette.id);
            console.log('🎯 Suppression objet devis ID:', id);
            
            // Supprimer l'objet de la maquette par son ID
            setObjects(prevObjects => prevObjects.filter(obj => obj.id !== objectInMaquette.id));
            // Supprimer l'item du devis par son ID
            setQuote(prevQuote => prevQuote.filter(item => item.id !== id));
        } else {
            // Ligne de devis pure : supprimer seulement du quote
            console.log('🗑️ Suppression du devis uniquement via setQuote');
            setQuote(prevQuote => prevQuote.filter(item => item.id !== id));
        }
        
        console.log('✅ handleRemoveObject terminé');
    }, [objects, quote, setObjects, setQuote]);

    // Fonctions pour la sélection multiple
    const handleMultiSelect = useCallback((id: string, isCtrlPressed: boolean) => {
        if (isCtrlPressed) {
            // Mode sélection multiple : ajouter ou retirer de la sélection
            setSelectedObjectIds(prev => {
                if (prev.includes(id)) {
                    const newSelection = prev.filter(objId => objId !== id);
                    if (newSelection.length === 0) {
                        setShowMultiSelectionPanel(false);
                        setSelectedObjectId(null);
                    }
                    return newSelection;
                } else {
                    const newSelection = [...prev, id];
                    if (newSelection.length === 1) {
                        setSelectedObjectId(id);
                    }
                    if (newSelection.length > 1) {
                        setShowMultiSelectionPanel(true);
                        setSelectedObjectId(null);
                    }
                    return newSelection;
                }
            });
        } else {
            // Mode sélection simple : sélectionner uniquement cet objet ou le désélectionner s'il est déjà sélectionné
            if (selectedObjectId === id) {
                // Désélectionner l'objet si on clique dessus à nouveau
                setSelectedObjectIds([]);
                setSelectedObjectId(null);
                setShowMultiSelectionPanel(false);
                closePanel();
            } else {
                // Sélectionner l'objet
                setSelectedObjectIds([id]);
                setSelectedObjectId(id);
                setShowMultiSelectionPanel(false);
            }
        }
    }, [selectedObjectId, closePanel]);

    const handleCopyObjects = useCallback((objectGroup: ObjectGroup) => {
        setClipboard(objectGroup); 
    }, []);

    const handlePasteObjects = useCallback((objectGroup: ObjectGroup, targetPosition: [number, number, number]) => {
        objectsUtils.handlePasteObjects(objectGroup, targetPosition);
    }, [objectsUtils]);

    const handleClearSelection = useCallback(() => {
        setSelectedObjectIds([]);
        setSelectedObjectId(null);
        setShowMultiSelectionPanel(false);
        closePanel();
    }, [closePanel]);

    // Nouvelle fonction pour désélectionner les objets quand on clique sur l'espace vide
    const handleDeselect = useCallback(() => { 
        setSelectedObjectIds([]);
        setSelectedObjectId(null);
        setShowMultiSelectionPanel(false);
        setIsMoving(null);
        closePanel();
    }, [closePanel]);

    // Fonction pour désélectionner un objet spécifique (utilisée par les panneaux)
    const handleDeselectObject = useCallback((objectId?: string) => {
        console.log('🎯 Deselecting object:', objectId);
        setSelectedObjectIds([]);
        setSelectedObjectId(null);
        setShowMultiSelectionPanel(false);
        setIsMoving(null);
        closePanel();
    }, [closePanel]);

    

    // Fonction simple pour fermer juste le panneau (utilisée par onClosePanel)
    const closePanelOnly = useCallback(() => {
        closePanel();
    }, [closePanel]);

    const handleRemoveSelectedObjects = useCallback(() => {
        objectsUtils.handleRemoveSelectedObjects(selectedObjectIds);
        setSelectedObjectIds([]);
        setShowMultiSelectionPanel(false);
    }, [objectsUtils, selectedObjectIds]);

    const handleMoveSelectedObjects = useCallback(() => {
        if (selectedObjectIds.length === 0) return;
        
        // Calculer le centre du groupe d'objets sélectionnés
        const selectedObjects = objects.filter(obj => selectedObjectIds.includes(obj.id));
        const centerPosition: [number, number, number] = [
            selectedObjects.reduce((sum, obj) => sum + obj.position[0], 0) / selectedObjects.length,
            selectedObjects.reduce((sum, obj) => sum + obj.position[1], 0) / selectedObjects.length,
            selectedObjects.reduce((sum, obj) => sum + obj.position[2], 0) / selectedObjects.length
        ];
        
        // Calculer les positions relatives de chaque objet par rapport au centre
        const relativePositions = new Map<string, [number, number, number]>();
        selectedObjects.forEach(obj => {
            const relativePos: [number, number, number] = [
                obj.position[0] - centerPosition[0],
                obj.position[1] - centerPosition[1],
                obj.position[2] - centerPosition[2]
            ];
            relativePositions.set(obj.id, relativePos);
        });
        
        // Initialiser le mode déplacement multiple
        setMovingGroupCenter(centerPosition);
        setMovingGroupRelativePositions(relativePositions);
        setIsMovingMultiple(true);
        setIsMoving(null); // Désactiver le déplacement simple
    }, [selectedObjectIds, objects]);

    const handleRotateSelectedObjects = useCallback((rotation: [number, number, number]) => {
        objectsUtils.handleRotateSelectedObjects(selectedObjectIds, rotation);
    }, [objectsUtils, selectedObjectIds]);

    const handleUpdateSelectedObjectsScale = useCallback((scale: [number, number, number]) => {
        objectsUtils.handleUpdateSelectedObjectsScale(selectedObjectIds, scale);
    }, [objectsUtils, selectedObjectIds]);

    const floorsUtils = useFloors({
        setObjects,
        setQuote,
        currentFloor,
        setCurrentFloor,
        setShowRoomConfig,
        roomConfig,
        objects,
    });
    
     

    useEffect(() => {
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({ 
            color: '#716e6e',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            roughness: 0.9,
            metalness: 0.1
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = 0; // S'assurer que le plan est à y=0
        plane.receiveShadow = true;
        groundPlaneRef.current = plane;
    }, []);

    const handleStopMovingMultiple = useCallback(() => {
        setIsMovingMultiple(false);
        setMovingGroupCenter(null);
        setMovingGroupRelativePositions(new Map());
    }, []);

    useEffect(() => {
        const handleMouseMoveCallback = (e: MouseEvent) => {
            if (isMoving !== null && cameraRef.current) {
                handleMouseMove(e, isMoving, mouse, raycaster, setObjects, cameraRef.current);
            } else if (isMovingMultiple && movingGroupCenter && cameraRef.current) {
                // Gérer le déplacement de plusieurs objets
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

                raycaster.current.setFromCamera(mouse.current, cameraRef.current);
                const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
                const intersection = new THREE.Vector3();
                raycaster.current.ray.intersectPlane(groundPlane, intersection);

                // Calculer la nouvelle position du centre du groupe
                const newCenterPosition: [number, number, number] = [
                    intersection.x / 2,
                    movingGroupCenter[1], // Garder la hauteur Y originale
                    intersection.z / 2
                ];

                // Mettre à jour la position de tous les objets sélectionnés
                setObjects((prevObjects) =>
                    prevObjects.map((obj) => {
                        if (selectedObjectIds.includes(obj.id)) {
                            const relativePos = movingGroupRelativePositions.get(obj.id);
                            if (relativePos) {
                                return {
                                    ...obj,
                                    position: [
                                        newCenterPosition[0] + relativePos[0],
                                        newCenterPosition[1] + relativePos[1],
                                        newCenterPosition[2] + relativePos[2]
                                    ] as [number, number, number],
                                };
                            }
                        }
                        return obj;
                    })
                );

                // Mettre à jour le centre du groupe
                setMovingGroupCenter(newCenterPosition);
            }
        };

        const handleMouseUpCallback = () => {
            if (isMovingMultiple) {
                handleStopMovingMultiple();
            }
        };

        if (isMoving !== null || isMovingMultiple) {
            document.addEventListener('mousemove', handleMouseMoveCallback);
            document.addEventListener('mouseup', handleMouseUpCallback);
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enabled = false;
            }
        } else {
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enabled = true;
            }
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMoveCallback);
            document.removeEventListener('mouseup', handleMouseUpCallback);
        };
    }, [isMoving, isMovingMultiple, movingGroupCenter, movingGroupRelativePositions, selectedObjectIds, objects, handleStopMovingMultiple]);

    useEffect(() => {
        if (is2DView) {
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enabled = true;
            }
            return;
        }
        if (isMoving !== null || isMovingMultiple) {
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enabled = false;
            }
        } else {
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enabled = true;
            }
        }
    }, [isMoving, isMovingMultiple, is2DView, orbitControlsRef]);

    useEffect(() => {
        if (orbitControlsRef.current) {
            orbitControlsRef.current.enableRotate = !is2DView;
        }
    }, [is2DView]);

    useEffect(() => {
        // Ensure that any character mode is disabled when changing view modes
        const disableCharacterMode = () => {
            // This will be handled by the CanvasScene component's useEffect
            // that watches for changes in isObjectOnlyView and is2DView
        };

        // Call the function when view mode changes
        disableCharacterMode();

        if (viewMode === 'ObjectOnly') {
            // If we have objects and no focused object is set, focus on the first object
            if (objects.length > 0 && !focusedObjectId) {
                setFocusedObjectId(objects[0].id);
            }
            
            // Hide UI elements that are not needed in ObjectOnly mode
            if (leftPanelRef.current) {
                leftPanelRef.current.style.width = '0';
            }
            if (rightPanelRef.current) {
                rightPanelRef.current.style.width = '0';
            }
            
            // Disable orbit controls zooming out
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enableZoom = false;
                orbitControlsRef.current.minDistance = 2;
                orbitControlsRef.current.maxDistance = 20;
            }
        } else {
            // Reset focused object when leaving ObjectOnly mode
            setFocusedObjectId(null);
            
            // Restore UI elements
            if (leftPanelRef.current) {
                leftPanelRef.current.style.width = '250px';
            }
            if (rightPanelRef.current && showQuotePanel) {
                rightPanelRef.current.style.width = `${quotePanelWidth}px`;
            }
            
            // Re-enable orbit controls zooming
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enableZoom = true;
                orbitControlsRef.current.minDistance = 1;
                orbitControlsRef.current.maxDistance = 1000;
            }
        }
    }, [viewMode, objects, focusedObjectId, showQuotePanel, quotePanelWidth]);

    // Effet pour gérer le redimensionnement du panneau de devis
    useEffect(() => {
        const dragger = draggerRef.current;
        const leftPanel = leftPanelRef.current;
        const rightPanel = rightPanelRef.current;

        if (!dragger || !leftPanel || !rightPanel) return;

        let isDragging = false;
        let startX = 0;
        let startRightWidth = 0;

        const handleMouseDown = (e: MouseEvent) => {
            isDragging = true;
            startX = e.clientX;
            startRightWidth = rightPanel.offsetWidth;
            
            // Appliquer des styles pendant le redimensionnement
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            dragger.classList.add('dragger-active');
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            
            // Calculer la différence de position
            const deltaX = e.clientX - startX;
            
            // Calculer la nouvelle largeur avec des limites
            // Quand on déplace vers la gauche, deltaX est négatif, donc la largeur diminue
            // Quand on déplace vers la droite, deltaX est positif, donc la largeur augmente
            const newWidth = Math.max(200, Math.min(600, startRightWidth - deltaX));
            
            // Appliquer la nouvelle largeur
            rightPanel.style.width = `${newWidth}px`;
            setQuotePanelWidth(newWidth);
        };

        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = 'default';
                document.body.style.userSelect = '';
                dragger.classList.remove('dragger-active');
            }
        };

        // Ajouter les écouteurs d'événements
        dragger.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            // Nettoyer les écouteurs d'événements
            dragger.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [showQuotePanel]);

    // Effet pour mettre à jour la visibilité du panneau de devis
    useEffect(() => {
        const rightPanel = rightPanelRef.current;
        
        if (rightPanel) {
            if (showQuotePanel) {
                rightPanel.style.width = `${quotePanelWidth}px`;
                rightPanel.style.display = 'block';
            } else {
                rightPanel.style.width = '0';
                rightPanel.style.display = 'none';
            }
        }
    }, [showQuotePanel, quotePanelWidth]);

    const setCamera = useCallback((camera: THREE.Camera) => {
        cameraRef.current = camera;
    }, []);
 
 

    // Fonction pour afficher le panneau d'objet
    const renderObjectPanel = useCallback((selectedObject: ObjectData) => {
        // Chercher l'objet dans le state (objects) pour voir s'il a déjà une version modifiée
        const localObject = objects.find(obj => obj.id === selectedObject.id);

        const panel = document.getElementById('floating-panel');
        setCreatingWallMode(false);
        setSelectedObjectId(selectedObject.id);
        if (selectedObject.texture) {
            setSelectedTexture(selectedObject.texture);
        }

        if (panel) {
            panel.style.display = 'block';
            panel.style.setProperty('display', 'block', 'important');
            if (!panelRootRef.current) {
                panelRootRef.current = createRoot(panel);
            }

            // Si on a déjà des données paramétriques locales, on les utilise
            if (localObject && localObject.parametricData) {
                panelRootRef.current?.render(
                    <ObjectPanel
                        object={localObject}
                        onUpdateColor={objectsUtils.handleUpdateColor}
                        onUpdatePosition={objectsUtils.handleUpdatePosition}
                        onClosePanel={() => {
                            closePanel();
                            setIsMoving(null);
                            setSelectedObjectId(null);
                        }}
                        onRotateObject={objectsUtils.handleRotateObject}
                        onDeselectObject={handleDeselectObject}
                        parametricData={localObject.parametricData}
                        handleUpdateObjectParametricData={objectsUtils.handleUpdateObjectParametricData}
                    />
                );
                return;
            }

            // Sinon, on fait le fetch comme avant
            const fetchParametricData = async () => {
                try {
                    const response = await fetch(`${BACKEND_URL}/api/parametric_data`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: selectedObject.details
                        })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        panelRootRef.current?.render(
                            <ObjectPanel
                                object={selectedObject}
                                onUpdateColor={objectsUtils.handleUpdateColor}
                                onUpdatePosition={objectsUtils.handleUpdatePosition}
                                onClosePanel={closePanelOnly}
                                onRotateObject={objectsUtils.handleRotateObject}
                                onDeselectObject={handleDeselectObject}
                                parametricData={data}
                                handleUpdateObjectParametricData={objectsUtils.handleUpdateObjectParametricData}
                            />
                        );
                    } else {
                        renderPanelWithoutParametricData();
                    }
                } catch (error) {
                    renderPanelWithoutParametricData();
                }
            };
            const renderPanelWithoutParametricData = () => {
                panelRootRef.current?.render(
                    <ObjectPanel
                        object={selectedObject}
                        onUpdateColor={objectsUtils.handleUpdateColor}
                        onUpdatePosition={objectsUtils.handleUpdatePosition}
                        onClosePanel={() => {
                            closePanel();
                            setIsMoving(null);
                            setSelectedObjectId(null);
                        }}
                        onRotateObject={objectsUtils.handleRotateObject}
                        onDeselectObject={handleDeselectObject}
                        handleUpdateObjectParametricData={objectsUtils.handleUpdateObjectParametricData}
                    />
                );
            };
            fetchParametricData();
        }
    }, [objects, objectsUtils, setCreatingWallMode, setSelectedObjectId, setSelectedTexture, setIsMoving, closePanel]);

    // Fonction pour basculer l'affichage du panneau de devis
    const toggleQuotePanel = useCallback(() => {
        setShowQuotePanel(prev => !prev);
    }, []);

    // Wrapper pour handleObjectClick qui utilise la fonction du hook
    const onObjectClick = useCallback((id: string, point?: THREE.Vector3) => { 

        
        // Arrêter le déplacement multiple si actif
        if (isMovingMultiple) { 
            handleStopMovingMultiple();
            return;
        }

        if (isCreatingSurface && point) { 
            if (!surfaceStartPoint) {
                // Premier clic : définir le point de départ
                setSurfaceStartPoint(point);
                
                // Créer un aperçu de la surface
                const previewGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
                const previewMaterial = new THREE.MeshStandardMaterial({ 
                    color: '#808080',
                    transparent: true,
                    opacity: 0.5
                });
                const preview = new THREE.Mesh(previewGeometry, previewMaterial);
                preview.position.copy(point);
                setSurfacePreview(preview);
            } else {
                // Deuxième clic : créer la surface
                createSurface(surfaceStartPoint, point);
            }
        } else {
            // Gestion de la sélection multiple
            const isCtrlPressed = false; // Cette valeur sera gérée par GLTFObject 
            handleMultiSelect(id, isCtrlPressed);
            
            // Si c'est une sélection simple, afficher le panneau d'objet
            if (!isCtrlPressed) { 
                objectsUtils.handleObjectClick(id, viewMode, renderObjectPanel);
            }
        }
    }, [objectsUtils, viewMode, is2DView, renderObjectPanel, isCreatingSurface, surfaceStartPoint, handleMultiSelect, isMovingMultiple, handleStopMovingMultiple, objects]);
    
   
  
    
    // Ajouter la fonction pour créer la surface
    const createSurface = (start: THREE.Vector3, end: THREE.Vector3) => {
        const width = Math.abs(end.x - start.x);
        const depth = Math.abs(end.z - start.z);
        
        const geometry = new THREE.BoxGeometry(width, 0.1, depth);
        const material = new THREE.MeshStandardMaterial({ 
            color: '#f0f0f0',
            roughness: 0.8,
            metalness: 0.2
        });
        const mesh = new THREE.Mesh(geometry, material);

        const centerX = (start.x + end.x) / 2;
        const centerZ = (start.z + end.z) / 2;
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const boundingBox = {
            min: [box.min.x, box.min.y, box.min.z] as [number, number, number],
            max: [box.max.x, box.max.y, box.max.z] as [number, number, number],
            size: [size.x, size.y, size.z] as [number, number, number],
            center: [center.x, center.y, center.z] as [number, number, number]
        };
        
        const newSurface: ObjectData = {
            id: uuidv4(),
            url: '',
            price: 100,
            details: 'Surface',
            position: [centerX / 2, 0.05, centerZ / 2],
            gltf: mesh,
            rotation: [0, 0, 0],
            scale: [width, 0.1, depth],
            color: '#f0f0f0',
            isBatiChiffrageObject: false,
            texture: selectedTexture || '',
            boundingBox: boundingBox
        };

        setObjects((prev: ObjectData[]) => [...prev, newSurface]);
        setQuote((prev: ObjectData[]) => [...prev, newSurface]);
        
        // Réinitialiser les états
        setSurfaceStartPoint(null);
        setSurfaceEndPoint(null);
        setSurfacePreview(null);
        setIsCreatingSurface(false);
    };
    
    // Fonction pour gérer la sélection d'un point pour la surface
    const handleSurfacePointSelected = useCallback((point: THREE.Vector3) => {
        if (!surfaceStartPoint) {
            setSurfaceStartPoint(point);
        } else {
            const width = Math.abs(point.x - surfaceStartPoint.x);
            const depth = Math.abs(point.z - surfaceStartPoint.z);
            
            const geometry = new THREE.BoxGeometry(width, 0.1, depth);
            const material = new THREE.MeshStandardMaterial({ 
                color: '#f0f0f0',
                roughness: 0.8,
                metalness: 0.2
            });
            const mesh = new THREE.Mesh(geometry, material);

            const centerX = (surfaceStartPoint.x + point.x) / 2;
            const centerZ = (surfaceStartPoint.z + point.z) / 2;
            const box = new THREE.Box3().setFromObject(mesh);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            box.getSize(size);
            box.getCenter(center);

            const boundingBox = {
                min: [box.min.x, box.min.y, box.min.z] as [number, number, number],
                max: [box.max.x, box.max.y, box.max.z] as [number, number, number],
                size: [size.x, size.y, size.z] as [number, number, number],
                center: [center.x, center.y, center.z] as [number, number, number]
            };

            const newSurface: ObjectData = {
                id: uuidv4(),
                url: '',
                price: 100,
                details: 'Surface',
                position: [centerX / 2, 0.05, centerZ / 2],
                gltf: mesh,
                isBatiChiffrageObject: false,
                rotation: [0, 0, 0],
                scale: [width, 0.1, depth],
                color: '#f0f0f0',
                texture: '',
                boundingBox: boundingBox
            };

            setObjects((prev: ObjectData[]) => [...prev, newSurface]);
            setQuote((prev: ObjectData[]) => [...prev, newSurface]);
            
            // Réinitialiser les états
            setSurfaceStartPoint(null);
            setSurfaceEndPoint(null);
            setSurfacePreview(null);
            setIsCreatingSurface(false);
        }
    }, [surfaceStartPoint, setObjects, setQuote]);
    
    // Fonction pour mettre à jour l'aperçu de la surface
    const handleSurfacePreviewUpdate = useCallback((start: THREE.Vector3, end: THREE.Vector3) => {
        // Calculer les dimensions en fonction des points de départ et d'arrivée
        const width = Math.abs(end.x - start.x);
        const depth = Math.abs(end.z - start.z);
        
        // Calculer le centre de la surface
        const centerX = (start.x + end.x) / 2;
        const centerZ = (start.z + end.z) / 2;
        
        if (!surfacePreview) {
            // Créer un nouvel aperçu avec une géométrie unitaire
            const geometry = new THREE.BoxGeometry(1, 0.1, 1);
            
            // Choisir la couleur selon le mode (2D = blanc/gris clair, 3D = gris)
            const previewColor = is2DView ? '#ffffff' : '#808080';
            
            const material = new THREE.MeshStandardMaterial({ 
                color: previewColor,
                transparent: true,
                opacity: 0.5,
                roughness: 0.8,
                metalness: 0.2
            });
            const mesh = new THREE.Mesh(geometry, material);
            
            // Appliquer l'échelle et la position
            mesh.scale.set(width, 0.1, depth);
            mesh.position.set(centerX, 0.05, centerZ);
            
            setSurfacePreview(mesh);
        } else {
            // Mettre à jour l'aperçu existant
            surfacePreview.scale.set(width, 0.1, depth);
            surfacePreview.position.set(centerX, 0.05, centerZ);
            
            // Mettre à jour la couleur selon le mode
            const previewColor = is2DView ? '#ffffff' : '#808080';
            if (surfacePreview.material instanceof THREE.MeshStandardMaterial) {
                surfacePreview.material.color.set(previewColor);
            }
        }
        
        setSurfaceEndPoint(end);
    }, [surfacePreview, is2DView]);

    // Fonction pour nettoyer et valider les données d'un objet
    const cleanObjectData = (objData: any): any => {
        // Validation et nettoyage des positions
        let position = [0, 0, 0];
        if (Array.isArray(objData.position) && objData.position.length === 3) {
            position = objData.position.map((coord: any) => {
                const num = Number(coord);
                return isNaN(num) ? 0 : num;
            });
        }
        
        // Validation et nettoyage des échelles
        let scale = [1, 1, 1];
        if (Array.isArray(objData.scale) && objData.scale.length === 3) {
            scale = objData.scale.map((coord: any) => {
                const num = Number(coord);
                return isNaN(num) ? 1 : num;
            });
        }
        
        // Validation et nettoyage des rotations
        let rotation = [0, 0, 0];
        if (Array.isArray(objData.rotation) && objData.rotation.length === 3) {
            rotation = objData.rotation.map((coord: any) => {
                const num = Number(coord);
                return isNaN(num) ? 0 : num;
            });
        }
        
        return {
            ...objData,
            id: objData.id || `obj_${Date.now()}_${Math.random()}`,
            price: typeof objData.price === 'number' ? objData.price : 100,
            details: objData.details || 'Objet importé',
            position: position,
            scale: scale,
            rotation: rotation,
            parametricData: objData.parametricData && typeof objData.parametricData === 'object' ? objData.parametricData : {},
            texture: objData.texture || '',
            color: objData.color || '',
            type: objData.type || 'object',
            faces: objData.faces && typeof objData.faces === 'object' ? objData.faces : undefined,
            boundingBox: objData.boundingBox && typeof objData.boundingBox === 'object' ? objData.boundingBox : undefined,
            isBatiChiffrageObject: Boolean(objData.isBatiChiffrageObject)
        };
    };

    const reconstructMaquette = async () => {
        try {
            // Charger la dernière maquette depuis Supabase
            const lastMaquette = await MaquetteService.getLastMaquette();
            
            if (!lastMaquette) {
                alert('Aucune maquette sauvegardée trouvée. Veuillez d\'abord sauvegarder une maquette.');
                return;
            }
            
            const data = lastMaquette.data;
            
            // Nettoyer et valider les données
            if (!data.objects || !Array.isArray(data.objects)) {
                console.error('Données de maquette invalides:', data);
                alert('Les données de maquette sont corrompues ou invalides.');
                return;
            }
            
            // Vider la scène actuelle
            setObjects([]);
            setQuote([]);
            
            // Créer un tableau temporaire pour stocker tous les objets
            const newObjects: ObjectData[] = [];
            
            // Reconstruire chaque objet
            for (const rawObjData of data.objects) {
                // Nettoyer et valider les données de l'objet
                const objData = cleanObjectData(rawObjData);
                
                // Compensation des positions pour les murs créés avec useFloors
                let adjustedPosition = objData.position;
                    // Les murs créés avec useFloors ont des positions divisées par 4.08
                    // Nous devons les multiplier par 4.08 pour retrouver les vraies positions
                    adjustedPosition = [
                        objData.position[0] /2,
                        objData.position[1] /2,
                        objData.position[2] /2
                    ]; 
                
                
                if (objData.url) {
                    // Pour les objets GLTF
                    try {
                        const loader = new GLTFLoader();
                        const gltf = await loader.loadAsync(objData.url);
                        
                        // Créer le nouvel objet avec toutes les propriétés
                        const newObject: ObjectData = {
                            ...objData,
                            position: adjustedPosition, // Utiliser la position compensée
                            gltf: gltf,
                            isBatiChiffrageObject: objData.isBatiChiffrageObject || false
                        };
                        
                        newObjects.push(newObject);
                    } catch (error) {
                        console.error(`Erreur lors du chargement de l'objet ${objData.url}:`, error);
                    }
                } else {
                    // Pour les murs et sols
                    const geometry = objData.type === 'floor' 
                        ? new THREE.PlaneGeometry(1, 1)
                        : new THREE.BoxGeometry(1, 1, 1);
                    
                    const material = new THREE.MeshStandardMaterial();
                    const mesh = new THREE.Mesh(geometry, material);
                    
                    const newObject: ObjectData = {
                        ...objData,
                        position: adjustedPosition, // Utiliser la position compensée
                        gltf: mesh
                    };
                    
                    newObjects.push(newObject);
                }
            }
            
            // Mettre à jour la scène avec tous les objets d'un coup
            setObjects(newObjects);
            setQuote(newObjects);
            
            // Appliquer les textures et faces après que tous les objets sont chargés
            for (const obj of newObjects) {
                if (obj.texture) {
                    objectsUtils.handleUpdateTexture(obj.id, obj.texture);
                }
                if (obj.faces) {
                    objectsUtils.handleUpdateFaces(obj.id, obj.faces);
                }
            }
            
        } catch (error) {
            console.error('Erreur lors de la reconstruction:', error);
            alert('Erreur lors du chargement de la maquette. Veuillez vérifier que le fichier est valide.');
        }
    };

    // Fonction pour récupérer une maquette de sauvegarde
    const handleLoadBackupMaquette = async () => {
        try {
            // Récupérer toutes les maquettes de l'utilisateur
            const userMaquettes = await MaquetteService.getUserMaquettes();
            
            if (userMaquettes.length === 0) {
                alert('Aucune maquette sauvegardée trouvée. Veuillez d\'abord sauvegarder une maquette.');
                return;
            }
            
            // Si une seule maquette, la charger directement
            if (userMaquettes.length === 1) {
                await loadMaquetteData(userMaquettes[0].data); 
                return;
            }
            
            // Si plusieurs maquettes, demander à l'utilisateur de choisir
            const maquetteNames = userMaquettes.map(m => m.name);
            const selectedName = prompt(
                `Choisissez une maquette à charger:\n${maquetteNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}\n\nEntrez le numéro de la maquette (1-${userMaquettes.length}):`,
                '1'
            );
            
            if (!selectedName) return;
            
            const selectedIndex = parseInt(selectedName) - 1;
            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= userMaquettes.length) {
                alert('Numéro invalide. Veuillez réessayer.');
                return;
            }
            
            const selectedMaquette = userMaquettes[selectedIndex];
            await loadMaquetteData(selectedMaquette.data); 
            
        } catch (error) {
            console.error('Erreur lors du chargement des maquettes:', error);
            alert('Erreur lors du chargement des maquettes. Veuillez réessayer.');
        }
    };

    const handleAddWall2D = (start: THREE.Vector3, end: THREE.Vector3) => { 
        const baseWallHeight = 3;
        // Hauteur ajustée en fonction de l'étage courant
        const wallHeight = baseWallHeight;
        // Position Y ajustée en fonction de l'étage
        const wallPositionY = currentFloor * baseWallHeight;
        
        const wallWidth = 0.2;
        const wallLength = start.distanceTo(end);
        const pricePerUnitLength = 10;
        const wallPrice = Math.round(wallLength * pricePerUnitLength);
        const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallWidth);
        const wallMaterial = new THREE.MeshBasicMaterial({
            color: '#000000',
            side: THREE.DoubleSide
        });
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        midPoint.y = wallPositionY; // Ajuster la hauteur en fonction de l'étage
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const angle = Math.atan2(direction.z, direction.x);
        const boundingBox = new THREE.Box3();
        boundingBox.setFromObject(wallMesh);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        // Arrondir les dimensions au millimètre près
        const roundedScale: [number, number, number] = [
            Math.round(wallLength * 1000) / 1000,
            Math.round(wallHeight * 1000) / 1000,
            Math.round(wallWidth * 1000) / 1000
        ];

        const newWallObject: ObjectData = {
            id: uuidv4(),
            url: '',
            price: wallPrice,
            details: `Mur (Étage ${currentFloor})`,
            position: [midPoint.x/2, (wallPositionY + wallHeight/2)/2, midPoint.z/2],
            gltf: wallMesh,
            rotation: [0, -angle, 0],
            scale: roundedScale,
            isBatiChiffrageObject: false,
            color: '',
            type: 'wall',
            faces: {
                front: { color: '', texture: '' },
                back: { color: '', texture: '' },
                left: { color: '', texture: '' },
                right: { color: '', texture: '' },
                top: { color: '', texture: '' },
                bottom: { color: '', texture: '' }
            },
            boundingBox: {
                min: [
                    Math.round(boundingBox.min.x * 1000) / 1000,
                    Math.round(boundingBox.min.y * 1000) / 1000,
                    Math.round(boundingBox.min.z * 1000) / 1000
                ],
                max: [
                    Math.round(boundingBox.max.x * 1000) / 1000,
                    Math.round(boundingBox.max.y * 1000) / 1000,
                    Math.round(boundingBox.max.z * 1000) / 1000
                ],
                size: [
                    Math.round((boundingBox.max.x - boundingBox.min.x) * 1000) / 1000,
                    Math.round((boundingBox.max.y - boundingBox.min.y) * 1000) / 1000,
                    Math.round((boundingBox.max.z - boundingBox.min.z) * 1000) / 1000
                ],
                center: [
                    Math.round(center.x * 1000) / 1000,
                    Math.round(center.y * 1000) / 1000,
                    Math.round(center.z * 1000) / 1000
                ]
            }
        };

        setObjects((prevObjects: ObjectData[]) => [...prevObjects, newWallObject]);
        setQuote((prevQuote: ObjectData[]) => [...prevQuote, newWallObject]);

        if (lineHelper.current) {
            setWalls2D((prev) => prev.filter((w) => w !== lineHelper.current!));
            lineHelper.current = null;
        }
    };


    // Fonction pour gérer la sélection d'une texture
    const handleTextureSelect = (textureUrl: string) => {
        setSelectedTexture(textureUrl); 
        
        // Si un objet est sélectionné, appliquer la texture à cet objet
        if (selectedObjectId) {
            const selectedObject = objects.find(obj => obj.id === selectedObjectId);
            if (selectedObject) {
                objectsUtils.handleUpdateTexture(selectedObjectId, textureUrl);
            }
        }
    };

    // Fonction pour détecter si l'utilisateur tape dans un input
    const isTypingInInput = () => {
        const activeElement = document.activeElement;
        if (!activeElement) return false;
        
        const tagName = activeElement.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
        const isContentEditable = activeElement.getAttribute('contenteditable') === 'true';
        
        return isInput || isContentEditable;
    };

    // Effet pour gérer les raccourcis clavier de copier-coller
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Copier (Ctrl+C)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                if (selectedObjectIds.length > 0) {
                    const selectedObjects = objects.filter(obj => selectedObjectIds.includes(obj.id));
                    const centerPosition: [number, number, number] = [
                        selectedObjects.reduce((sum, obj) => sum + obj.position[0], 0) / selectedObjects.length,
                        selectedObjects.reduce((sum, obj) => sum + obj.position[1], 0) / selectedObjects.length,
                        selectedObjects.reduce((sum, obj) => sum + obj.position[2], 0) / selectedObjects.length
                    ];
                    
                    const relativePositions = new Map<string, [number, number, number]>();
                    selectedObjects.forEach(obj => {
                        const relativePos: [number, number, number] = [
                            obj.position[0] - centerPosition[0],
                            obj.position[1] - centerPosition[1],
                            obj.position[2] - centerPosition[2]
                        ];
                        relativePositions.set(obj.id, relativePos);
                    });

                    const objectGroup: ObjectGroup = {
                        id: uuidv4(),
                        objects: selectedObjects,
                        centerPosition,
                        relativePositions
                    };
                    
                    handleCopyObjects(objectGroup);
                }
            }
            
            // Coller (Ctrl+V)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                if (clipboard) {
                    // Calculer une nouvelle position pour le groupe (légèrement décalée)
                    const newCenterPosition: [number, number, number] = [2, 0, 2];
                    handlePasteObjects(clipboard, newCenterPosition);
                }
            }
            
            // Échap pour effacer la sélection
            if (e.key === 'Escape') {
                handleClearSelection();
            }
            
            // N : Basculer entre mode Orbite et Vol libre
            if ((e.key === 'n' || e.key === 'N') && !isTypingInInput()) {
                e.preventDefault();
                setIsOrbitMode(!isOrbitMode);
            }
            
            // V : Activer/désactiver le mode Personnage
            if ((e.key === 'v' || e.key === 'V') && !isTypingInInput()) {
                e.preventDefault();
                setIsCharacterMode(!isCharacterMode);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedObjectIds, objects, clipboard, handleCopyObjects, handlePasteObjects, handleClearSelection, isOrbitMode, isCharacterMode]);

    
    return (
        <div id="page">
            {/* Menu latéral */}
            {showMenu && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '280px',
                    height: '100vh',
                    backgroundColor: 'white',
                    boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    padding: '20px',
                    borderRight: '1px solid #e9ecef'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '32px',
                        paddingBottom: '16px',
                        borderBottom: '1px solid #e9ecef'
                    }}>
                        <h2 style={{
                            margin: 0,
                            fontSize: '20px',
                            color: '#2D3C54',
                            fontWeight: '700',
                            letterSpacing: '-0.5px'
                        }}>
                            Menu
                        </h2>
                        <button 
                            onClick={() => setShowMenu(false)}
                            style={{
                                background: '#f8f9fa',
                                border: '1px solid #e9ecef',
                                fontSize: '16px',
                                cursor: 'pointer',
                                color: '#6c757d',
                                padding: '6px',
                                borderRadius: '50%',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#e9ecef';
                                e.currentTarget.style.color = '#2D3C54';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                                e.currentTarget.style.color = '#6c757d';
                            }}
                        >
                            ×
                        </button>
                    </div>
                    
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <a href="/" style={{
                            padding: '14px 20px',
                            textDecoration: 'none',
                            color: '#2D3C54',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            fontWeight: '500',
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            border: '1px solid transparent'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = '#e9ecef';
                            e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.transform = 'translateX(0)';
                        }}
                        >
                            Accueil
                        </a>
                        <a href="/tarifs" style={{
                            padding: '14px 20px',
                            textDecoration: 'none',
                            color: '#2D3C54',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            fontWeight: '500',
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            border: '1px solid transparent'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = '#e9ecef';
                            e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.transform = 'translateX(0)';
                        }}
                        >
                            Tarifs
                        </a>
                        <a href="/mes-devis-factures" style={{
                            padding: '14px 20px',
                            textDecoration: 'none',
                            color: '#2D3C54',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            fontWeight: '500',
                            fontSize: '15px',
                        display: 'flex',
                            alignItems: 'center',
                            border: '1px solid transparent'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = '#e9ecef';
                            e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.transform = 'translateX(0)';
                        }}
                        >
                            Mes Devis & Factures
                        </a>
                        <div style={{
                            height: '1px',
                            backgroundColor: '#e9ecef',
                            margin: '16px 0',
                            borderRadius: '1px'
                        }}></div>
                        {!user && (
                            <a href="/connexion" style={{
                                padding: '14px 20px',
                                textDecoration: 'none',
                                color: '#2D3C54',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                fontWeight: '500',
                                fontSize: '15px',
                                display: 'flex',
                                alignItems: 'center',
                                border: '1px solid transparent'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                                e.currentTarget.style.borderColor = '#e9ecef';
                                e.currentTarget.style.transform = 'translateX(4px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.borderColor = 'transparent';
                                e.currentTarget.style.transform = 'translateX(0)';
                            }}
                            >
                                Connexion / Inscription
                            </a>
                        )}
                    </nav>
                </div>
            )}

            <NavigationHelpModal 
                showNavigationHelp={showNavigationHelp} 
                setShowNavigationHelp={setShowNavigationHelp} 
            /> 
            <Toolbar 
                viewMode={viewMode}
                setViewMode={setViewMode}
                setShowNavigationHelp={setShowNavigationHelp}
                setShowObjectUpload={setShowObjectUpload}
                showUpload={showUpload}
                showObjectUpload={showObjectUpload}
                setShowRoomConfig={setShowRoomConfig}
                addNewFloor={floorsUtils.addNewFloor}
                currentFloor={currentFloor}
                objects={objects}
                creatingWallMode={creatingWallMode}
                setCreatingWallMode={setCreatingWallMode}
                is2DView={is2DView}
                handleAddObject={objectsUtils.handleAddObject}
                showQuotePanel={showQuotePanel}
                toggleQuotePanel={toggleQuotePanel}
                isCreatingSurface={isCreatingSurface}
                setIsCreatingSurface={setIsCreatingSurface}
                reconstructMaquette={reconstructMaquette}
                showAIGeneration={showAIGeneration}
                setShowAIGeneration={setShowAIGeneration}
                isOrbitMode={isOrbitMode}
                toggleOrbitMode={() => setIsOrbitMode(!isOrbitMode)}
                isCharacterMode={isCharacterMode}
                toggleCharacterMode={() => setIsCharacterMode(!isCharacterMode)}
                showMenu={showMenu}
                setShowMenu={setShowMenu}
                handleLoadBackupMaquette={handleLoadBackupMaquette}
            />

            {/* Add TextureUpload component */}
            {showUpload && <TextureUpload onClose={() => setShowUpload(false)} />}

            {/* Contenu principal */}
            <div id="container">
                <div ref={leftPanelRef} className={`left-panel ${!showQuotePanel ? 'left-panel-expanded' : ''}`}>
                    <FloorSelector 
                        currentFloor={currentFloor}
                        selectedFloor2D={selectedFloor2D}
                        setSelectedFloor2D={setSelectedFloor2D}
                        is2DView={is2DView}
                    />
                    
                    {/* Panneau d'objets */}
                    <ObjectsPanel 
                        onSelectObject={objectsUtils.handleAddObject}
                        selectedObject={selectedObjectId || undefined}
                    />
                    
                    {/* Panneau de textures */}
                    <TexturePanel 
                        onSelectTexture={handleTextureSelect}
                        selectedTexture={selectedTexture}
                        setShowUpload={setShowUpload}
                       
                    />
                    
                    <div
                        id="floating-panel"
                        className="floating-panel"
                        onMouseDown={(e) => startDraggingPanel(e)}
                    ></div>

                    <CanvasScene
                        objects={objects.filter(obj => {
                            if (!is2DView) return true;
                            
                            const objectHeight = obj.position[1] * 2;
                            
                            if (selectedFloor2D === 0) {
                                return objectHeight <= roomConfig.height;
                            } else {
                                const floorStart = selectedFloor2D * roomConfig.height;
                                const floorEnd = (selectedFloor2D + 1) * roomConfig.height;
                                
                                const isInFloor = objectHeight > floorStart && objectHeight <= floorEnd;
                                const isFloor = obj.details.includes('Sol') && 
                                              obj.details.includes(`Étage ${selectedFloor2D}`);
                                
                                return isInFloor || isFloor;
                            }
                        })}
                        onClick={onObjectClick}
                        onUpdatePosition={objectsUtils.handleUpdatePosition}
                        isMoving={isMoving}
                        setIsMoving={(id) => {
                            setIsMoving(id);
                            if (id === null && isMovingMultiple) {
                                handleStopMovingMultiple();
                            }
                        }}
                        orbitControlsRef={orbitControlsRef}
                        setCamera={setCamera}
                        showDimensions={showDimensions}
                        is2DView={is2DView}
                        isObjectOnlyView={isObjectOnlyView}
                        focusedObjectId={focusedObjectId}
                        selectedObjectId={selectedObjectId}
                        walls2D={walls2D}
                        updateQuotePrice={objectsUtils.updateQuotePrice}
                        groundPlane={groundPlaneRef.current}
                        handleAddWall2D={handleAddWall2D}
                        creatingWallMode={creatingWallMode}
                        isCreatingSurface={isCreatingSurface}
                        surfaceStartPoint={surfaceStartPoint}
                        surfaceEndPoint={surfaceEndPoint}
                        surfacePreview={surfacePreview}
                        onSurfacePointSelected={handleSurfacePointSelected}
                        onSurfacePreviewUpdate={handleSurfacePreviewUpdate}
                        handleAddObject={objectsUtils.handleAddObject}
                        onUpdateFaces={objectsUtils.handleUpdateFaces}
                        selectedObjectIds={selectedObjectIds}
                        onMultiSelect={handleMultiSelect}
                        isOrbitMode={isOrbitMode}
                        isCharacterMode={isCharacterMode}
                        onDeselect={handleDeselect}
                    />

                    {/* Ajout des contrôles d'objet */}
                    {selectedObjectId && (
                        <ObjectControls
                            selectedObjectId={selectedObjectId}
                            onRemoveObject={objectsUtils.handleRemoveObject}
                            onUpdateScale={objectsUtils.handleUpdateScale}
                            onMoveObject={() => setIsMoving(selectedObjectId || '')}
                            onRotateObject={objectsUtils.handleRotateObject}
                            onUpdatePosition={objectsUtils.handleUpdatePosition}
                            onExtendObject={handleExtendObject}
                            onUpdateTexture={handleTextureSelect}
                            selectedObject={objects.find(obj => obj.id === selectedObjectId)}
                            onUpdateFaces={objectsUtils.handleUpdateFaces}
                            
                        />
                    )}

                    {/* Panneau de sélection multiple */}
                    {showMultiSelectionPanel && (
                        <MultiSelectionPanel
                            selectedObjects={objects.filter(obj => selectedObjectIds.includes(obj.id))}
                            onCopyObjects={handleCopyObjects}
                            onPasteObjects={handlePasteObjects}
                            onClearSelection={handleClearSelection}
                            onRemoveSelectedObjects={handleRemoveSelectedObjects}
                            onMoveSelectedObjects={handleMoveSelectedObjects}
                            onRotateSelectedObjects={handleRotateSelectedObjects}
                            onUpdateSelectedObjectsScale={handleUpdateSelectedObjectsScale}
                            clipboard={clipboard}
                        />
                    )}
                </div>
                            
                <div 
                    ref={draggerRef} 
                    className="dragger"
                    title={showQuotePanel ? "Cliquez et glissez pour redimensionner le panneau de devis" : "Cliquez pour afficher le panneau de devis"}
                    onClick={toggleQuotePanel}
                >
                    <span>{showQuotePanel ? ">" : "<"}</span>
                </div>
                
                {showQuotePanel && (
                    <div 
                        ref={rightPanelRef} 
                        className="right-panel"
                        style={{ width: `${quotePanelWidth}px` }}
                    >
                        <QuotePanel 
                            quote={quote} 
                            setObjects={setObjects}
                            setQuote={setQuote}
                            getSerializableQuote={objectsUtils.getSerializableQuote}
                            handleRemoveObject={handleRemoveObject}
                            devisMetadata={devisMetadata}
                            maquetteObjects={objects}
                        />
                    </div>
                )}
            </div>
            {showRoomConfig && <RoomConfigPanel 
                roomConfig={roomConfig} 
                setRoomConfig={setRoomConfig} 
                generateRoom={floorsUtils.generateRoom} 
                setShowRoomConfig={setShowRoomConfig} 
            />}
          
        </div>
    );
};

export default MaquettePage;