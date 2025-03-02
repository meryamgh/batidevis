import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import GLTFObject from './GLTFObject';
import Character from './Character';
import { ObjectData } from '../types/ObjectData';
import * as THREE from 'three';

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
    walls2D: THREE.Line[];
    groundPlane: THREE.Mesh | null;
    handleAddWall2D: (start: THREE.Vector3, end: THREE.Vector3) => void;
    creatingWallMode: boolean;
};
const CameraProvider: React.FC<{ 
    setCamera: (camera: THREE.Camera) => void; 
    is2DView: boolean;
    firstPersonView: boolean;
    firstPersonPosition?: THREE.Vector3;
    firstPersonRotation?: THREE.Euler;
    zoom2D: number;
}> = ({ setCamera, is2DView, firstPersonView, firstPersonPosition, firstPersonRotation, zoom2D }) => {
    const { camera } = useThree();

    useEffect(() => {
        if (firstPersonView && firstPersonPosition && firstPersonRotation) {
            camera.position.copy(firstPersonPosition);
            camera.rotation.copy(firstPersonRotation);
        } else if (is2DView) {
            camera.position.set(0, zoom2D, 0);
            camera.lookAt(0, 0, 0);
            (camera as THREE.PerspectiveCamera).fov = 10;
        } else {
            camera.position.set(10, 20, 30);
            camera.lookAt(0, 0, 0);
        }
        camera.updateProjectionMatrix();
        setCamera(camera);
    }, [camera, is2DView, firstPersonView, firstPersonPosition, firstPersonRotation, setCamera, zoom2D]);

    return null;
};

