import React, { useEffect } from 'react';
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
    showDimensions: { [key: string]: boolean };
    is2DView: boolean;
    walls2D: THREE.Line[];  
    groundPlane: THREE.Mesh | null;
};

const CameraProvider: React.FC<{ setCamera: (camera: THREE.Camera) => void; is2DView: boolean }> = ({ setCamera, is2DView }) => {
    const { camera } = useThree();

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


// Composant de la scène
const CanvasScene: React.FC<CanvasSceneProps> = ({
    objects,
    onClick,
    onUpdatePosition,
    isMoving,
    setIsMoving,
    orbitControlsRef,
    setCamera,
    showDimensions,
    is2DView,
    walls2D,
    groundPlane,
}) => {
    return (
        <Canvas onClick={() => setIsMoving(null)}>
            <CameraProvider setCamera={setCamera} is2DView={is2DView} />
            <ambientLight intensity={2.0} />
            <directionalLight position={[10, 20, 15]} intensity={3.0} />
            <directionalLight position={[-10, -20, -15]} intensity={3.0} />
            <pointLight position={[0, 10, 10]} intensity={2.5} />
            <pointLight position={[10, -10, 10]} intensity={2.5} />
            <hemisphereLight groundColor={'#b9b9b9'} intensity={2.0} />
            <OrbitControls ref={orbitControlsRef} enabled={!is2DView} />
            {groundPlane && (
                <primitive object={groundPlane} />
            )}
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
                    gltf = {obj.gltf}
                    texture={obj.texture}
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
