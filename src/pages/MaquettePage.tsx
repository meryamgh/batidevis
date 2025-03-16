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
import { useHistory } from '../hooks/useHistory';

const MaquettePage: React.FC = () => {
    const [objects, setObjects] = useState<ObjectData[]>([]);
    const [quote, setQuote] = useState<ObjectData[]>([]); 
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
    // Nouvel état pour contrôler la visibilité du panneau de devis
    const [showQuotePanel, setShowQuotePanel] = useState(true);
    // État pour stocker la largeur du panneau de devis
    const [quotePanelWidth, setQuotePanelWidth] = useState(300);

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

    // const [currentWall, setCurrentWall] = useState<THREE.Line | null>(null);
    const [creatingWallMode, setCreatingWallMode] = useState(false);
    const [walls2D, setWalls2D] = useState<THREE.Line[]>([]);
    //const [wallStart, setWallStart] = useState<THREE.Vector3 | null>(null);
    const lineHelper = useRef<THREE.Line | null>(null);

    const [showRoomConfig, setShowRoomConfig] = useState(false);
    const [roomConfig, setRoomConfig] = useState({
        width: 10,    // Valeur qui fonctionnait
        length: 8,    // Valeur qui fonctionnait
        height: 6     // Valeur qui fonctionnait
    });
 
    const [currentFloor, setCurrentFloor] = useState(0);
    const [selectedFloor2D, setSelectedFloor2D] = useState(0);
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

    const [customTextures] = useState<Record<string, string>>({});

    const [showNavigationHelp, setShowNavigationHelp] = useState(false);
 

    // Initialiser le hook useObjects avec les états
    const objectsHistory = useHistory<ObjectData[]>([]);
    const quoteHistory = useHistory<ObjectData[]>([]);

    // Modification du setter d'objets pour sauvegarder l'historique
    const setObjectsWithHistory = useCallback((newObjects: ObjectData[] | ((prev: ObjectData[]) => ObjectData[])) => {
        const updatedObjects = typeof newObjects === 'function' ? newObjects(objects) : newObjects;
        
        // Sauvegarder l'état des objets
        objectsHistory.saveState(updatedObjects);
        setObjects(updatedObjects);
        
        // Ne pas filtrer le devis lors de l'ajout de nouveaux objets
        // On ne filtre que si un objet a été supprimé
        const removedObjectIds = objects.filter(obj => 
            !updatedObjects.some(newObj => newObj.id === obj.id)
        ).map(obj => obj.id);

        if (removedObjectIds.length > 0) {
            // Si des objets ont été supprimés, mettre à jour le devis
            const updatedQuote = quote.filter(quoteItem => 
                !removedObjectIds.includes(quoteItem.id)
            );

            if (updatedQuote.length !== quote.length) {
                quoteHistory.saveState(updatedQuote);
                setQuote(updatedQuote);
            }
        }
    }, [objectsHistory, objects, quote, quoteHistory]);

    // Modification du setter de devis pour sauvegarder l'historique
    const setQuoteWithHistory = useCallback((newQuote: ObjectData[] | ((prev: ObjectData[]) => ObjectData[])) => {
        const currentQuote = typeof newQuote === 'function' ? newQuote(quote) : newQuote;
        
        // Sauvegarder l'état du devis directement sans filtrage
        quoteHistory.saveState(currentQuote);
        setQuote(currentQuote);
    }, [quoteHistory, quote]);

    // Fonction pour supprimer un objet
    const handleRemoveObject = useCallback((id: string) => {
        // Supprimer l'objet de la liste des objets
        const newObjects = objects.filter(obj => obj.id !== id);
        setObjectsWithHistory(newObjects);
        
        // Forcer la mise à jour du devis également
        const newQuote = quote.filter(item => item.id !== id);
        setQuoteWithHistory(newQuote);
    }, [objects, quote, setObjectsWithHistory, setQuoteWithHistory]);

    // Fonctions pour gérer l'annulation/rétablissement
    const handleUndo = useCallback(() => {
        if (objectsHistory.canUndo) {
            objectsHistory.undo();
            quoteHistory.undo();
            
            const previousObjects = objectsHistory.state;
            const previousQuote = quoteHistory.state;
            
            // Vérifier la cohérence entre les objets et le devis
            const validQuote = previousQuote.filter(quoteItem => 
                previousObjects.some(obj => obj.id === quoteItem.id)
            );
            
            setObjects(previousObjects);
            setQuote(validQuote);
        }
    }, [objectsHistory, quoteHistory]);

    const handleRedo = useCallback(() => {
        console.log('handleRedo appelé, canRedo:', objectsHistory.canRedo);
        if (objectsHistory.canRedo) {
            console.log('Avant redo - État actuel:', {
                objects: objects,
                quote: quote
            });

            // Effectuer le redo sur les deux historiques
            objectsHistory.redo();
            quoteHistory.redo();
            
            const nextObjects = objectsHistory.state;
            const nextQuote = quoteHistory.state;
            
            console.log('Après redo - Nouveaux états:', {
                nextObjects: nextObjects,
                nextQuote: nextQuote
            });

            // Mettre à jour les états directement sans passer par les setters avec historique
            setObjects(nextObjects);
            setQuote(nextQuote);
        }
    }, [objectsHistory, quoteHistory]);

    // Initialiser le hook useObjects avec les états mis à jour
    const objectsUtils = useObjects({
        objects,
        setObjects: setObjectsWithHistory,
        quote,
        setQuote: setQuoteWithHistory,
        isMoving,
        setIsMoving,
        showDimensions,
        setShowDimensions,
        focusedObjectId,
        setFocusedObjectId, 
    });

    // Gestionnaire pour les raccourcis clavier
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            console.log('Touche pressée:', {
                key: e.key,
                ctrlKey: e.ctrlKey,
                canRedo: objectsHistory.canRedo
            });

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    // Ctrl+Z ou Cmd+Z pour Undo
                    console.log('Tentative de Undo');
                    handleUndo();
                } else if (e.key === 'y') {
                    // Ctrl+Y ou Cmd+Y pour Redo
                    console.log('Tentative de Redo');
                    handleRedo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    // Initialiser l'historique avec l'état initial
    useEffect(() => {
        objectsHistory.saveState(objects);
        quoteHistory.saveState(quote);
    }, []);

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
            panelRootRef.current.render(
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
                />
            );
        }
    }, [objectsUtils, customTextures, setCreatingWallMode, floorsUtils]);

    // Wrapper pour handleObjectClick qui utilise la fonction du hook
    const onObjectClick = useCallback((id: string) => {
        objectsUtils.handleObjectClick(id, viewMode, is2DView, renderObjectPanel);
    }, [objectsUtils, viewMode, is2DView, renderObjectPanel]);

    // Fonction pour basculer l'affichage du panneau de devis
    const toggleQuotePanel = useCallback(() => {
        setShowQuotePanel(prev => !prev);
    }, []);

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
            />

            <div className="history-controls">
                <button 
                    onClick={handleUndo}
                    disabled={!objectsHistory.canUndo}
                    className="history-button"
                    title="Annuler (Ctrl+Z)"
                >
                    ↩ Annuler
                </button>
                <button 
                    onClick={handleRedo}
                    disabled={!objectsHistory.canRedo}
                    className="history-button"
                    title="Rétablir (Ctrl+Y)"
                >
                    ↪ Rétablir
                </button>
            </div>

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
                            
                            // En vue 2D, filtrer les objets selon l'étage sélectionné
                            const objectHeight = obj.position[1] * 2;
                            
                            if (selectedFloor2D === 0) {
                                // Pour le rez-de-chaussée
                                return objectHeight <= roomConfig.height;
                            } else {
                                // Pour les étages supérieurs
                                const floorStart = selectedFloor2D * roomConfig.height;
                                const floorEnd = (selectedFloor2D + 1) * roomConfig.height;
                                
                                // Vérifier si l'objet appartient à cet étage
                                const isInFloor = objectHeight > floorStart && objectHeight <= floorEnd;
                                
                                // Vérifier si c'est un sol d'étage (qui a une position légèrement décalée)
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
                        blueprintPoints={blueprintPoints}
                        blueprintLines={blueprintLines}
                        tempPoint={tempPoint}
                        handleBlueprintClick={blueprintUtils.handleBlueprintClick}
                        updateRectanglePreview={blueprintUtils.updateRectanglePreview}
                        rectangleStartPoint={rectangleStartPoint}
                        handleAddObject={objectsUtils.handleAddObject}
                    />
                </div>
                            
                {showQuotePanel && (
                    <>
                        <div 
                            ref={draggerRef} 
                            className="dragger"
                            title="Cliquez et glissez pour redimensionner le panneau de devis"
                        ></div>
                        <div 
                            ref={rightPanelRef} 
                            className="right-panel"
                            style={{ width: `${quotePanelWidth}px` }}
                        >
                            <QuotePanel 
                                quote={quote} 
                                setObjects={setObjectsWithHistory}
                                setQuote={setQuoteWithHistory}
                                getSerializableQuote={objectsUtils.getSerializableQuote}
                                handleRemoveObject={handleRemoveObject}
                            />
                        </div>
                    </>
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