const RaycasterHandler: React.FC<{
    is2DView: boolean;
    creatingWallMode: boolean;
    groundPlane: THREE.Mesh | null;
    handleAddWall2D: (start: THREE.Vector3, end: THREE.Vector3) => void;
    walls2D: THREE.Line[];
}> = ({ is2DView, creatingWallMode, groundPlane, handleAddWall2D, walls2D }) => {
    const { camera, scene } = useThree();
    const raycaster = useRef(new THREE.Raycaster());
    const mouse = useRef(new THREE.Vector2());
    const [wallStart, setWallStart] = useState<THREE.Vector3 | null>(null);
    const lineHelper = useRef<THREE.Line | null>(null);
    const spheres = useRef<THREE.Mesh[]>([]);

    const isWallAligned = (start: THREE.Vector3, end: THREE.Vector3): boolean => {
        const angle = Math.atan2(end.z - start.z, end.x - start.x) * (180 / Math.PI);
        const tolerance = 0.3; // Tolérance en degrés
        const alignedAngles = [0, 45, 90, 135, 180, -45, -90, -135, -180];
        return alignedAngles.some(targetAngle => 
            Math.abs(angle - targetAngle) < tolerance
        );
    };

    const checkWallIntersection = (start: THREE.Vector3, end: THREE.Vector3): boolean => {
        // Fonction pour vérifier si deux segments se croisent
        const doSegmentsIntersect = (
            p1: THREE.Vector3, p2: THREE.Vector3,
            p3: THREE.Vector3, p4: THREE.Vector3
        ): boolean => {
            const denominator = ((p4.z - p3.z) * (p2.x - p1.x)) - ((p4.x - p3.x) * (p2.z - p1.z));
            if (denominator === 0) return false;

            const ua = (((p4.x - p3.x) * (p1.z - p3.z)) - ((p4.z - p3.z) * (p1.x - p3.x))) / denominator;
            const ub = (((p2.x - p1.x) * (p1.z - p3.z)) - ((p2.z - p1.z) * (p1.x - p3.x))) / denominator;

            return (ua >= 0 && ua <= 1) && (ub >= 0 && ub <= 1);
        };

        return walls2D.some(wall => {
            const geometry = wall.geometry as THREE.BufferGeometry;
            const positions = geometry.getAttribute('position');
            const wallStart = new THREE.Vector3(positions.getX(0), 0, positions.getZ(0));
            const wallEnd = new THREE.Vector3(positions.getX(1), 0, positions.getZ(1));

            return doSegmentsIntersect(start, end, wallStart, wallEnd);
        });
    };

    useEffect(() => {
        if (!is2DView || !creatingWallMode || !groundPlane) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!wallStart) return;

            const canvasBounds = (e.target as HTMLElement).getBoundingClientRect();
            const x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
            const y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

            mouse.current.set(x, y);
            raycaster.current.setFromCamera(mouse.current, camera);

            const intersects = raycaster.current.intersectObject(groundPlane);

            if (intersects.length > 0) {
                const point = intersects[0].point.clone();
                point.y = 0;

                // Vérifier l'alignement et l'intersection
                const isAligned = isWallAligned(wallStart, point);
                const hasIntersection = checkWallIntersection(wallStart, point);
                const lineColor = (isAligned || hasIntersection) ? 0x00ff00 : 0x0000ff;

                if (lineHelper.current) {
                    const points = [
                        new THREE.Vector3(wallStart.x, 1, wallStart.z),
                        new THREE.Vector3(point.x, 1, point.z)
                    ];
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    lineHelper.current.geometry.dispose();
                    lineHelper.current.geometry = geometry;
                    (lineHelper.current.material as THREE.LineBasicMaterial).color.setHex(lineColor);

                    // Calculer la distance et la position de l'étiquette
                    const length = wallStart.distanceTo(point);
                    const direction = new THREE.Vector3().subVectors(point, wallStart);
                    const midPoint = new THREE.Vector3().addVectors(wallStart, point).multiplyScalar(0.5);
                    
                    // Calculer un décalage perpendiculaire pour l'étiquette
                    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(1);
                    const labelPosition = midPoint.clone().add(perpendicular);

                    // Supprimer l'ancienne étiquette si elle existe
                    scene.children = scene.children.filter(child => !child.userData.isDynamicDimensionLabel);

                    // Créer l'étiquette de dimension
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (context) {
                        canvas.width = 100;
                        canvas.height = 40;
                        context.fillStyle = lineColor === 0x00ff00 ? '#4CAF50' : '#2196F3';
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
                    sprite.userData.isDynamicDimensionLabel = true;
                    scene.add(sprite);
                } else {
                    const material = new THREE.LineBasicMaterial({ 
                        color: lineColor,
                        linewidth: 3
                    });
                    const points = [wallStart, point];
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.LineSegments(geometry, material);
                    line.computeLineDistances();
                    lineHelper.current = line;
                    scene.add(line);

                    // Ajouter des points plus gros aux extrémités
                    const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
                    const sphereMaterial = new THREE.MeshBasicMaterial({ color: lineColor });
                    
                    const startSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                    startSphere.position.copy(wallStart);
                    line.add(startSphere);

                    const endSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                    endSphere.position.copy(point);
                    line.add(endSphere);

                    // Créer l'étiquette initiale
                    const length = wallStart.distanceTo(point);
                    const direction = new THREE.Vector3().subVectors(point, wallStart);
                    const midPoint = new THREE.Vector3().addVectors(wallStart, point).multiplyScalar(0.5);
                    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(1);
                    const labelPosition = midPoint.clone().add(perpendicular);

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (context) {
                        canvas.width = 100;
                        canvas.height = 40;
                        context.fillStyle = lineColor === 0x00ff00 ? '#4CAF50' : '#2196F3';
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
                    sprite.userData.isDynamicDimensionLabel = true;
                    scene.add(sprite);
                }
            }
        };

        const handleMouseClick = (e: MouseEvent) => {
            if (!groundPlane) return;

            const canvasBounds = (e.target as HTMLElement).getBoundingClientRect();
            const x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
            const y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

            mouse.current.set(x, y);
            raycaster.current.setFromCamera(mouse.current, camera);

            const intersects = raycaster.current.intersectObject(groundPlane);

            if (intersects.length > 0) {
                const point = intersects[0].point.clone();
                point.y = 0;

                // Ajouter une sphère pour marquer le point
                const geometry = new THREE.SphereGeometry(0.1, 16, 16);
                const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                const sphere = new THREE.Mesh(geometry, material);
                sphere.position.copy(point);
                scene.add(sphere);
                spheres.current.push(sphere);

                if (!wallStart) {
                    setWallStart(point);
                } else {
                    const isAligned = isWallAligned(wallStart, point);
                    const hasIntersection = checkWallIntersection(wallStart, point);
                    
                    handleAddWall2D(wallStart, point);

                    setWallStart(null);
                    if (lineHelper.current) {
                        lineHelper.current.geometry.dispose();
                        if (lineHelper.current.material) {
                            if (Array.isArray(lineHelper.current.material)) {
                                lineHelper.current.material.forEach(material => material.dispose());
                            } else {
                                lineHelper.current.material.dispose();
                            }
                        }
                        scene.remove(lineHelper.current);
                        lineHelper.current = null;
                    }
                }
            }
        };

        const canvas = document.querySelector('canvas');
        canvas?.addEventListener('mousemove', handleMouseMove);
        canvas?.addEventListener('click', handleMouseClick);

        return () => {
            canvas?.removeEventListener('mousemove', handleMouseMove);
            canvas?.removeEventListener('click', handleMouseClick);
            // Nettoyer les sphères lors du démontage
            spheres.current.forEach(sphere => {
                sphere.geometry.dispose();
                if (sphere.material instanceof THREE.Material) {
                    sphere.material.dispose();
                }
                scene.remove(sphere);
            });
            spheres.current = [];
        };
    }, [is2DView, creatingWallMode, wallStart, groundPlane, camera, scene, handleAddWall2D, walls2D]);

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
    walls2D,
    groundPlane,
    handleAddWall2D,
    creatingWallMode,
}) => {
    const [firstPersonView, setFirstPersonView] = useState(false);
    const [characterPosition, setCharacterPosition] = useState<THREE.Vector3 | undefined>();
    const [characterRotation, setCharacterRotation] = useState<THREE.Euler | undefined>();
    const rotateCharacterRef = useRef<((direction: 'up' | 'down' | 'left' | 'right') => void) | null>(null);
    const [showAllDimensions, setShowAllDimensions] = useState(false);
    const [zoom2D, setZoom2D] = useState(100);

    const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === 'v' || e.key === 'V') {
            setFirstPersonView(!firstPersonView);
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

    return (
        <>
            {is2DView && (
                <div style={{
                    position: 'fixed',
                    top: '10px',
                    right: '20px',
                    zIndex: 1000,
                    display: 'flex',
                    gap: '10px'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '5px',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.7)',
                        padding: '5px',
                        borderRadius: '4px'
                    }}>
                        <button
                            onClick={() => setZoom2D(prev => Math.min(prev - 10, 200))}
                            style={{
                                padding: '8px',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                width: '40px',
                                height: '40px'
                            }}
                        >
                            +
                        </button>
                        <button
                            onClick={() => setZoom2D(prev => Math.max(prev + 10, 50))}
                            style={{
                                padding: '8px',
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                width: '40px',
                                height: '40px'
                            }}
                        >
                            -
                        </button>
                    </div>
                    <button
                        onClick={() => setShowAllDimensions(!showAllDimensions)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: showAllDimensions ? '#4CAF50' : '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {showAllDimensions ? 'Masquer dimensions' : 'Afficher dimensions'}
                    </button>
                </div>
            )}

            {firstPersonView && (
                <>
                    <div style={{
                        position: 'fixed',
                        top: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '10px',
                        borderRadius: '5px',
                        zIndex: 1000
                    }}>
                        Appuyez sur V pour sortir de la vue première personne<br/>
                        Utilisez ZQSD ou les flèches pour vous déplacer<br/>
                        Maintenez le clic gauche pour regarder autour de vous<br/>
                        Molette de la souris pour zoomer/dézoomer<br/>
                        Échap : libérer la souris
                    </div>
                    <div style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 40px)',
                        gap: '5px',
                        zIndex: 1000
                    }}>
                        {/* Rotation vers le haut */}
                        <div style={{ gridColumn: '2/3' }}>
                            <button
                                onClick={() => rotateCamera('up')}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '5px',
                                    border: 'none',
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ↑
                            </button>
                        </div>
                        {/* Rotation gauche */}
                        <div>
                            <button
                                onClick={() => rotateCamera('left')}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '5px',
                                    border: 'none',
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ←
                            </button>
                        </div>
                        {/* Case du milieu vide */}
                        <div></div>
                        {/* Rotation droite */}
                        <div>
                            <button
                                onClick={() => rotateCamera('right')}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '5px',
                                    border: 'none',
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                →
                            </button>
                        </div>
                        {/* Rotation vers le bas */}
                        <div style={{ gridColumn: '2/3' }}>
                            <button
                                onClick={() => rotateCamera('down')}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '5px',
                                    border: 'none',
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ↓
                            </button>
                        </div>
                    </div>
                </>
            )}
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
                
                {!firstPersonView && (
                    <OrbitControls ref={orbitControlsRef} enabled={!is2DView} />
                )}

                {groundPlane && <primitive object={groundPlane} />}
                {is2DView && <gridHelper args={[50, 50]} position={[0, 0, 0]} />}

                {!is2DView && !firstPersonView && (
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
                        <planeGeometry args={[50, 50]} />
                        <meshStandardMaterial color="lightgray" />
                    </mesh>
                )}

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
                    />
                ))}

                {is2DView && walls2D.map((line, index) => (
                    <primitive key={index} object={line} />
                ))}

                {!is2DView && (
                    <Character 
                        isEnabled={firstPersonView} 
                        onPositionUpdate={handleCharacterUpdate}
                        onRotationUpdate={(handler) => {
                            rotateCharacterRef.current = handler;
                        }}
                    />
                )}
            </Canvas>
        </>
    );
};

export default CanvasScene;
