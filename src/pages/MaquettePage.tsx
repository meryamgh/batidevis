import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createRoot, Root } from 'react-dom/client'; 
import { ObjectData } from '../types/ObjectData';
import * as THREE from 'three';
import '../styles/MaquettePage.css';
import { startDraggingPanel, closePanel, handleMouseMove } from '../utils/panelUtils';
import CanvasScene from '../components/CanvasScene';
import ObjectPanel from '../components/panels/ObjectPanel'; 
import { useObjects } from '../hooks/useObjects';
import QuotePanel from '../components/panels/QuotePanel';
import NavigationHelpModal from '../components/panels/NavigationHelpModalPanel';
import '../styles/Controls.css';
import Toolbar from '../components/panels/ToolbarPanel';
import BlueprintControls from '../components/panels/BlueprintControlsPanel';
import { useFloors } from '../hooks/useFloors';
import RoomConfigPanel from '../components/panels/RoomConfigPanel';
import FloorSelector from '../components/panels/FloorSelectorPanel';
import { useBlueprint } from '../hooks/useBlueprint';
import { v4 as uuidv4 } from 'uuid';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useMaquetteStore } from '../store/maquetteStore';
import { BACKEND_URL } from '../config/env';
const MaquettePage: React.FC = () => {
    const { objects, quote, setObjects, setQuote, removeObject } = useMaquetteStore();
    const raycaster = useRef(new THREE.Raycaster()); 
    const [showUpload, setShowUpload] = useState(false);
    const [showObjectUpload, setShowObjectUpload] = useState(false);
    const mouse = useRef(new THREE.Vector2());
    const cameraRef = useRef<THREE.Camera | null>(null); 
    const orbitControlsRef = useRef<any>(null);
    const groundPlaneRef = useRef<THREE.Mesh | null>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const draggerRef = useRef<HTMLDivElement>(null);
    const panelRootRef = useRef<Root | null>(null);  
    const [isMoving, setIsMoving] = useState<string | null>(null);
    const [showDimensions, setShowDimensions] = useState<{ [key: string]: boolean }>({});
    const [viewMode, setViewMode] = useState<'3D' | '2D' | 'Blueprint' | 'ObjectOnly'>('3D');
    const is2DView = viewMode === '2D' || viewMode === 'Blueprint';
    const isBlueprintView = viewMode === 'Blueprint';
    const isObjectOnlyView = viewMode === 'ObjectOnly';
    const [focusedObjectId, setFocusedObjectId] = useState<string | null>(null);
    const [showQuotePanel, setShowQuotePanel] = useState(true);
    const [quotePanelWidth, setQuotePanelWidth] = useState(300);
    const [isCreatingSurface, setIsCreatingSurface] = useState(false);
    const [surfaceStartPoint, setSurfaceStartPoint] = useState<THREE.Vector3 | null>(null);
    const [surfaceEndPoint, setSurfaceEndPoint] = useState<THREE.Vector3 | null>(null);
    const [surfacePreview, setSurfacePreview] = useState<THREE.Mesh | null>(null);

    // États pour le mode Blueprint
    const [blueprintPoints, setBlueprintPoints] = useState<THREE.Vector3[]>([]);
    const [blueprintLines, setBlueprintLines] = useState<{start: THREE.Vector3, end: THREE.Vector3, id: string, length: number}[]>([]);
    const [tempPoint, setTempPoint] = useState<THREE.Vector3 | null>(null);
    const [currentLinePoints, setCurrentLinePoints] = useState<THREE.Vector3[]>([]);
    const [isDrawingLine, setIsDrawingLine] = useState(false);

    // États pour le mode de création de pièce rectangulaire
    const [creationMode, setCreationMode] = useState<'wall' | 'room'>('wall');
    const [rectangleStartPoint, setRectangleStartPoint] = useState<THREE.Vector3 | null>(null);
    const [rectangleEndPoint, setRectangleEndPoint] = useState<THREE.Vector3 | null>(null);
    const [isCreatingRectangle, setIsCreatingRectangle] = useState(false);
    const [rectanglePreview, setRectanglePreview] = useState<{
        lines: {start: THREE.Vector3, end: THREE.Vector3, id: string}[],
        width: number,
        length: number
    } | null>(null);

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

    const [customTextures] = useState<Record<string, string>>({});

    const [showNavigationHelp, setShowNavigationHelp] = useState(false);

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

    useEffect(() => {
        console.log('quote', quote);
    }, [quote]);

    // Fonction pour étendre un objet
    const handleExtendObject = useCallback((sourceObject: ObjectData, direction: 'left' | 'right' | 'front' | 'back' | 'up' | 'down') => {
        console.log('handleExtendObject appelé avec:', {
            sourceId: sourceObject.id,
            sourcePosition: sourceObject.position,
            direction
        });

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
        console.log('Nouvelle position calculée:', newPosition);

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

    // Fonction pour supprimer un objet
    const handleRemoveObject = useCallback((id: string) => {
        removeObject(id);
    }, [removeObject]);

    const floorsUtils = useFloors({
        setObjects,
        setQuote,
        currentFloor,
        setCurrentFloor,
        setShowRoomConfig,
        roomConfig,
        objects,
    });
    
    const blueprintUtils = useBlueprint({
        currentFloor,
        setObjects,
        setQuote,
        setWalls2D,
        lineHelper,
        blueprintLines, 
        creationMode,
        setCreationMode,
        isCreatingRectangle,
        setIsCreatingRectangle,
        rectangleStartPoint,
        setRectangleStartPoint,
        rectangleEndPoint,
        rectanglePreview,
        setRectanglePreview,
        blueprintPoints,
        setBlueprintPoints,
        tempPoint,
        setTempPoint,
        currentLinePoints,
        setCurrentLinePoints,
        isDrawingLine,
        setIsDrawingLine, 
        setBlueprintLines,
        setRectangleEndPoint,
        roomConfig,
        setViewMode,
        setCurrentFloor
    });

    useEffect(() => {
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({ 
            color: 'lightgray',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
            roughness: 0.8,
            metalness: 0.2
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = 0; // S'assurer que le plan est à y=0
        plane.receiveShadow = true;
        groundPlaneRef.current = plane;
    }, []);

    useEffect(() => {
        const handleMouseMoveCallback = (e: MouseEvent) => {
            if (isMoving !== null && cameraRef.current) {
                handleMouseMove(e, isMoving, mouse, raycaster, objects, setObjects, cameraRef.current);
            }
        };

        if (isMoving !== null) {
            document.addEventListener('mousemove', handleMouseMoveCallback);
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
        };
    }, [isMoving, objects]);

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
        const panel = document.getElementById('floating-panel');
        setCreatingWallMode(false);
        
        // Mettre à jour l'objet sélectionné
        setSelectedObjectId(selectedObject.id);
        
        if (panel) {
            panel.style.display = 'block';

            if (!panelRootRef.current) {
                panelRootRef.current = createRoot(panel);
            }
            
            // Faire une requête au backend pour obtenir les données paramétriques
            const fetchParametricData = async () => {
                try {
                    console.log("Fetching parametric data for:", selectedObject.details);
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
                        console.log("Received parametric data:", data);
                        
                        // Render the panel with parametric data
                        panelRootRef.current?.render(
                            <ObjectPanel
                                object={selectedObject}
                                onUpdateTexture={objectsUtils.handleUpdateTexture}
                                onUpdateColor={objectsUtils.handleUpdateColor}
                                onUpdateScale={objectsUtils.handleUpdateScale}
                                onUpdatePosition={objectsUtils.handleUpdatePosition}
                                onRemoveObject={objectsUtils.handleRemoveObject}
                                customTextures={customTextures}
                                onMoveObject={() => setIsMoving(selectedObject.id)}
                                onClosePanel={() => {
                                    closePanel();
                                    setIsMoving(null);
                                    setSelectedObjectId(null); // Réinitialiser l'objet sélectionné
                                }}
                                onRotateObject={objectsUtils.handleRotateObject}
                                onToggleShowDimensions={objectsUtils.handleToggleShowDimensions}
                                onUpdateRoomDimensions={floorsUtils.updateRoomDimensions}
                                onDeselectObject={(id) => setSelectedObjectId(null)}
                                onAddObject={objectsUtils.handleAddObjectFromData}
                                onExtendObject={handleExtendObject}
                                onUpdateFaces={objectsUtils.handleUpdateFaces}
                                parametricData={data}
                                handleUpdateObjectParametricData={objectsUtils.handleUpdateObjectParametricData}
                            />
                        );
                    } else {
                        console.error("Failed to fetch parametric data. Status:", response.status);
                        // Render the panel without parametric data
                        renderPanelWithoutParametricData();
                    }
                } catch (error) {
                    console.error("Error fetching parametric data:", error);
                    // Render the panel without parametric data
                    renderPanelWithoutParametricData();
                }
            };
            
            const renderPanelWithoutParametricData = () => {
                panelRootRef.current?.render(
                    <ObjectPanel
                        object={selectedObject}
                        onUpdateTexture={objectsUtils.handleUpdateTexture}
                        onUpdateColor={objectsUtils.handleUpdateColor}
                        onUpdateScale={objectsUtils.handleUpdateScale}
                        onUpdatePosition={objectsUtils.handleUpdatePosition}
                        onRemoveObject={objectsUtils.handleRemoveObject}
                        customTextures={customTextures}
                        onMoveObject={() => setIsMoving(selectedObject.id)}
                        onClosePanel={() => {
                            closePanel();
                            setIsMoving(null);
                            setSelectedObjectId(null); // Réinitialiser l'objet sélectionné
                        }}
                        onRotateObject={objectsUtils.handleRotateObject}
                        onToggleShowDimensions={objectsUtils.handleToggleShowDimensions}
                        onUpdateRoomDimensions={floorsUtils.updateRoomDimensions}
                        onDeselectObject={(id) => setSelectedObjectId(null)}
                        onAddObject={objectsUtils.handleAddObjectFromData}
                        onExtendObject={handleExtendObject}
                        onUpdateFaces={objectsUtils.handleUpdateFaces}
                        handleUpdateObjectParametricData={objectsUtils.handleUpdateObjectParametricData}
                    />
                );
            };
            
            // Start the fetch operation
            fetchParametricData();
        }
    }, [objectsUtils, customTextures, setCreatingWallMode, floorsUtils, handleExtendObject]);

    // Fonction pour basculer l'affichage du panneau de devis
    const toggleQuotePanel = useCallback(() => {
        setShowQuotePanel(prev => !prev);
    }, []);

    // Wrapper pour handleObjectClick qui utilise la fonction du hook
    const onObjectClick = useCallback((id: string, point?: THREE.Vector3) => { 
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
            objectsUtils.handleObjectClick(id, viewMode, is2DView, renderObjectPanel);
        }
    }, [objectsUtils, viewMode, is2DView, renderObjectPanel, isCreatingSurface, surfaceStartPoint]);
    
     
    
    // Ajouter la fonction pour créer la surface
    const createSurface = (start: THREE.Vector3, end: THREE.Vector3) => {
        const width = Math.abs(end.x - start.x);
        const depth = Math.abs(end.z - start.z);
        
        const geometry = new THREE.BoxGeometry(width, 0.1, depth);
        const material = new THREE.MeshStandardMaterial({ 
            color: '#808080',
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
            color: '#808080',
            isBatiChiffrageObject: false,
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
                color: '#808080',
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
                color: '#808080',
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
            const material = new THREE.MeshStandardMaterial({ 
                color: '#808080',
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
        }
        
        setSurfaceEndPoint(end);
    }, [surfacePreview]);

    const reconstructMaquette = async () => {
        try {
            // Charger les données depuis le backend
            const response = await fetch(`${BACKEND_URL}/load-maquette`);
            if (!response.ok) throw new Error('Erreur lors du chargement');
            
            const data = await response.json();
            
            // Vider la scène actuelle
            setObjects([]);
            setQuote([]);
            
            // Créer un tableau temporaire pour stocker tous les objets
            const newObjects: ObjectData[] = [];
            
            // Reconstruire chaque objet
            for (const objData of data.objects) {
                // Diviser les positions par 2 pour la compatibilité avec GLTFObject
                const adjustedPosition: [number, number, number] = [
                    objData.position[0] / 2,
                    objData.position[1] / 2,
                    objData.position[2] / 2
                ];

                if (objData.url) {
                    // Pour les objets GLTF
                    try {
                        const loader = new GLTFLoader();
                        const gltf = await loader.loadAsync(objData.url);
                        
                        // Créer le nouvel objet avec toutes les propriétés
                        const newObject: ObjectData = {
                            id: objData.id,
                            url: objData.url,
                            position: adjustedPosition, // Utiliser la position ajustée
                            scale: objData.scale,
                            rotation: objData.rotation,
                            texture: objData.texture || '',
                            isBatiChiffrageObject: false,
                            color: objData.color || '',
                            type: objData.type,
                            faces: objData.faces,
                            gltf: gltf,
                            price: objData.price || 100,
                            details: objData.details || 'Objet importé',
                            boundingBox: objData.boundingBox // Conserver la boundingBox si elle existe
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
                        position: adjustedPosition, // Utiliser la position ajustée
                        gltf: mesh,
                        price: objData.price || 100,
                        details: objData.details || `${objData.type === 'floor' ? 'Sol' : 'Mur'}`
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
        }
    };

    return (
        <div id="page">
            <NavigationHelpModal 
                showNavigationHelp={showNavigationHelp} 
                setShowNavigationHelp={setShowNavigationHelp} 
            /> 
            <Toolbar 
                viewMode={viewMode}
                setViewMode={setViewMode}
                setShowNavigationHelp={setShowNavigationHelp}
                setShowUpload={setShowUpload}
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
            />

            {/* Contenu principal */}
            <div id="container">
                <div ref={leftPanelRef} className={`left-panel ${!showQuotePanel ? 'left-panel-expanded' : ''}`}>
                    <FloorSelector 
                        currentFloor={currentFloor}
                        selectedFloor2D={selectedFloor2D}
                        setSelectedFloor2D={setSelectedFloor2D}
                        is2DView={is2DView}
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
                        setIsMoving={setIsMoving}
                        orbitControlsRef={orbitControlsRef}
                        setCamera={setCamera}
                        showDimensions={showDimensions}
                        is2DView={is2DView}
                        isBlueprintView={isBlueprintView}
                        isObjectOnlyView={isObjectOnlyView}
                        focusedObjectId={focusedObjectId}
                        selectedObjectId={selectedObjectId}
                        walls2D={walls2D}
                        updateQuotePrice={objectsUtils.updateQuotePrice}
                        groundPlane={groundPlaneRef.current}
                        handleAddWall2D={blueprintUtils.handleAddWall2D}
                        creatingWallMode={creatingWallMode}
                        isCreatingSurface={isCreatingSurface}
                        surfaceStartPoint={surfaceStartPoint}
                        surfaceEndPoint={surfaceEndPoint}
                        surfacePreview={surfacePreview}
                        onSurfacePointSelected={handleSurfacePointSelected}
                        onSurfacePreviewUpdate={handleSurfacePreviewUpdate}
                        blueprintPoints={blueprintPoints}
                        blueprintLines={blueprintLines}
                        tempPoint={tempPoint}
                        handleBlueprintClick={blueprintUtils.handleBlueprintClick}
                        updateRectanglePreview={blueprintUtils.updateRectanglePreview}
                        rectangleStartPoint={rectangleStartPoint}
                        handleAddObject={objectsUtils.handleAddObject}
                        onUpdateFaces={objectsUtils.handleUpdateFaces}
                    />
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
            <BlueprintControls 
                isBlueprintView={isBlueprintView}
                creationMode={creationMode}
                setCreationMode={setCreationMode}
                isDrawingLine={isDrawingLine}
                setIsDrawingLine={setIsDrawingLine}
                isCreatingRectangle={isCreatingRectangle}
                setIsCreatingRectangle={setIsCreatingRectangle}
                rectangleStartPoint={rectangleStartPoint}
                setRectangleStartPoint={setRectangleStartPoint}
                rectangleEndPoint={rectangleEndPoint}
                setRectangleEndPoint={setRectangleEndPoint}
                rectanglePreview={rectanglePreview}
                setRectanglePreview={setRectanglePreview}
                blueprintLines={blueprintLines}
                setBlueprintLines={setBlueprintLines}
                blueprintPoints={blueprintPoints}
                setBlueprintPoints={setBlueprintPoints}
                tempPoint={tempPoint}
                setTempPoint={setTempPoint}
                currentLinePoints={currentLinePoints}
                setCurrentLinePoints={setCurrentLinePoints}
                setWalls2D={setWalls2D}
                convertBlueprintToWalls={blueprintUtils.convertBlueprintToWalls}
                handleAddNewFloorBlueprint={blueprintUtils.handleAddNewFloorBlueprint}
                createRoomFromRectangle={blueprintUtils.createRoomFromRectangle}
            />
        </div>
    );
};

export default MaquettePage;