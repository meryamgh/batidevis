import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import GLTFObject from './GLTFObject';
import Character from './Character';
import { ObjectData } from '../types/ObjectData';
import * as THREE from 'three';
import CameraProvider from './canvaScene/CameraProvider';
import RaycasterHandler from './canvaScene/RaycasterHandler';
import MoveControls from './canvaScene/MoveControls';
import NavigationModeIndicator from './panels/NavigationModeIndicatorPanel';
import TwoDView from './canvaScene/2Dview';
import PersonView from './canvaScene/PersonView';
import BlueprintClickHandler from './canvaScene/BlueprintClickHandler';

type CanvasSceneProps = {
    objects: ObjectData[];
    onClick: (id: string) => void;
    onUpdatePosition: (id: string, position: [number, number, number]) => void;
    isMoving: string | null;
    setIsMoving: (id: string | null) => void;
    orbitControlsRef: React.RefObject<any>;
    setCamera: (camera: THREE.Camera) => void;
    updateQuotePrice: (id: string, price: number, scale : [number, number, number]) => void;
    showDimensions: { [key: string]: boolean };
    is2DView: boolean;
    isBlueprintView: boolean;
    isObjectOnlyView?: boolean;
    focusedObjectId?: string | null;
    selectedObjectId?: string | null;
    walls2D: THREE.Line[];
    groundPlane: THREE.Mesh | null;
    handleAddWall2D: (start: THREE.Vector3, end: THREE.Vector3) => void;
    creatingWallMode: boolean;
    blueprintPoints?: THREE.Vector3[];
    blueprintLines?: {start: THREE.Vector3, end: THREE.Vector3, id: string, length: number}[];
    tempPoint?: THREE.Vector3 | null;
    handleBlueprintClick?: (point: THREE.Vector3) => void;
    updateRectanglePreview?: (start: THREE.Vector3, end: THREE.Vector3) => void;
    rectangleStartPoint?: THREE.Vector3 | null;
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
    isBlueprintView,
    isObjectOnlyView,
    focusedObjectId,
    selectedObjectId,
    walls2D,
    groundPlane,
    handleAddWall2D,
    creatingWallMode,
    blueprintPoints,
    blueprintLines,
    tempPoint,
    handleBlueprintClick,
    updateRectanglePreview,
    rectangleStartPoint,
}) => {
    const [firstPersonView, setFirstPersonView] = useState(false);
    const [characterPosition, setCharacterPosition] = useState<THREE.Vector3 | undefined>();
    const [characterRotation, setCharacterRotation] = useState<THREE.Euler | undefined>();
    const rotateCharacterRef = useRef<((direction: 'up' | 'down' | 'left' | 'right') => void) | null>(null);
    const [showAllDimensions, setShowAllDimensions] = useState(false);
    const [zoom2D, setZoom2D] = useState(100);
    const [navigationMode, setNavigationMode] = useState<'orbit' | 'move'>('orbit');
    const targetPositionRef = useRef<THREE.Vector3 | null>(null);
    const cameraPositionRef = useRef<THREE.Vector3 | null>(null);
    const isMovingToTargetRef = useRef(false);

    // Disable first person view when in ObjectOnly mode or when switching views
    useEffect(() => {
        if (isObjectOnlyView || is2DView) {
            setFirstPersonView(false);
        }
    }, [isObjectOnlyView, is2DView]);

    // Fonction pour créer une représentation blueprint d'un objet
    const createBlueprintRepresentation = (obj: ObjectData) => {
        // Si c'est un mur, on le représente par une ligne épaisse
        if (obj.details.includes('Mur')) {
            const position = new THREE.Vector3(...obj.position);
            const scale = new THREE.Vector3(...obj.scale);
            const rotation = obj.rotation ? new THREE.Euler(...obj.rotation) : new THREE.Euler(0, 0, 0);
            
            // Calculer les points de début et de fin du mur
            const direction = new THREE.Vector3(Math.sin(rotation.y), 0, Math.cos(rotation.y));
            const halfLength = scale.x / 2;
            const start = position.clone().sub(direction.clone().multiplyScalar(halfLength));
            const end = position.clone().add(direction.clone().multiplyScalar(halfLength));
            
            return (
                <line key={obj.id}>
                    <bufferGeometry attach="geometry">
                        <bufferAttribute
                            attach="position"
                            array={new Float32Array([start.x, 0.1, start.z, end.x, 0.1, end.z])}
                            count={2}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial attach="material" color="#0066cc" linewidth={3} />
                </line>
            );
        }
        
        // Pour les autres objets, on les représente par un rectangle
        const position = new THREE.Vector3(...obj.position);
        const scale = new THREE.Vector3(...obj.scale);
        const rotation = obj.rotation ? new THREE.Euler(...obj.rotation) : new THREE.Euler(0, 0, 0);
        
        return (
            <mesh 
                key={obj.id}
                position={[position.x, 0.1, position.z]}
                rotation={[0, rotation.y, 0]}
                onClick={() => onClick(obj.id)}
            >
                <boxGeometry args={[scale.x, 0.01, scale.z]} />
                <meshBasicMaterial color="#0066cc" wireframe={true} />
            </mesh>
        );
    };

    const handleKeyPress = (e: KeyboardEvent) => {
        // Only allow toggling first person view when not in ObjectOnly mode
        if ((e.key === 'v' || e.key === 'V') && !isObjectOnlyView && !is2DView) {
            setFirstPersonView(!firstPersonView);
        }
        
        // Toggle between orbit and move navigation modes with 'n' key
        if ((e.key === 'n' || e.key === 'N') && !isObjectOnlyView && !is2DView && !firstPersonView) {
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
            scene.children = scene.children.filter(child => !child.userData.isDimensionLabel);

            if (!is2DView || !showAllDimensions) return;

            objects.forEach(obj => {
                if (obj.details.includes('Mur')) {
                    const rotation = obj.rotation || [0, 0, 0];
                    const length = obj.scale[0];
                    
                    // Calculer les points de début et de fin du mur
                    const angle = rotation[1];
                    const wallDirection = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
                    const wallStart = new THREE.Vector3(
                        obj.position[0] - (wallDirection.x * length / 2),
                        1,
                        obj.position[2] - (wallDirection.z * length / 2)
                    );
                    const wallEnd = new THREE.Vector3(
                        obj.position[0] + (wallDirection.x * length / 2),
                        1,
                        obj.position[2] + (wallDirection.z * length / 2)
                    );

                    // Calculer le point médian et la direction perpendiculaire
                    const midPoint = new THREE.Vector3().addVectors(wallStart, wallEnd).multiplyScalar(0.5);
                    const direction = new THREE.Vector3().subVectors(wallEnd, wallStart);
                    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
                    const labelPosition = midPoint.clone().add(perpendicular);

                    // Créer l'étiquette de dimension
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (context) {
                        canvas.width = 100;
                        canvas.height = 40;
                        context.fillStyle = '#4CAF50';
                        context.fillRect(0, 0, canvas.width, canvas.height);
                        context.font = 'bold 20px Arial';
                        context.fillStyle = 'white';
                        context.textAlign = 'center';
                        context.textBaseline = 'middle';
                        context.fillText(`${length.toFixed(2)}m`, canvas.width / 2, canvas.height / 2);
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
                    scene.add(sprite);
                }
            });
        }, [scene, objects, is2DView, showAllDimensions]);

        return null;
    };

     
    const LineMeasurement = ({ start, end, length }: { start: THREE.Vector3, end: THREE.Vector3, length: number }) => {
        // Calculer le point milieu de la ligne
        const midPoint = new THREE.Vector3().addVectors(
            new THREE.Vector3(start.x, 0.1, start.z),
            new THREE.Vector3(end.x, 0.1, end.z)
        ).multiplyScalar(0.5);
        
        // Calculer la direction perpendiculaire à la ligne
        const direction = new THREE.Vector3().subVectors(
            new THREE.Vector3(end.x, 0.1, end.z),
            new THREE.Vector3(start.x, 0.1, start.z)
        ).normalize();
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(0.7);
        
        // Position du texte
        const textPosition = new THREE.Vector3().addVectors(midPoint, perpendicular);
        
        // Créer une texture pour le texte
        const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
        
        useEffect(() => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = 256;
                canvas.height = 128;
                
                // Fond avec bordure
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = '#0066cc';
                ctx.lineWidth = 6;
                ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
                
                // Texte plus grand et plus visible
                ctx.fillStyle = '#0066cc';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${length.toFixed(2)}m`, canvas.width / 2, canvas.height / 2);
                
                const newTexture = new THREE.CanvasTexture(canvas);
                setTexture(newTexture);
            }
            
            return () => {
                if (texture) {
                    texture.dispose();
                }
            };
        }, [length]);
        
        if (!texture) return null;
        
        return (
            <sprite position={[textPosition.x, 0.2, textPosition.z]} scale={[2, 1, 1]}>
                <spriteMaterial attach="material" transparent={true} map={texture} />
            </sprite>
        );
    };
    
    
    const isAngleAligned = (angle: number, tolerance: number = 0.5): boolean => {
        // Convertir l'angle en degrés et le normaliser entre 0 et 360
        const degrees = ((angle * 180 / Math.PI) % 360 + 360) % 360;
        
        const targetAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
        
        return targetAngles.some(targetAngle => 
            Math.abs(degrees - targetAngle) < tolerance || 
            Math.abs(degrees - targetAngle - 360) < tolerance
        );
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

    

    return (
        <>
            {is2DView && (
                <TwoDView 
                    setZoom2D={setZoom2D}
                    setShowAllDimensions={setShowAllDimensions}
                    showAllDimensions={showAllDimensions}
                />
            )}

            {firstPersonView && (
                <PersonView rotateCamera={rotateCamera} />
            )}
            <NavigationModeIndicator 
                is2DView={is2DView}
                isObjectOnlyView={isObjectOnlyView}
                firstPersonView={firstPersonView}
                navigationMode={navigationMode}
                setNavigationMode={setNavigationMode}
            />
            <Canvas 
                onClick={() => setIsMoving(null)}
                shadows
                gl={{ 
                    antialias: true,
                    pixelRatio: window.devicePixelRatio
                }}
            >
                <CameraProvider 
                    setCamera={setCamera} 
                    is2DView={is2DView} 
                    firstPersonView={firstPersonView}
                    firstPersonPosition={characterPosition}
                    firstPersonRotation={characterRotation}
                    zoom2D={zoom2D}
                    isObjectOnlyView={isObjectOnlyView}
                    focusedObject={focusedObjectId ? objects.find(o => o.id === focusedObjectId) || null : null}
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
                
                {!firstPersonView && !is2DView && navigationMode === 'orbit' && (
                    <OrbitControls 
                        ref={orbitControlsRef} 
                        enabled={!is2DView || isObjectOnlyView} 
                        minDistance={isObjectOnlyView ? 2 : 1}
                        maxDistance={isObjectOnlyView ? 20 : 1000}
                        enableZoom={!isObjectOnlyView}
                        enablePan={!isObjectOnlyView}
                        rotateSpeed={isObjectOnlyView ? 0.5 : 1}
                        autoRotate={isObjectOnlyView}
                        autoRotateSpeed={isObjectOnlyView ? 1 : 0}
                    />
                )}
                
                {!firstPersonView && !is2DView && navigationMode === 'move' && (
                    <>
                        <OrbitControls 
                            ref={orbitControlsRef}
                            enableRotate={true}
                            enableZoom={true}
                            enablePan={false}
                            minPolarAngle={0}
                            maxPolarAngle={Math.PI / 2 - 0.1} // Limiter la rotation verticale
                        />
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
                    </>
                )}

                {/* Afficher le groundPlane seulement en mode 3D ou 2D, pas en mode Blueprint ou ObjectOnly */}
                {groundPlane && !isBlueprintView && !isObjectOnlyView && <primitive object={groundPlane} />}
                
                {/* Afficher la grille en mode 2D ou Blueprint, pas en mode ObjectOnly */}
                {is2DView && !isObjectOnlyView && (
                    <gridHelper 
                        args={[50, 50]} 
                        position={[0, 0.05, 0]} 
                        // Couleur différente pour le mode Blueprint
                        userData={{ color: isBlueprintView ? '#1a3f5c' : '#444444' }}
                    />
                )}

                {/* Fond bleu clair pour le mode Blueprint */}
                {isBlueprintView && !isObjectOnlyView && (
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                        <planeGeometry args={[100, 100]} />
                        <meshBasicMaterial color="#e6f2ff" />
                    </mesh>
                )}
                
                {/* Fond neutre pour le mode ObjectOnly */}
                {isObjectOnlyView && (
                    <color attach="background" args={["#f5f5f5"]} />
                )}

                {/* Afficher les objets normalement en mode 3D ou 2D */}
                {!isBlueprintView && objects.map((obj) => (
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
                    />
                ))}

                {/* Afficher les représentations blueprint en mode Blueprint */}
                {isBlueprintView && objects.map(createBlueprintRepresentation)}

                {/* Afficher les lignes Blueprint avec leur taille */}
                {isBlueprintView && walls2D.map((line, index) => (
                    <primitive key={`blueprint-line-${index}`} object={line} />
                ))}
                
                {/* Afficher les mesures des lignes */}
                {isBlueprintView && blueprintLines && blueprintLines.map(line => (
                    <LineMeasurement 
                        key={`measure-${line.id}`}
                        start={line.start}
                        end={line.end}
                        length={line.length}
                    />
                ))}

                {/* Afficher le point temporaire */}
                {isBlueprintView && tempPoint && (
                    <mesh position={[tempPoint.x, 0.1, tempPoint.z]}>
                        <sphereGeometry args={[0.2, 16, 16]} />
                        <meshBasicMaterial color="#ff3333" />
                    </mesh>
                )}
                
                {/* Afficher tous les points existants */}
                {isBlueprintView && blueprintPoints && blueprintPoints.length > 0 && (
                    <group>
                        {blueprintPoints.map((point, index) => (
                            <mesh 
                                key={`point-${index}`}
                                position={[point.x, 0.1, point.z]}
                            >
                                <sphereGeometry args={[0.15, 16, 16]} />
                                <meshBasicMaterial color="#0066cc" />
                            </mesh>
                        ))}
                    </group>
                )}

                {is2DView && !isBlueprintView && walls2D.map((line, index) => (
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
                 
                {isBlueprintView && (
                    <BlueprintClickHandler 
                        isBlueprintView={isBlueprintView}
                        tempPoint={tempPoint || null}
                        groundPlane={groundPlane}
                        rectangleStartPoint={rectangleStartPoint || null}
                        handleBlueprintClick={handleBlueprintClick || (() => {})}
                        updateRectanglePreview={updateRectanglePreview}
                        isAngleAligned={isAngleAligned}
                    />
                )}
            </Canvas>
        </>
    );
};

export default CanvasScene;
