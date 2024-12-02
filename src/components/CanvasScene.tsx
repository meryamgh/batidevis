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
    walls2D: THREE.Line[];  // Ajout des murs 2D à la liste des propriétés
    groundPlane: THREE.Mesh | null;
};

// Composant pour gérer la caméra (2D et 3D)
const CameraProvider: React.FC<{ setCamera: (camera: THREE.Camera) => void; is2DView: boolean }> = ({ setCamera, is2DView }) => {
    const { camera } = useThree();

    useEffect(() => {
        if (is2DView) {
            // CHANGEMENT: Définir la vue de la caméra pour la vue 2D
            camera.position.set(0, 100, 0); // Vue de dessus pour une vue 2D
            camera.lookAt(0, 0, 0); // Pointe vers le centre de la scène
            (camera as THREE.PerspectiveCamera).fov = 10; // Ajuster cela pour zoomer/dézoomer
            camera.updateProjectionMatrix();
        } else {
            // CHANGEMENT: Revenir à la vue 3D standard
            camera.position.set(10, 20, 30); // Position standard pour la vue 3D
            camera.lookAt(0, 0, 0); // Pointe vers le centre de la scène
            camera.updateProjectionMatrix();
        }
        setCamera(camera); // Mettre à jour la caméra globale
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
            {/* CHANGEMENT: Utilisation de CameraProvider pour gérer la vue 2D ou 3D */}
            <CameraProvider setCamera={setCamera} is2DView={is2DView} />

            {/* Lumières de la scène */}
            <ambientLight intensity={2.0} />
            <directionalLight position={[10, 20, 15]} intensity={3.0} />
            <directionalLight position={[-10, -20, -15]} intensity={3.0} />
            <pointLight position={[0, 10, 10]} intensity={2.5} />
            <pointLight position={[10, -10, 10]} intensity={2.5} />
            <hemisphereLight groundColor={'#b9b9b9'} intensity={2.0} />

            {/* CHANGEMENT: OrbitControls désactivés en mode 2D */}
            <OrbitControls ref={orbitControlsRef} enabled={!is2DView} />

            {/* Plan du sol pour la détection des clics */}
            {groundPlane && (
                <primitive object={groundPlane} />
            )}

            {/* Plan du sol (uniquement en 3D pour éviter l'encombrement en 2D) */}
            {!is2DView && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
                    <planeGeometry args={[50, 50]} />
                    <meshStandardMaterial color="lightgray" />
                </mesh>
            )}

            {/* Rendu des objets 3D (GLTF) */}
            {objects.map((obj) => (
                <GLTFObject
                    key={obj.id}
                    id={obj.id}
                    url={obj.url}
                    scale={obj.scale}
                    position={obj.position}
                    texture={obj.texture}
                    rotation={obj.rotation}
                    onUpdatePosition={onUpdatePosition}
                    isMovable={isMoving === obj.id}
                    onClick={() => onClick(obj.id)}
                    showDimensions={!!showDimensions[obj.id]}
                />
            ))}

            {/* CHANGEMENT: Rendu des murs 2D (uniquement en vue 2D) */}
            {is2DView && walls2D.map((line, index) => (
                <primitive key={index} object={line} />
            ))}
        </Canvas>
    );
};

export default CanvasScene;
