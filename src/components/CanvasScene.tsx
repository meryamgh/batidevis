import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import GLTFObject from './GLTFObject';
import Character from './Character';
import { ObjectData, FacesData } from '../types/ObjectData';
import * as THREE from 'three';
import CameraProvider from './canvaScene/CameraProvider';
import RaycasterHandler from './canvaScene/RaycasterHandler';
import MoveControls from './canvaScene/MoveControls'; 
import PersonView from './canvaScene/PersonView';

type CanvasSceneProps = {
    objects: ObjectData[];
    onClick: (id: string, point?: THREE.Vector3) => void;
    onUpdatePosition: (id: string, position: [number, number, number]) => void;
    isMoving: string | null;
    setIsMoving: (id: string | null) => void;
    orbitControlsRef: React.RefObject<any>;
    setCamera: (camera: THREE.Camera) => void;
    updateQuotePrice: (id: string, price: number, scale : [number, number, number]) => void;
    showDimensions: { [key: string]: boolean };
    is2DView: boolean;
    isObjectOnlyView?: boolean;
    focusedObjectId?: string | null;
    selectedObjectId?: string | null;
    walls2D: THREE.Line[];
    groundPlane: THREE.Mesh | null;
    handleAddWall2D: (start: THREE.Vector3, end: THREE.Vector3) => void;
    creatingWallMode: boolean;
    isCreatingSurface: boolean;
    surfaceStartPoint: THREE.Vector3 | null;
    surfaceEndPoint: THREE.Vector3 | null;
    surfacePreview: THREE.Mesh | null;
    onSurfacePointSelected: (point: THREE.Vector3) => void;
    onSurfacePreviewUpdate: (start: THREE.Vector3, end: THREE.Vector3) => void;
    handleAddObject: (url: string, event: React.DragEvent<HTMLDivElement>, camera: THREE.Camera) => Promise<void>;
    onUpdateFaces: (id: string, faces: FacesData) => void;
    // Nouvelles props pour la sélection multiple
    selectedObjectIds?: string[];
    onMultiSelect?: (id: string, isCtrlPressed: boolean) => void;
    // Nouvelles props pour les modes de navigation
    isOrbitMode?: boolean;
    isCharacterMode?: boolean;
    // Nouvelle prop pour la désélection
    onDeselect?: () => void;
};

const SurfaceHandler: React.FC<{
    isCreatingSurface: boolean;
    groundPlane: THREE.Mesh | null;
    surfaceStartPoint: THREE.Vector3 | null;
    onSurfacePointSelected: (point: THREE.Vector3) => void;
    onSurfacePreviewUpdate: (start: THREE.Vector3, end: THREE.Vector3) => void;
}> = ({
    isCreatingSurface,
    groundPlane,
    surfaceStartPoint,
    onSurfacePointSelected,
    onSurfacePreviewUpdate
}) => {
    const { camera } = useThree();

    useEffect(() => {
        if (!isCreatingSurface || !groundPlane || !camera) return;

        const handleMouseMove = (e: MouseEvent) => {
            const canvas = e.target as HTMLElement;
            const canvasBounds = canvas.getBoundingClientRect();
            const x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
            const y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

            const mouse = new THREE.Vector2(x, y);
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObject(groundPlane);

            if (intersects.length > 0 && surfaceStartPoint) {
                const point = intersects[0].point.clone();
                point.y = 0.05; // Légèrement au-dessus du sol
                onSurfacePreviewUpdate(surfaceStartPoint, point);
            }
        };

        const handleClick = (e: MouseEvent) => {
            const canvas = e.target as HTMLElement;
            const canvasBounds = canvas.getBoundingClientRect();
            const x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
            const y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

            const mouse = new THREE.Vector2(x, y);
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObject(groundPlane);

            if (intersects.length > 0) {
                const point = intersects[0].point.clone();
                point.y = 0.05; // Légèrement au-dessus du sol
                onSurfacePointSelected(point);
            }
        };

        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('mousemove', handleMouseMove);
            canvas.addEventListener('click', handleClick);

            return () => {
                canvas.removeEventListener('mousemove', handleMouseMove);
                canvas.removeEventListener('click', handleClick);
            };
        }
    }, [isCreatingSurface, groundPlane, surfaceStartPoint, camera, onSurfacePreviewUpdate, onSurfacePointSelected]);

    return null;
};

