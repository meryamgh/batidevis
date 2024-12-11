// import React, { useEffect } from 'react';
// import { Canvas, useThree } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei';
// import GLTFObject from './GLTFObject';
// import { ObjectData } from '../types/ObjectData';
// import * as THREE from 'three';

// type CanvasSceneProps = {
//     objects: ObjectData[];
//     onClick: (id: string) => void;
//     onUpdatePosition: (id: string, position: [number, number, number]) => void;
//     isMoving: string | null;
//     setIsMoving: (id: string | null) => void;
//     orbitControlsRef: React.RefObject<any>;
//     setCamera: (camera: THREE.Camera) => void;
//     updateQuotePrice: (id:string, price: number) => void;
//     showDimensions: { [key: string]: boolean };
//     is2DView: boolean;
//     walls2D: THREE.Line[];  
//     groundPlane: THREE.Mesh | null;
// };

// const CameraProvider: React.FC<{ setCamera: (camera: THREE.Camera) => void; is2DView: boolean }> = ({ setCamera, is2DView }) => {
//     const { camera } = useThree();

//     useEffect(() => {
//         if (is2DView) {
//             camera.position.set(0, 100, 0); 
//             camera.lookAt(0, 0, 0); 
//             (camera as THREE.PerspectiveCamera).fov = 10; 
//             camera.updateProjectionMatrix();
//         } else {
//             camera.position.set(10, 20, 30); 
//             camera.lookAt(0, 0, 0);
//             camera.updateProjectionMatrix();
//         }
//         setCamera(camera);
//     }, [camera, is2DView, setCamera]);

//     return null;
// };


// // Composant de la scène
// const CanvasScene: React.FC<CanvasSceneProps> = ({
//     objects,
//     onClick,
//     onUpdatePosition,
//     isMoving,
//     setIsMoving,
//     orbitControlsRef,
//     setCamera,
//     updateQuotePrice,
//     showDimensions,
//     is2DView,
//     walls2D,
//     groundPlane,
// }) => {
//     return (
//         <Canvas onClick={() => setIsMoving(null)}>
//             <CameraProvider setCamera={setCamera} is2DView={is2DView} />
//             <ambientLight intensity={2.0} />
//             <directionalLight position={[10, 20, 15]} intensity={3.0} />
//             <directionalLight position={[-10, -20, -15]} intensity={3.0} />
//             <pointLight position={[0, 10, 10]} intensity={2.5} />
//             <pointLight position={[10, -10, 10]} intensity={2.5} />
//             <hemisphereLight groundColor={'#b9b9b9'} intensity={2.0} />
//             <OrbitControls ref={orbitControlsRef} enabled={!is2DView} />
//             {groundPlane && (
//                 <primitive object={groundPlane} />
//             )}
//             {!is2DView && (
//                 <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
//                     <planeGeometry args={[50, 50]} />
//                     <meshStandardMaterial color="lightgray" />
//                 </mesh>
//             )}
//             {objects.map((obj) => (
//                 <GLTFObject
//                     key={obj.id}
//                     id={obj.id}
//                     url={obj.url}
//                     scale={obj.scale}
//                     position={obj.position}
//                     gltf = {obj.gltf}
//                     texture={obj.texture}
//                     price={obj.price}
//                     updateQuotePrice={updateQuotePrice}
//                     details={obj.details}
//                     rotation={obj.rotation}
//                     onUpdatePosition={onUpdatePosition}
//                     isMovable={isMoving === obj.id}
//                     onClick={() => onClick(obj.id)}
//                     showDimensions={!!showDimensions[obj.id]}
//                 />
//             ))}

//             {is2DView && walls2D.map((line, index) => (
//                 <primitive key={index} object={line} />
//             ))}
//         </Canvas>
//     );
// };

// export default CanvasScene;

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import GLTFObject from './GLTFObject';
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
    updateQuotePrice: (id: string, price: number) => void;
    showDimensions: { [key: string]: boolean };
    is2DView: boolean;
    walls2D: THREE.Line[];
    groundPlane: THREE.Mesh | null;
    handleAddWall2D: (start: THREE.Vector3, end: THREE.Vector3) => void;
    creatingWallMode: boolean;
};
const CameraProvider: React.FC<{ setCamera: (camera: THREE.Camera) => void; is2DView: boolean }> = ({ setCamera, is2DView }) => {
    const { camera } = useThree(); // Maintenant dans le contexte correct

    useEffect(() => {
        if (is2DView) {
            camera.position.set(0, 100, 0);
            camera.lookAt(0, 0, 0);
            (camera as THREE.PerspectiveCamera).fov = 10;
            camera.updateProjectionMatrix();
        } else {
            camera.position.set(10, 20, 30);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
        }
        setCamera(camera);
    }, [camera, is2DView, setCamera]);

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
        const handleMouseClick = (e: MouseEvent) => {
            if (!is2DView || !creatingWallMode || !groundPlane) return;

            const canvasBounds = (e.target as HTMLElement).getBoundingClientRect();
            const x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
            const y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

            mouse.current.set(x, y);
            raycaster.current.setFromCamera(mouse.current, camera);

            const intersects = raycaster.current.intersectObject(groundPlane);

            if (intersects.length > 0) {
                const point = intersects[0].point.clone();
                if (!wallStart) {
                    console.log("Wall Start Point Set:", point);
                    setWallStart(point);
                } else {
                    console.log("Creating Wall - From:", wallStart, "To:", point);
                    handleAddWall2D(wallStart, point);
                    setWallStart(null);

                    if (lineHelper.current) {
                        lineHelper.current.geometry.dispose();
                        lineHelper.current = null;
                    }
                    // if (lineHelper.current) {
                    //     scene.remove(lineHelper.current);
                    //     if (lineHelper.current.geometry) {
                    //         lineHelper.current.geometry.dispose();
                    //     }
                    //     lineHelper.current = null;
                    // }
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
                    const material = new THREE.LineBasicMaterial({ color: 0x0000ff });
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
    return (
        <Canvas onClick={() => setIsMoving(null)}>
            <CameraProvider setCamera={setCamera} is2DView={is2DView} />
            <RaycasterHandler
                is2DView={is2DView}
                creatingWallMode={creatingWallMode}
                groundPlane={groundPlane}
                handleAddWall2D={handleAddWall2D}
            />
            <ambientLight intensity={2.0} />
            <directionalLight position={[10, 20, 15]} intensity={3.0} />
            <directionalLight position={[-10, -20, -15]} intensity={3.0} />
            <pointLight position={[0, 10, 10]} intensity={2.5} />
            <pointLight position={[10, -10, 10]} intensity={2.5} />
            <hemisphereLight groundColor={'#b9b9b9'} intensity={2.0} />
            <OrbitControls ref={orbitControlsRef} enabled={!is2DView} />

            {groundPlane && <primitive object={groundPlane} />}

            {!is2DView && (
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
                    texture={obj.texture}
                    price={obj.price}
                    updateQuotePrice={updateQuotePrice}
                    details={obj.details}
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
        </Canvas>
    );
};

export default CanvasScene;
