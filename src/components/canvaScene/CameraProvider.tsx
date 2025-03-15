import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
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

export default CameraProvider;