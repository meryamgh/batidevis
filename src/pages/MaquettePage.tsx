import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createRoot, Root } from 'react-dom/client'; 
import { ObjectData } from '../types/ObjectData';
import * as THREE from 'three';
import '../styles/MaquettePage.css';
import { startDraggingPanel, closePanel, handleMouseMove } from '../utils/panelUtils';
import CanvasScene from '../components/CanvasScene';
import ObjectPanel from '../components/ObjectPanel'; 
import { useObjects } from '../hooks/useObjects';
import QuotePanel from '../components/quote/QuotePanel';
import NavigationHelpModal from '../components/NavigationHelpModal';
import '../styles/Controls.css';
import Toolbar from '../components/Toolbar';
import BlueprintControls from '../components/blueprint/BlueprintControls';
import { useFloors } from '../hooks/useFloors';
import RoomConfigPanel from '../components/room/RoomConfigPanel';
import FloorSelector from '../components/room/FloorSelector';
import { useBlueprint } from '../hooks/useBlueprint';

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

    const [customTextures] = useState<Record<string, string>>({});

    const [showNavigationHelp, setShowNavigationHelp] = useState(false);
 

    // Initialiser le hook useObjects avec les états
    const objectsUtils = useObjects({
        objects,
        setObjects,
        quote,
        setQuote,
        isMoving,
        setIsMoving,
        showDimensions,
        setShowDimensions,
        focusedObjectId,
        setFocusedObjectId
    });

    const floorsUtils = useFloors({
        setObjects,
        setQuote,
        currentFloor,
        setCurrentFloor,
        selectedFloor2D,
        setSelectedFloor2D,
        showRoomConfig,
        setShowRoomConfig,
        roomConfig,
        setRoomConfig
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
            if (rightPanelRef.current) {
                rightPanelRef.current.style.width = '300px';
            }
            
            // Re-enable orbit controls zooming
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enableZoom = true;
                orbitControlsRef.current.minDistance = 1;
                orbitControlsRef.current.maxDistance = 1000;
            }
        }
    }, [viewMode, objects, focusedObjectId]);

    useEffect(() => {
        const dragger = draggerRef.current;
        const leftPanel = leftPanelRef.current;
        const rightPanel = rightPanelRef.current;

        if (!dragger || !leftPanel || !rightPanel) return;

        let isDragging = false;

        const startDragging = () => {
            isDragging = true;
            document.body.style.cursor = 'col-resize';
            dragger.style.pointerEvents = 'none'; // Assure que le dragger reste fonctionnel
        };

        const stopDragging = () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = 'default';
                dragger.style.pointerEvents = 'auto'; // Réactiver les événements sur le dragger
            }
        };

        const handleDragging = (e: MouseEvent) => {
            if (!isDragging) return;

            const containerWidth = leftPanel.parentElement?.offsetWidth || 0;
            const dragPosition = e.clientX;

            const minRightPanelWidth = 400;
            const draggerWidth = 10; // Largeur du dragger (ou sa zone active)

            // Calculer la nouvelle largeur pour le panneau gauche
            const newLeftWidth = Math.min(
                Math.max(200, dragPosition - leftPanel.offsetLeft), // Limite gauche
                containerWidth - minRightPanelWidth - draggerWidth // Limite droite
            );

            // Appliquer les nouvelles largeurs
            leftPanel.style.flex = `0 0 ${newLeftWidth}px`;
            rightPanel.style.flex = `1 1 ${containerWidth - newLeftWidth - draggerWidth}px`;
        };

        dragger.addEventListener('mousedown', startDragging);
        document.addEventListener('mouseup', stopDragging);
        document.addEventListener('mousemove', handleDragging);

        return () => {
            dragger.removeEventListener('mousedown', startDragging);
            document.removeEventListener('mouseup', stopDragging);
            document.removeEventListener('mousemove', handleDragging);
        };
    }, []);

    const setCamera = useCallback((camera: THREE.Camera) => {
        cameraRef.current = camera;
    }, []);
 
 

    // Fonction pour rendre le panneau d'objet
    const renderObjectPanel = useCallback((selectedObject: ObjectData) => {
        const panel = document.getElementById('floating-panel');
        setCreatingWallMode(false);
        
        if (panel) {
            panel.style.display = 'block';

            if (!panelRootRef.current) {
                panelRootRef.current = createRoot(panel);
            }
            panelRootRef.current.render(
                <ObjectPanel
                    object={selectedObject}
                    onUpdateTexture={objectsUtils.handleUpdateTexture}
                    onUpdateScale={objectsUtils.handleUpdateScale}
                    onUpdatePosition={objectsUtils.handleUpdatePosition}
                    onRemoveObject={objectsUtils.handleRemoveObject}
                    customTextures={customTextures}
                    onMoveObject={() => setIsMoving(selectedObject.id)}
                    onClosePanel={() => {
                        closePanel();
                        setIsMoving(null);
                    }}
                    onRotateObject={objectsUtils.handleRotateObject}
                    onToggleShowDimensions={objectsUtils.handleToggleShowDimensions}
                />
            );
        }
    }, [objectsUtils, customTextures, setCreatingWallMode]);

    // Wrapper pour handleObjectClick qui utilise la fonction du hook
    const onObjectClick = useCallback((id: string) => {
        objectsUtils.handleObjectClick(id, viewMode, is2DView, renderObjectPanel);
    }, [objectsUtils, viewMode, is2DView, renderObjectPanel]);

     
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
            />

            {/* Contenu principal */}
            <div id="container" className="container-essaie">
                <div ref={leftPanelRef} className="left-panel">
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
                            const objectHeight = obj.position[1] * 2; // Multiplier par 2 pour compenser la division
                            
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
                    />
                </div>
                            

                <div ref={draggerRef} className="dragger"></div>
                <div ref={rightPanelRef} className="right-panel">
                    <QuotePanel 
                        quote={quote} 
                        setObjects={setObjects} 
                        setQuote={setQuote} 
                        getSerializableQuote={objectsUtils.getSerializableQuote} 
                    />
                </div>
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