const CanvasScene: React.FC<CanvasSceneProps> = ({
    objects,
    onClick,
    onUpdatePosition,
    isMoving,
    setIsMoving,
    orbitControlsRef,
    setCamera,
    updateQuotePrice,
    showDimensions,
    is2DView,
    isObjectOnlyView,
    focusedObjectId,
    selectedObjectId,
    walls2D,
    groundPlane,
    handleAddWall2D,
    creatingWallMode,
    isCreatingSurface,
    surfaceStartPoint,
    surfacePreview,
    onSurfacePointSelected,
    onSurfacePreviewUpdate,
    handleAddObject,
    onUpdateFaces,
    selectedObjectIds,
    onMultiSelect,
    isOrbitMode = true,
    isCharacterMode = false,
    onDeselect,
}) => {
    const [firstPersonView, setFirstPersonView] = useState(false);
    const [characterPosition, setCharacterPosition] = useState<THREE.Vector3 | undefined>();
    const [characterRotation, setCharacterRotation] = useState<THREE.Euler | undefined>();
    const rotateCharacterRef = useRef<((direction: 'up' | 'down' | 'left' | 'right') => void) | null>(null);
    const [showAllDimensions] = useState(false);
    const [zoom2D] = useState(100);
    const [navigationMode, setNavigationMode] = useState<'orbit' | 'move'>(isOrbitMode ? 'orbit' : 'move');
    const targetPositionRef = useRef<THREE.Vector3 | null>(null);
    const cameraPositionRef = useRef<THREE.Vector3 | null>(null);
    const isMovingToTargetRef = useRef(false);
    const [currentCamera, setCurrentCamera] = useState<THREE.Camera | null>(null);
    const [orbitTarget, setOrbitTarget] = useState(new THREE.Vector3(0, 0, 0));
    // Supprimer l'état center2D et la synchronisation

    // Disable first person view when in ObjectOnly mode or when switching views
    useEffect(() => {
        if (isObjectOnlyView || is2DView) {
            setFirstPersonView(false);
        }
    }, [isObjectOnlyView, is2DView]);

    // Synchroniser les modes de navigation avec les props externes
    useEffect(() => {
        setNavigationMode(isOrbitMode ? 'orbit' : 'move');
    }, [isOrbitMode]);

    useEffect(() => {
        setFirstPersonView(isCharacterMode);
    }, [isCharacterMode]);

 
    const handleKeyPress = (e: KeyboardEvent) => {
        // Fonction pour détecter si l'utilisateur tape dans un input
        const isTypingInInput = () => {
            const activeElement = document.activeElement;
            if (!activeElement) return false;
            
            const tagName = activeElement.tagName.toLowerCase();
            const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
            const isContentEditable = activeElement.getAttribute('contenteditable') === 'true';
            
            return isInput || isContentEditable;
        };

        // Only allow toggling first person view when not in ObjectOnly mode and not typing in input
        if ((e.key === 'v' || e.key === 'V') && !isObjectOnlyView && !is2DView && !isTypingInInput()) {
            setFirstPersonView(!firstPersonView);
        }
        
        // Toggle between orbit and move navigation modes with 'n' key
        if ((e.key === 'n' || e.key === 'N') && !isObjectOnlyView && !firstPersonView && !isTypingInInput()) {
            e.preventDefault(); // Empêcher tout comportement par défaut
            setNavigationMode(prev => prev === 'orbit' ? 'move' : 'orbit');
        }
    };

    useEffect(() => {
        window.addEventListener('keypress', handleKeyPress);
        return () => window.removeEventListener('keypress', handleKeyPress);
    }, [firstPersonView]);

    const handleCharacterUpdate = (position: THREE.Vector3, rotation: THREE.Euler) => {
        setCharacterPosition(position);
        setCharacterRotation(rotation);
    };

    const rotateCamera = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (rotateCharacterRef.current) {
            rotateCharacterRef.current(direction);
        }
    };

    const WallDimensions = () => {
        const { scene } = useThree();
        
        useEffect(() => {
            // Nettoyer les anciennes dimensions
            scene.children = scene.children.filter(child => !child.userData.isDimensionLabel);

            if (!is2DView || !showAllDimensions) return;

            objects.forEach(obj => {
                console.log('Checking object for dimensions:', {
                    id: obj.id,
                    details: obj.details,
                    type: obj.type,
                    scale: obj.scale,
                    position: obj.position
                });
                
                if (obj.details.includes('mur') || obj.details.includes('Mur') || obj.type === 'wall') {
                    console.log('Creating wall dimensions for:', obj.details);
                    // Affichage des dimensions pour les murs
                    const rotation = obj.rotation || [0, 0, 0];
                    const length = obj.scale[0];
                    
                    // Utiliser la vraie position de l'objet (multiplier par 2 si nécessaire)
                    const realPosition = [
                        obj.position[0] * 2,
                        obj.position[1] * 2,
                        obj.position[2] * 2
                    ];
                    
                    // Calculer les points de début et de fin du mur
                    const angle = rotation[1];
                    const wallDirection = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
                    const wallStart = new THREE.Vector3(
                        realPosition[0] - (wallDirection.x * length / 2),
                        0,
                        realPosition[2] - (wallDirection.z * length / 2)
                    );
                    const wallEnd = new THREE.Vector3(
                        realPosition[0] + (wallDirection.x * length / 2),
                        0,
                        realPosition[2] + (wallDirection.z * length / 2)
                    );

                    // Créer la ligne de dimension avec la même logique que RaycasterHandler
                    createDimensionLineForObject(scene, wallStart, wallEnd, length, 'L');
                } else {
                    console.log('Object not handled for dimensions:', obj.details, obj.type);
                }
            });
        }, [scene, objects, is2DView, showAllDimensions]);

        return null;
    };

    const createDimensionLineForObject = (scene: THREE.Scene, start: THREE.Vector3, end: THREE.Vector3, value: number, label: string) => {
        // Utiliser la même logique que RaycasterHandler pour l'affichage des dimensions
        const direction = new THREE.Vector3().subVectors(end, start);
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        
        // Calculer un décalage perpendiculaire pour l'étiquette
        // Utiliser une direction fixe pour éviter les problèmes de symétrie
        let perpendicular;
        if (Math.abs(direction.x) > Math.abs(direction.z)) {
            // Ligne plus horizontale, décalage vertical
            perpendicular = new THREE.Vector3(0, 0, 1).multiplyScalar(1.5);
        } else {
            // Ligne plus verticale, décalage horizontal
            perpendicular = new THREE.Vector3(1, 0, 0).multiplyScalar(1.5);
        }
        const labelPosition = midPoint.clone().add(perpendicular);

        // Créer l'étiquette de dimension avec le même style que RaycasterHandler
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
            canvas.width = 120;
            canvas.height = 40;
            context.fillStyle = '#2196F3';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.font = 'bold 16px Arial';
            context.fillStyle = 'white';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(`${label}: ${value.toFixed(2)}m`, canvas.width / 2, canvas.height / 2);
        }

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            depthTest: false,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(labelPosition);
        sprite.position.y = 0.05;
        sprite.scale.set(1.5, 0.6, 1);
        sprite.userData.isDimensionLabel = true;
        sprite.renderOrder = 999;
        scene.add(sprite);

        // Créer la ligne de connexion (optionnel, pour plus de clarté)
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x2196F3, 
            linewidth: 1,
            depthTest: false,
            depthWrite: false
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.userData.isDimensionLabel = true;
        line.renderOrder = 999;
        scene.add(line);
    };

    
    

    const handleSceneClick = useCallback((event: THREE.Intersection) => {
        if (navigationMode !== 'move' || firstPersonView || is2DView || isObjectOnlyView) return;
        
        // Si nous avons un point d'intersection
        if (event.point) {
            // Définir le point cible pour le déplacement
            targetPositionRef.current = event.point.clone();
            // Conserver la hauteur actuelle de la caméra
            if (cameraPositionRef.current) {
                targetPositionRef.current.y = cameraPositionRef.current.y;
            }
            isMovingToTargetRef.current = true;
        }
    }, [navigationMode, firstPersonView, is2DView, isObjectOnlyView]);

    const handleSetCamera = useCallback((camera: THREE.Camera) => {
        setCamera(camera);
        setCurrentCamera(camera);
    }, [setCamera]);

    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const url = event.dataTransfer.getData('text/plain');
        if (url && currentCamera) {
            handleAddObject(url, event, currentCamera);
        }
    }, [handleAddObject, currentCamera]);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    }, []);

    // Mettre à jour le point cible de l'orbite
    const updateOrbitTarget = useCallback(() => {
        if (!currentCamera) return;
        
        // Créer un vecteur direction pointant vers l'avant de la caméra
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(currentCamera.quaternion);
        
        // Calculer le point d'intersection avec le plan y=0
        const cameraPosition = currentCamera.position.clone();
        const t = -cameraPosition.y / direction.y;
        const intersectionPoint = new THREE.Vector3(
            cameraPosition.x + direction.x * t,
            0,
            cameraPosition.z + direction.z * t
        );
        
        // Si le point d'intersection est trop loin ou invalide, utiliser un point par défaut
        if (!isFinite(t) || Math.abs(t) > 1000) {
            setOrbitTarget(new THREE.Vector3(0, 0, 0));
        } else {
            setOrbitTarget(intersectionPoint);
        }
    }, [currentCamera]);

    // Mettre à jour le point cible lors du changement de mode et de la position de la caméra
    useEffect(() => {
        if (!firstPersonView && !is2DView) {
            updateOrbitTarget();
        }
    }, [navigationMode, updateOrbitTarget, currentCamera?.position.x, currentCamera?.position.y, currentCamera?.position.z, firstPersonView, is2DView]);

    // Supprimer l'état center2D et la synchronisation

    return (
        <>
            {is2DView  }

            {firstPersonView && (
                <PersonView rotateCamera={rotateCamera} />
            )}
            {/* <NavigationModeIndicator 
                is2DView={is2DView}
                isObjectOnlyView={isObjectOnlyView}
                firstPersonView={firstPersonView}
                navigationMode={navigationMode}
                setNavigationMode={setNavigationMode}
            /> */}
            <div 
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={{ width: '100%', height: '100%' }}
            >
                <Canvas 
                    onClick={(event) => {
                        // Si on clique sur le canvas (espace vide), désélectionner les objets
                        if (event.target === event.currentTarget && onDeselect) {
                            onDeselect();
                        }
                        setIsMoving(null);
                    }}
                    shadows
                    gl={{ 
                        antialias: true,
                        pixelRatio: window.devicePixelRatio
                    }}
                    camera={{
                        position: [30, 30, 30],
                        fov: 50,
                        near: 0.1,
                        far: 1000
                    }}
                >
                    <CameraProvider 
                        setCamera={handleSetCamera} 
                        is2DView={is2DView} 
                        firstPersonView={firstPersonView}
                        firstPersonPosition={characterPosition}
                        firstPersonRotation={characterRotation}
                        zoom2D={zoom2D}
                        isObjectOnlyView={isObjectOnlyView}
                        focusedObject={focusedObjectId ? objects.find(o => o.id === focusedObjectId) || null : null}
                        preserveCameraOnModeChange={true}
                    />
                    {!firstPersonView && (
                        <RaycasterHandler
                            is2DView={is2DView}
                            creatingWallMode={creatingWallMode}
                            groundPlane={groundPlane}
                            handleAddWall2D={handleAddWall2D}
                            walls2D={walls2D}
                        />
                    )}
                    <WallDimensions />
                    <ambientLight intensity={2.0} />
                    <directionalLight 
                        position={[10, 20, 15]} 
                        intensity={3.0}
                        castShadow
                    />
                    <directionalLight position={[-10, -20, -15]} intensity={3.0} />
                    <pointLight position={[0, 10, 10]} intensity={2.5} />
                    <pointLight position={[10, -10, 10]} intensity={2.5} />
                    <hemisphereLight groundColor={'#b9b9b9'} intensity={2.0} />
                    
                    {!firstPersonView && !is2DView && (
                        <OrbitControls 
                            ref={orbitControlsRef} 
                            enabled={!is2DView || isObjectOnlyView}
                            minDistance={isObjectOnlyView ? 2 : 1}
                            maxDistance={isObjectOnlyView ? 20 : 1000}
                            enableZoom={!isObjectOnlyView}
                            enablePan={navigationMode === 'orbit'}
                            enableRotate={true}
                            rotateSpeed={1}
                            autoRotate={isObjectOnlyView}
                            autoRotateSpeed={isObjectOnlyView ? 1 : 0}
                            target={orbitTarget}
                            minPolarAngle={0}
                            maxPolarAngle={Math.PI / 2}
                            enableDamping={true}
                            dampingFactor={0.05}
                        />
                    )}

                    {is2DView && (
                        <OrbitControls
                            ref={orbitControlsRef}
                            enableRotate={false}
                            enableZoom={true}
                            enablePan={true}
                            minPolarAngle={Math.PI / 2}
                            maxPolarAngle={Math.PI / 2}
                            enableDamping={false}
                            zoomSpeed={1}
                            panSpeed={1}
                            screenSpacePanning={true}
                            mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 0 }}
                        />
                    )}
                    
                    {navigationMode === 'move' && !firstPersonView && !is2DView && (
                        <MoveControls 
                            cameraPositionRef={cameraPositionRef}
                            orbitControlsRef={orbitControlsRef}
                            isMovingToTargetRef={isMovingToTargetRef}
                            navigationMode={navigationMode}
                            firstPersonView={firstPersonView}
                            is2DView={is2DView}
                            isObjectOnlyView={isObjectOnlyView}
                            groundPlane={groundPlane} 
                            handleSceneClick={handleSceneClick}
                        />
                    )}

                    {/* Afficher le groundPlane dès l'arrivée sur la page de maquette, pas en mode ObjectOnly */}
                    {!isObjectOnlyView && (
                        <>
                            {groundPlane && <primitive object={groundPlane} />}
                            {/* Sol gris de secours si groundPlane n'est pas encore créé */}
                            {!groundPlane && (
                                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                                    <planeGeometry args={[100, 100]} />
                                    <meshStandardMaterial 
                                        color="#716e6e"
                                        side={THREE.DoubleSide}
                                        transparent={true}
                                        opacity={0.8}
                                        roughness={0.9}
                                        metalness={0.1}
                                    />
                                </mesh>
                            )}
                        </>
                    )}
                    
                    {/* Afficher la grille en mode 2D , pas en mode ObjectOnly */}
                    {is2DView && !isObjectOnlyView && (
                        <gridHelper 
                            args={[100, 100, '#e0e0e0']} 
                            position={[0, 0, 0]} 
                            rotation={[0, 0, 0]} 
                        />
                    )}

                
                    
                    {/* Fond neutre pour le mode ObjectOnly */}
                    {isObjectOnlyView && (
                        <color attach="background" args={["#f5f5f5"]} />
                    )}

                    {/* Afficher les objets normalement en mode 3D ou 2D */}
                    {objects.map((obj) => (
                        <GLTFObject
                            key={obj.id}
                            id={obj.id}
                            url={obj.url}
                            scale={obj.scale}
                            position={obj.position}
                            gltf={obj.gltf}
                            texture={obj.texture || ''}
                            price={obj.price}
                            updateQuotePrice={updateQuotePrice}
                            rotation={obj.rotation}
                            onUpdatePosition={onUpdatePosition}
                            isMovable={isMoving === obj.id}
                            onClick={() => onClick(obj.id)}
                            showDimensions={!!showDimensions[obj.id]}
                            color={obj.color}
                            isSelected={selectedObjectId === obj.id}
                            type={obj.type}
                            faces={obj.faces}
                            onUpdateFaces={onUpdateFaces}
                            isMultiSelected={selectedObjectIds?.includes(obj.id)}
                            onMultiSelect={onMultiSelect}
                        />
                    ))}

                  
                 
            
                  
                    {is2DView && walls2D.map((line, index) => (
                        <primitive key={`2d-line-${index}`} object={line} />
                    ))}

                    {!is2DView && !isObjectOnlyView && (
                        <Character 
                            isEnabled={firstPersonView} 
                            onPositionUpdate={handleCharacterUpdate}
                            onRotationUpdate={(handler) => {
                                rotateCharacterRef.current = handler;
                            }}
                        />
                    )}
                    
                
                    {/* Afficher l'aperçu de la surface */}
                    {surfacePreview && (
                        <primitive object={surfacePreview} />
                    )}

                    <SurfaceHandler
                        isCreatingSurface={isCreatingSurface}
                        groundPlane={groundPlane}
                        surfaceStartPoint={surfaceStartPoint}
                        onSurfacePointSelected={onSurfacePointSelected}
                        onSurfacePreviewUpdate={onSurfacePreviewUpdate}
                    />
                </Canvas>
            </div>
        </>
    );
};

export default CanvasScene;