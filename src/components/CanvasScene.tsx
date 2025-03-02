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
}> = ({ setCamera, is2DView, firstPersonView, firstPersonPosition, firstPersonRotation }) => {
    const { camera } = useThree();

    useEffect(() => {
        if (firstPersonView && firstPersonPosition && firstPersonRotation) {
            camera.position.copy(firstPersonPosition);
            camera.rotation.copy(firstPersonRotation);
        } else if (is2DView) {
            camera.position.set(0, 100, 0);
            camera.lookAt(0, 0, 0);
            (camera as THREE.PerspectiveCamera).fov = 10;
        } else {
            camera.position.set(10, 20, 30);
            camera.lookAt(0, 0, 0);
        }
        camera.updateProjectionMatrix();
        setCamera(camera);
    }, [camera, is2DView, firstPersonView, firstPersonPosition, firstPersonRotation, setCamera]);

    return null;
};

const RaycasterHandler: React.FC<{
    is2DView: boolean;
    creatingWallMode: boolean;
    groundPlane: THREE.Mesh | null;
    handleAddWall2D: (start: THREE.Vector3, end: THREE.Vector3) => void;
}> = ({ is2DView, creatingWallMode, groundPlane, handleAddWall2D }) => {
    const { camera, scene } = useThree();
    const raycaster = useRef(new THREE.Raycaster());
    const mouse = useRef(new THREE.Vector2());
    const [wallStart, setWallStart] = useState<THREE.Vector3 | null>(null);
    const lineHelper = useRef<THREE.Line | null>(null);

useEffect(() => {
    const spheres: THREE.Mesh[] = [];  // Tableau pour stocker les sphères

const handleMouseClick = (e: MouseEvent) => {
    if (!is2DView || !creatingWallMode || !groundPlane) return;

    const canvasBounds = (e.target as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
    const y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

    mouse.current.set(x, y);
    raycaster.current.setFromCamera(mouse.current, camera);

    const intersects = raycaster.current.intersectObject(groundPlane);
    if (is2DView && intersects.length > 0) {
        intersects[0].point.y = 0;
    }

    if (intersects.length > 0) {
        const point = intersects[0].point.clone();
        const center = new THREE.Vector3(0, 0, 0);
        const difference = point.clone().sub(center); 
        const geometry3D = new THREE.SphereGeometry(0.05, 8, 8);
        const material3D = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const sphere3D = new THREE.Mesh(geometry3D, material3D);
        sphere3D.position.copy(point); 
        scene.add(sphere3D);

        spheres.push(sphere3D);  // Ajoute la sphère au tableau des sphères

        console.log("Point d'intersection (3D):", point);
        console.log("Différence par rapport au centre:", difference);

        if (!wallStart) {
            console.log("Wall Start Point Set:", point);
            setWallStart(point);
        } else {
            console.log("Creating Wall - From:", wallStart, "To:", point);

            const startPoint = wallStart.clone();
            startPoint.y = 0;
            const endPoint = point.clone();
            endPoint.y = 0; 
            handleAddWall2D(startPoint, endPoint);
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
                if (lineHelper.current.parent) {
                    lineHelper.current.parent.remove(lineHelper.current);
                }
                lineHelper.current = null;
            }
        }
    }
};




    const handleMouseMove = (e: MouseEvent) => {
        if (!is2DView || !creatingWallMode || !wallStart || !groundPlane) return;

        const canvasBounds = (e.target as HTMLElement).getBoundingClientRect();
        const x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
        const y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

        mouse.current.set(x, y);
        raycaster.current.setFromCamera(mouse.current, camera);

        const intersects = raycaster.current.intersectObject(groundPlane);

        if (intersects.length > 0) {
            const point = intersects[0].point.clone();
            point.y = 0; 

            if (lineHelper.current) {
                const points = [wallStart, point];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                lineHelper.current.geometry.dispose();
                lineHelper.current.geometry = geometry;
            } else {
                const material = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 5555 }); // Augmenter la largeur de la ligne
                const points = [wallStart, point];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, material);

                lineHelper.current = line;
                scene.add(line);
            }
        }
    };

    const canvas = document.querySelector('canvas');
    canvas?.addEventListener('click', handleMouseClick);
    canvas?.addEventListener('mousemove', handleMouseMove);

    return () => {
        canvas?.removeEventListener('click', handleMouseClick);
        canvas?.removeEventListener('mousemove', handleMouseMove);
    };
}, [is2DView, creatingWallMode, wallStart, groundPlane, camera]);

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

    const WallDimensions = () => {
        const { scene } = useThree();
        
        useEffect(() => {
            // Supprimer les anciennes étiquettes
            scene.children = scene.children.filter(child => !child.userData.isDimensionLabel);

            if (!is2DView) return;

            // Créer une étiquette de dimension
            const createDimensionLabel = (position: THREE.Vector3, text: string) => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (context) {
                    canvas.width = 200;
                    canvas.height = 40;
                    context.fillStyle = 'white';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    context.font = 'bold 24px Arial';
                    context.fillStyle = 'black';
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(text, canvas.width / 2, canvas.height / 2);
                }

                const texture = new THREE.CanvasTexture(canvas);
                const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
                const sprite = new THREE.Sprite(spriteMaterial);
                sprite.position.copy(position);
                sprite.scale.set(2, 0.4, 1);
                sprite.userData.isDimensionLabel = true;
                return sprite;
            };

            // Ajouter les dimensions pour chaque mur
            objects.forEach(obj => {
                if (obj.details.includes('Mur')) {
                    const length = obj.scale[0];
                    const position = new THREE.Vector3(
                        obj.position[0],
                        obj.position[1],
                        obj.position[2]
                    );

                    // Créer l'étiquette avec la dimension
                    const label = createDimensionLabel(position, `${length.toFixed(2)}m`);
                    scene.add(label);
                }
            });
        }, [scene, objects, is2DView]);

        return null;
    };

    return (
        <>
            {firstPersonView && (
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
                    Échap : libérer la souris
                </div>
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
                />
                {!firstPersonView && (
                    <RaycasterHandler
                        is2DView={is2DView}
                        creatingWallMode={creatingWallMode}
                        groundPlane={groundPlane}
                        handleAddWall2D={handleAddWall2D}
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
                    />
                )}
            </Canvas>
        </>
    );
};

export default CanvasScene;
