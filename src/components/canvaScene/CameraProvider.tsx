import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { ObjectData } from '../../types/ObjectData';
import * as THREE from 'three';

const CameraProvider: React.FC<{ 
    setCamera: (camera: THREE.Camera) => void; 
    is2DView: boolean;
    firstPersonView: boolean;
    firstPersonPosition?: THREE.Vector3;
    firstPersonRotation?: THREE.Euler;
    zoom2D: number;
    isObjectOnlyView?: boolean;
    focusedObject?: ObjectData | null;
    preserveCameraOnModeChange?: boolean;
}> = ({ 
    setCamera, 
    is2DView, 
    firstPersonView, 
    firstPersonPosition, 
    firstPersonRotation, 
    zoom2D, 
    isObjectOnlyView, 
    focusedObject,
    preserveCameraOnModeChange 
}) => {
    const { camera, set } = useThree();
    const lastCameraState = useRef<{
        position: THREE.Vector3;
        rotation: THREE.Euler;
        zoom?: number;
        target?: THREE.Vector3;
    } | null>(null);

    useEffect(() => {
        let newCamera: THREE.Camera;

        // Si on a un état précédent et qu'on veut le préserver
        if (preserveCameraOnModeChange && lastCameraState.current && !is2DView && !firstPersonView && !isObjectOnlyView) {
            const perspectiveCamera = new THREE.PerspectiveCamera(
                50,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );

            perspectiveCamera.position.copy(lastCameraState.current.position);
            perspectiveCamera.rotation.copy(lastCameraState.current.rotation);
            perspectiveCamera.updateProjectionMatrix();
            newCamera = perspectiveCamera;
        } else if (is2DView) {
            // Configuration de la caméra orthographique
            const aspect = window.innerWidth / window.innerHeight;
            const frustumSize = 100;
            
            const orthographicCamera = new THREE.OrthographicCamera(
                -frustumSize * aspect / 2,
                frustumSize * aspect / 2,
                frustumSize / 2,
                -frustumSize / 2,
                -1000,
                1000
            );
            
            orthographicCamera.position.set(0, 100, 0);
            orthographicCamera.up.set(0, 0, -1);
            orthographicCamera.rotation.set(-Math.PI / 2, 0, 0);
            orthographicCamera.zoom = zoom2D / 20;
            
            orthographicCamera.updateMatrix();
            orthographicCamera.updateMatrixWorld();
            orthographicCamera.updateProjectionMatrix();
            
            newCamera = orthographicCamera;
        } else {
            // Configuration de la caméra perspective pour les autres modes
            const perspectiveCamera = new THREE.PerspectiveCamera(
                50,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );

            if (firstPersonView && firstPersonPosition && firstPersonRotation) {
                perspectiveCamera.position.copy(firstPersonPosition);
                perspectiveCamera.rotation.copy(firstPersonRotation);
                perspectiveCamera.fov = 75;
            } else if (isObjectOnlyView && focusedObject) {
                const objectPosition = new THREE.Vector3(...focusedObject.position);
                const objectSize = Math.max(...focusedObject.scale);
                const distance = objectSize * 5;
                
                perspectiveCamera.position.set(
                    objectPosition.x + distance,
                    objectPosition.y + distance * 0.5,
                    objectPosition.z + distance
                );
                
                perspectiveCamera.up.set(0, 1, 0);
                perspectiveCamera.lookAt(objectPosition);
                perspectiveCamera.fov = 30;
            } else {
                perspectiveCamera.position.set(30, 30, 30);
                perspectiveCamera.up.set(0, 1, 0);
                perspectiveCamera.lookAt(0, 0, 0);
                perspectiveCamera.fov = 50;
            }

            perspectiveCamera.updateProjectionMatrix();
            newCamera = perspectiveCamera;
        }

        // Sauvegarder l'état de la caméra actuelle
        if (!is2DView && !firstPersonView && !isObjectOnlyView) {
            lastCameraState.current = {
                position: newCamera.position.clone(),
                rotation: newCamera.rotation.clone(),
                zoom: newCamera instanceof THREE.OrthographicCamera ? newCamera.zoom : undefined
            };
        }

        // Définir la nouvelle caméra comme caméra active
        if (newCamera instanceof THREE.PerspectiveCamera) {
            set(() => ({ camera: Object.assign(newCamera, { manual: true }) }));
        } else if (newCamera instanceof THREE.OrthographicCamera) {
            set(() => ({ camera: Object.assign(newCamera, { manual: true }) }));
        }
        setCamera(newCamera);

    }, [set, is2DView, firstPersonView, firstPersonPosition, firstPersonRotation, zoom2D, isObjectOnlyView, focusedObject, preserveCameraOnModeChange, setCamera]);

    // Gérer le redimensionnement de la fenêtre
    useEffect(() => {
        const handleResize = () => {
            if (camera instanceof THREE.OrthographicCamera && is2DView) {
                const aspect = window.innerWidth / window.innerHeight;
                const frustumSize = 100;
                camera.left = -frustumSize * aspect / 2;
                camera.right = frustumSize * aspect / 2;
                camera.top = frustumSize / 2;
                camera.bottom = -frustumSize / 2;
                camera.updateProjectionMatrix();
            } else if (camera instanceof THREE.PerspectiveCamera) {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [camera, is2DView]);

    return null;
};

export default CameraProvider;