import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, TransformControls, FlyControls } from '@react-three/drei';
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
    isBlueprintView: boolean;
    isObjectOnlyView?: boolean;
    focusedObjectId?: string | null;
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
const CameraProvider: React.FC<{ 
    setCamera: (camera: THREE.Camera) => void; 
    is2DView: boolean;
    firstPersonView: boolean;
    firstPersonPosition?: THREE.Vector3;
    firstPersonRotation?: THREE.Euler;
    zoom2D: number;
    isObjectOnlyView?: boolean;
    focusedObject?: ObjectData | null;
}> = ({ setCamera, is2DView, firstPersonView, firstPersonPosition, firstPersonRotation, zoom2D, isObjectOnlyView, focusedObject }) => {
    const { camera, scene } = useThree();

    useEffect(() => {
        if (firstPersonView && firstPersonPosition && firstPersonRotation) {
            camera.position.copy(firstPersonPosition);
            camera.rotation.copy(firstPersonRotation);
        } else if (isObjectOnlyView && focusedObject) {
            // Focus on the selected object
            const objectPosition = new THREE.Vector3(
                focusedObject.position[0],
                focusedObject.position[1],
                focusedObject.position[2]
            );
            
            // Calculate object size based on scale
            const objectSize = Math.max(
                focusedObject.scale[0],
                focusedObject.scale[1],
                focusedObject.scale[2]
            );
            
            // Position the camera at a distance proportional to the object size
            const distance = objectSize * 5;
            camera.position.set(
                objectPosition.x + distance,
                objectPosition.y + distance / 2,
                objectPosition.z + distance
            );
            
            // Look at the object
            camera.lookAt(objectPosition);
            
            // Set a narrower field of view for a more focused look
            (camera as THREE.PerspectiveCamera).fov = 30;
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
    }, [camera, is2DView, firstPersonView, firstPersonPosition, firstPersonRotation, setCamera, zoom2D, isObjectOnlyView, focusedObject]);

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
    isBlueprintView,
    isObjectOnlyView,
    focusedObjectId,
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

    // Composant pour afficher une flèche entre deux points
    const ArrowLine = ({ start, end, color = "#0066cc", arrowSize = 0.3 }: { start: THREE.Vector3, end: THREE.Vector3, color?: string, arrowSize?: number }) => {
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const length = start.distanceTo(end);
        const arrowPosition = new THREE.Vector3().addVectors(start, direction.clone().multiplyScalar(length - arrowSize));
        
        // Calculer les points pour la pointe de flèche
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(arrowSize / 2);
        const arrowLeft = new THREE.Vector3().addVectors(arrowPosition, perpendicular);
        const arrowRight = new THREE.Vector3().subVectors(arrowPosition, perpendicular);
        
        return (
            <group>
                {/* Ligne principale */}
                <line>
                    <bufferGeometry attach="geometry">
                        <bufferAttribute
                            attach="position"
                            array={new Float32Array([start.x, 0.1, start.z, end.x, 0.1, end.z])}
                            count={2}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial attach="material" color={color} linewidth={2} />
                </line>
                
                {/* Pointe de flèche */}
                <line>
                    <bufferGeometry attach="geometry">
                        <bufferAttribute
                            attach="position"
                            array={new Float32Array([
                                arrowLeft.x, 0.1, arrowLeft.z,
                                end.x, 0.1, end.z,
                                arrowRight.x, 0.1, arrowRight.z
                            ])}
                            count={3}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial attach="material" color={color} linewidth={2} />
                </line>
            </group>
        );
    };

    // Composant pour afficher une pièce
    const RoomOutline = ({ points, color = "#0066cc" }: { points: THREE.Vector3[], color?: string }) => {
        // Créer un tableau plat de coordonnées pour tous les points
        const vertices = new Float32Array(points.length * 3);
        points.forEach((point, i) => {
            vertices[i * 3] = point.x;
            vertices[i * 3 + 1] = 0.1;
            vertices[i * 3 + 2] = point.z;
        });
        
        return (
            <group>
                {/* Contour de la pièce */}
                <lineLoop>
                    <bufferGeometry attach="geometry">
                        <bufferAttribute
                            attach="position"
                            array={vertices}
                            count={points.length}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial attach="material" color={color} linewidth={2} />
                </lineLoop>
                
                {/* Flèches pour chaque segment */}
                {points.map((point, i) => {
                    const nextPoint = points[(i + 1) % points.length];
                    return (
                        <ArrowLine 
                            key={i} 
                            start={point} 
                            end={nextPoint} 
                            color={color}
                        />
                    );
                })}
            </group>
        );
    };

    // Composant pour afficher la taille d'une ligne
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

    // Fonction pour vérifier si un angle est aligné sur des angles spécifiques
    const isAngleAligned = (angle: number, tolerance: number = 0.5): boolean => {
        // Convertir l'angle en degrés et le normaliser entre 0 et 360
        const degrees = ((angle * 180 / Math.PI) % 360 + 360) % 360;
        
        // Angles spécifiques à vérifier (en degrés)
        const targetAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
        
        // Vérifier si l'angle est proche d'un des angles cibles
        return targetAngles.some(targetAngle => 
            Math.abs(degrees - targetAngle) < tolerance || 
            Math.abs(degrees - targetAngle - 360) < tolerance
        );
    };

    // Gestionnaire de clics pour le mode Blueprint
    const BlueprintClickHandler = () => {
        const { camera, scene } = useThree();
        const raycasterRef = useRef(new THREE.Raycaster());
        const mouseRef = useRef(new THREE.Vector2());
        const [mousePosition, setMousePosition] = useState<THREE.Vector3 | null>(null);
        const lineRef = useRef<THREE.Mesh | null>(null);
        const spriteRef = useRef<THREE.Sprite | null>(null);
        const [isAligned, setIsAligned] = useState(false);
        
        // Références pour les lignes de prévisualisation du rectangle
        const rectanglePreviewLinesRef = useRef<THREE.Mesh[]>([]);
        const rectanglePreviewSpriteRef = useRef<THREE.Sprite | null>(null);
        
        // Créer une ligne en pointillé entre le point temporaire et la position de la souris
        useEffect(() => {
            if (isBlueprintView && tempPoint && mousePosition) {
                // Calculer l'angle entre le point temporaire et la position de la souris
                const direction = new THREE.Vector3().subVectors(
                    new THREE.Vector3(mousePosition.x, 0, mousePosition.z),
                    new THREE.Vector3(tempPoint.x, 0, tempPoint.z)
                ).normalize();
                const angle = Math.atan2(direction.z, direction.x);
                
                // Vérifier si l'angle est aligné
                const aligned = isAngleAligned(angle);
                setIsAligned(aligned);
                
                // Supprimer l'ancienne ligne si elle existe
                if (lineRef.current) {
                    scene.remove(lineRef.current);
                    if (lineRef.current.geometry) lineRef.current.geometry.dispose();
                    if (lineRef.current.material) {
                        if (Array.isArray(lineRef.current.material)) {
                            lineRef.current.material.forEach((m: THREE.Material) => m.dispose());
                        } else {
                            lineRef.current.material.dispose();
                        }
                    }
                }
                
                // Supprimer l'ancien sprite s'il existe
                if (spriteRef.current) {
                    scene.remove(spriteRef.current);
                    if (spriteRef.current.material) {
                        if (Array.isArray(spriteRef.current.material)) {
                            spriteRef.current.material.forEach((m: THREE.Material) => m.dispose());
                        } else {
                            spriteRef.current.material.dispose();
                        }
                    }
                }
                
                // Créer un tube épais au lieu d'une simple ligne
                const path = new THREE.LineCurve3(
                    new THREE.Vector3(tempPoint.x, 0.1, tempPoint.z),
                    new THREE.Vector3(mousePosition.x, 0.1, mousePosition.z)
                );
                const tubeGeometry = new THREE.TubeGeometry(path, 1, 0.2, 12, false);
                
                // Créer un matériau avec la couleur appropriée (vert si aligné, rouge sinon)
                const tubeMaterial = new THREE.MeshBasicMaterial({ 
                    color: aligned ? 0x00cc00 : 0xff3333,
                    transparent: true,
                    opacity: 0.7,
                });
                
                const line = new THREE.Mesh(tubeGeometry, tubeMaterial);
                scene.add(line);
                lineRef.current = line;
                
                // Afficher la longueur de la ligne en cours de création
                const length = tempPoint.distanceTo(mousePosition);
                
                // Créer un canvas pour le texte
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (context) {
                    canvas.width = 256;
                    canvas.height = 128;
                    
                    // Fond avec bordure
                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    context.strokeStyle = aligned ? '#00cc00' : '#ff3333';
                    context.lineWidth = 6;
                    context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
                    
                    // Texte avec la couleur appropriée
                    context.fillStyle = aligned ? '#00cc00' : '#ff3333';
                    context.font = 'bold 48px Arial';
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    
                    // Afficher la longueur et l'angle si aligné
                    if (aligned) {
                        const degrees = ((angle * 180 / Math.PI) % 360 + 360) % 360;
                        context.fillText(`${length.toFixed(2)}m - ${Math.round(degrees)}°`, canvas.width / 2, canvas.height / 2);
                    } else {
                        context.fillText(`${length.toFixed(2)}m`, canvas.width / 2, canvas.height / 2);
                    }
                    
                    // Créer une texture et un sprite
                    const texture = new THREE.CanvasTexture(canvas);
                    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
                    const sprite = new THREE.Sprite(spriteMaterial);
                    
                    // Calculer la position du sprite
                    const midPoint = new THREE.Vector3().addVectors(
                        new THREE.Vector3(tempPoint.x, 0.1, tempPoint.z),
                        new THREE.Vector3(mousePosition.x, 0.1, mousePosition.z)
                    ).multiplyScalar(0.5);
                    
                    // Calculer la direction perpendiculaire à la ligne
                    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(0.7);
                    
                    // Position du texte
                    const textPosition = new THREE.Vector3().addVectors(midPoint, perpendicular);
                    
                    sprite.position.set(textPosition.x, 0.2, textPosition.z);
                    sprite.scale.set(2, 1, 1);
                    scene.add(sprite);
                    spriteRef.current = sprite;
                }
            } else {
                // Si le point temporaire n'existe plus, supprimer la ligne et le sprite
                if (lineRef.current) {
                    scene.remove(lineRef.current);
                    if (lineRef.current.geometry) lineRef.current.geometry.dispose();
                    if (lineRef.current.material) {
                        if (Array.isArray(lineRef.current.material)) {
                            lineRef.current.material.forEach((m: THREE.Material) => m.dispose());
                        } else {
                            lineRef.current.material.dispose();
                        }
                    }
                    lineRef.current = null;
                }
                
                if (spriteRef.current) {
                    scene.remove(spriteRef.current);
                    if (spriteRef.current.material) {
                        if (Array.isArray(spriteRef.current.material)) {
                            spriteRef.current.material.forEach((m: THREE.Material) => m.dispose());
                        } else {
                            spriteRef.current.material.dispose();
                        }
                    }
                    spriteRef.current = null;
                }
            }
            
            return () => {
                // Nettoyer la ligne et le sprite lors du démontage
                if (lineRef.current) {
                    scene.remove(lineRef.current);
                    if (lineRef.current.geometry) lineRef.current.geometry.dispose();
                    if (lineRef.current.material) {
                        if (Array.isArray(lineRef.current.material)) {
                            lineRef.current.material.forEach((m: THREE.Material) => m.dispose());
                        } else {
                            lineRef.current.material.dispose();
                        }
                    }
                    lineRef.current = null;
                }
                
                if (spriteRef.current) {
                    scene.remove(spriteRef.current);
                    if (spriteRef.current.material) {
                        if (Array.isArray(spriteRef.current.material)) {
                            spriteRef.current.material.forEach((m: THREE.Material) => m.dispose());
                        } else {
                            spriteRef.current.material.dispose();
                        }
                    }
                    spriteRef.current = null;
                }
            };
        }, [isBlueprintView, tempPoint, mousePosition, scene]);
        
        // Effet pour gérer la prévisualisation du rectangle
        useEffect(() => {
            // Nettoyer les lignes de prévisualisation existantes à chaque rendu
            const cleanupPreviews = () => {
                // Nettoyer les lignes de prévisualisation
                rectanglePreviewLinesRef.current.forEach(line => {
                    scene.remove(line);
                    if (line.geometry) line.geometry.dispose();
                    if (line.material) {
                        if (Array.isArray(line.material)) {
                            line.material.forEach((m: THREE.Material) => m.dispose());
                        } else {
                            line.material.dispose();
                        }
                    }
                });
                rectanglePreviewLinesRef.current = [];
                
                // Nettoyer le sprite
                if (rectanglePreviewSpriteRef.current) {
                    scene.remove(rectanglePreviewSpriteRef.current);
                    if (rectanglePreviewSpriteRef.current.material) {
                        if (Array.isArray(rectanglePreviewSpriteRef.current.material)) {
                            rectanglePreviewSpriteRef.current.material.forEach((m: THREE.Material) => m.dispose());
                        } else {
                            rectanglePreviewSpriteRef.current.material.dispose();
                        }
                    }
                    rectanglePreviewSpriteRef.current = null;
                }
            };

            // Toujours nettoyer les prévisualisations existantes
            cleanupPreviews();
            
            // Si les conditions ne sont pas remplies, ne pas créer de nouvelle prévisualisation
            if (!isBlueprintView || !groundPlane || !rectangleStartPoint || !mousePosition) {
                return;
            }
            
            // Créer les quatre coins du rectangle
            const x1 = rectangleStartPoint.x;
            const z1 = rectangleStartPoint.z;
            const x2 = mousePosition.x;
            const z2 = mousePosition.z;
            
            const corner1 = new THREE.Vector3(x1, 0.1, z1);
            const corner2 = new THREE.Vector3(x2, 0.1, z1);
            const corner3 = new THREE.Vector3(x2, 0.1, z2);
            const corner4 = new THREE.Vector3(x1, 0.1, z2);
            
            // Créer les quatre lignes
            const lines = [
                { start: corner1, end: corner2 },
                { start: corner2, end: corner3 },
                { start: corner3, end: corner4 },
                { start: corner4, end: corner1 }
            ];
            
            // Calculer les dimensions du rectangle
            const width = Math.abs(x2 - x1);
            const length = Math.abs(z2 - z1);
            
            // Créer les lignes de prévisualisation
            lines.forEach(line => {
                const path = new THREE.LineCurve3(
                    new THREE.Vector3(line.start.x, 0.1, line.start.z),
                    new THREE.Vector3(line.end.x, 0.1, line.end.z)
                );
                const tubeGeometry = new THREE.TubeGeometry(path, 1, 0.2, 12, false);
                const tubeMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x4CAF50,
                    transparent: true,
                    opacity: 0.7,
                });
                
                const tubeLine = new THREE.Mesh(tubeGeometry, tubeMaterial);
                scene.add(tubeLine);
                rectanglePreviewLinesRef.current.push(tubeLine);
            });
            
            // Créer un sprite pour afficher les dimensions
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
                canvas.width = 256;
                canvas.height = 128;
                
                // Fond avec bordure
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.strokeStyle = '#4CAF50';
                context.lineWidth = 6;
                context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
                
                // Texte
                context.fillStyle = '#4CAF50';
                context.font = 'bold 36px Arial';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(`${width.toFixed(2)}m × ${length.toFixed(2)}m`, canvas.width / 2, canvas.height / 2);
                
                // Créer une texture et un sprite
                const texture = new THREE.CanvasTexture(canvas);
                const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
                const sprite = new THREE.Sprite(spriteMaterial);
                
                // Position du sprite au centre du rectangle
                const center = new THREE.Vector3(
                    (corner1.x + corner3.x) / 2,
                    0.2,
                    (corner1.z + corner3.z) / 2
                );
                
                sprite.position.copy(center);
                sprite.scale.set(2, 1, 1);
                scene.add(sprite);
                rectanglePreviewSpriteRef.current = sprite;
            }
            
            // Mettre à jour l'état de prévisualisation du rectangle dans le composant parent
            if (updateRectanglePreview) {
                updateRectanglePreview(rectangleStartPoint, mousePosition);
            }
            
            // Nettoyer les prévisualisations lors du démontage du composant
            return cleanupPreviews;
            
        }, [isBlueprintView, rectangleStartPoint, mousePosition, scene, groundPlane, updateRectanglePreview]);
        
        useEffect(() => {
            if (!isBlueprintView || !groundPlane) return;
            
            const handleMouseMove = (e: MouseEvent) => {
                const canvas = e.target as HTMLElement;
                const canvasBounds = canvas.getBoundingClientRect();
                const x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
                const y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;
                
                mouseRef.current.set(x, y);
                raycasterRef.current.setFromCamera(mouseRef.current, camera);
                
                const intersects = raycasterRef.current.intersectObject(groundPlane);
                
                if (intersects.length > 0) {
                    const point = intersects[0].point.clone();
                    point.y = 0.1; // Légèrement au-dessus du sol
                    setMousePosition(point);
                }
            };
            
            const handleClick = (e: MouseEvent) => {
                const canvas = e.target as HTMLElement;
                const canvasBounds = canvas.getBoundingClientRect();
                const x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
                const y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;
                
                mouseRef.current.set(x, y);
                raycasterRef.current.setFromCamera(mouseRef.current, camera);
                
                const intersects = raycasterRef.current.intersectObject(groundPlane);
                
                if (intersects.length > 0) {
                    const point = intersects[0].point.clone();
                    point.y = 0.1; // Légèrement au-dessus du sol
                    
                    console.log("Blueprint click at:", point);
                    
                    if (handleBlueprintClick) {
                        handleBlueprintClick(point);
                    }
                }
            };
            
            const canvas = document.querySelector('canvas');
            if (canvas) {
                canvas.addEventListener('click', handleClick);
                canvas.addEventListener('mousemove', handleMouseMove);
                
                return () => {
                    canvas.removeEventListener('click', handleClick);
                    canvas.removeEventListener('mousemove', handleMouseMove);
                };
            }
            
            return undefined;
        }, [isBlueprintView, groundPlane, camera, scene, handleBlueprintClick]);
        
        return null;
    };

    // Ajouter un composant pour afficher le mode de navigation actuel
    const NavigationModeIndicator = () => {
        if (is2DView || isObjectOnlyView || firstPersonView) return null;
        
        return (
            <div className="navigation-mode-indicator">
                <div>
                    Mode: {navigationMode === 'orbit' ? 'Orbite (rotation autour de la maquette)' : 'Déplacement horizontal'}
                </div>
                <button
                    onClick={() => setNavigationMode(prev => prev === 'orbit' ? 'move' : 'orbit')}
                    className="navigation-mode-button"
                >
                    Changer de mode (N)
                </button>
                <div className="navigation-instructions">
                    {navigationMode === 'orbit' ? (
                        <>
                            <div>• Clic gauche + déplacer: Rotation</div>
                            <div>• Clic droit + déplacer: Pan</div>
                            <div>• Molette: Zoom</div>
                        </>
                    ) : (
                        <>
                            <div>• Clic sur la map: Se déplacer</div>
                            <div>• Échap: Libérer la souris</div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    // Fonction pour gérer le clic sur la scène en mode déplacement
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

    // Animation du déplacement de la caméra
    const animateCameraMovement = useCallback((camera: THREE.Camera) => {
        if (!isMovingToTargetRef.current || !targetPositionRef.current || !cameraPositionRef.current) return;
        
        // Calculer la direction et la distance
        const direction = new THREE.Vector3().subVectors(targetPositionRef.current, cameraPositionRef.current);
        const distance = direction.length();
        
        // Si on est assez proche de la cible, arrêter l'animation
        if (distance < 0.1) {
            isMovingToTargetRef.current = false;
            return;
        }
        
        // Normaliser la direction et définir la vitesse
        direction.normalize();
        const speed = Math.min(distance * 0.05, 0.5); // Vitesse proportionnelle à la distance
        
        // Mettre à jour la position de la caméra
        cameraPositionRef.current.add(direction.multiplyScalar(speed));
        
        // Appliquer la nouvelle position à la caméra
        camera.position.copy(cameraPositionRef.current);
    }, []);

    // Remplacer FlyControls par un gestionnaire de clic personnalisé
    const MoveControls = () => {
        const { camera, scene, raycaster, pointer, gl } = useThree();
        
        // Stocker la position actuelle de la caméra
        useEffect(() => {
            if (!cameraPositionRef.current) {
                cameraPositionRef.current = camera.position.clone();
            }
        }, [camera]);
        
        // Hook pour mettre à jour la position de la caméra à chaque frame
        useFrame(() => {
            // Stocker la position actuelle de la caméra
            if (!cameraPositionRef.current) {
                cameraPositionRef.current = camera.position.clone();
            } else {
                cameraPositionRef.current.copy(camera.position);
            }
            
            // Animer le déplacement de la caméra si nécessaire
            if (navigationMode === 'move' && !firstPersonView && !is2DView && !isObjectOnlyView) {
                animateCameraMovement(camera);
            }
        });
        
        useEffect(() => {
            // Variables pour le drag and drop
            let isDragging = false;
            let lastMouseX = 0;
            let lastMouseY = 0;
            
            const handleMouseDown = (event: MouseEvent) => {
                if (navigationMode !== 'move' || firstPersonView || is2DView || isObjectOnlyView) return;
                
                isDragging = true;
                lastMouseX = event.clientX;
                lastMouseY = event.clientY;
                
                // Désactiver les contrôles d'orbite pendant le déplacement
                if (orbitControlsRef.current) {
                    orbitControlsRef.current.enabled = false;
                }
                
                // Arrêter tout déplacement automatique en cours
                isMovingToTargetRef.current = false;
            };
            
            const handleMouseMove = (event: MouseEvent) => {
                if (!isDragging || navigationMode !== 'move' || firstPersonView || is2DView || isObjectOnlyView) return;
                
                // Calculer le déplacement de la souris
                const deltaX = event.clientX - lastMouseX;
                const deltaY = event.clientY - lastMouseY;
                
                // Mettre à jour les dernières positions
                lastMouseX = event.clientX;
                lastMouseY = event.clientY;
                
                // Calculer la direction de déplacement dans l'espace 3D
                // On utilise la direction de la caméra pour déterminer le déplacement avant/arrière
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                forward.y = 0; // Garder le déplacement horizontal
                forward.normalize();
                
                // Calculer la direction perpendiculaire pour le déplacement latéral
                const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
                right.y = 0; // Garder le déplacement horizontal
                right.normalize();
                
                // Facteur de vitesse
                const speed = 0.05;
                
                // Appliquer le déplacement dans la direction OPPOSÉE au mouvement de la souris
                // (comme si on "tirait" la carte)
                camera.position.add(forward.multiplyScalar(deltaY * speed));
                camera.position.add(right.multiplyScalar(deltaX * speed));
                
                // Mettre à jour la position de référence
                if (cameraPositionRef.current) {
                    cameraPositionRef.current.copy(camera.position);
                }
            };
            
            const handleMouseUp = () => {
                if (isDragging) {
                    isDragging = false;
                    
                    // Réactiver les contrôles d'orbite
                    if (orbitControlsRef.current) {
                        orbitControlsRef.current.enabled = true;
                        
                        // Important: mettre à jour le target des contrôles d'orbite
                        // pour qu'il soit relatif à la nouvelle position de la caméra
                        if (cameraPositionRef.current) {
                            // Calculer un nouveau point cible devant la caméra
                            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                            const target = cameraPositionRef.current.clone().add(forward.multiplyScalar(10));
                            orbitControlsRef.current.target.copy(target);
                        }
                    }
                }
            };
            
            const handleClick = (event: MouseEvent) => {
                if (navigationMode !== 'move' || firstPersonView || is2DView || isObjectOnlyView || isDragging) return;
                
                // Calculer les coordonnées normalisées de la souris
                pointer.x = (event.clientX / gl.domElement.clientWidth) * 2 - 1;
                pointer.y = -(event.clientY / gl.domElement.clientHeight) * 2 + 1;
                
                // Mettre à jour le raycaster
                raycaster.setFromCamera(pointer, camera);
                
                // Trouver les intersections avec la scène
                const intersects = raycaster.intersectObjects(scene.children, true);
                
                if (intersects.length > 0) {
                    // Trouver la première intersection avec le sol ou un objet
                    const intersection = intersects.find(i => 
                        i.object === groundPlane || 
                        (i.object.userData && i.object.userData.isFloor)
                    );
                    
                    if (intersection) {
                        handleSceneClick(intersection);
                    }
                }
            };
            
            // Ajouter les écouteurs d'événements
            gl.domElement.addEventListener('mousedown', handleMouseDown);
            gl.domElement.addEventListener('mousemove', handleMouseMove);
            gl.domElement.addEventListener('mouseup', handleMouseUp);
            gl.domElement.addEventListener('click', handleClick);
            
            // Ajouter un écouteur pour le cas où la souris sort de la fenêtre
            window.addEventListener('mouseup', handleMouseUp);
            
            // Nettoyer les écouteurs d'événements
            return () => {
                gl.domElement.removeEventListener('mousedown', handleMouseDown);
                gl.domElement.removeEventListener('mousemove', handleMouseMove);
                gl.domElement.removeEventListener('mouseup', handleMouseUp);
                gl.domElement.removeEventListener('click', handleClick);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }, [camera, scene, raycaster, pointer, gl, navigationMode, firstPersonView, is2DView, isObjectOnlyView]);
        
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
            <NavigationModeIndicator />
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
                        <MoveControls />
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
                
                {/* Gestionnaire de clics pour le mode Blueprint */}
                {isBlueprintView && <BlueprintClickHandler />}
            </Canvas>
        </>
    );
};

export default CanvasScene;
