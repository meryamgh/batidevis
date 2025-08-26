import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { BACKEND_URL } from '../config/env';

interface CharacterProps {
    isEnabled: boolean;
    onPositionUpdate?: (position: THREE.Vector3, rotation: THREE.Euler) => void;
    onRotationUpdate?: (handler: (direction: 'up' | 'down' | 'left' | 'right') => void) => void;
}

const Character: React.FC<CharacterProps> = ({ isEnabled, onPositionUpdate, onRotationUpdate }) => {
    const characterRef = useRef<THREE.Group>(null);
    const rotationRef = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0));
    const moveDirection = useRef<{ forward: boolean; backward: boolean; left: boolean; right: boolean }>({
        forward: false,
        backward: false,
        left: false,
        right: false
    });
    const isMousePressed = useRef(false);
    const speed = 0.1;
    const characterHeight = 1.7; // Hauteur moyenne d'une personne
    const mouseSensitivityX = 0.0015; // Sensibilité horizontale réduite
    const mouseSensitivityY = 0.001; // Sensibilité verticale encore plus réduite
    const rotationSpeed = 0.2;
    const { camera } = useThree();
    
    // Load the GLTF model
    const { scene: characterModel } = useGLTF('/gltf/character.gltf');
    
    // Référence pour le lissage des mouvements de caméra
    const targetRotation = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0));
    const smoothingFactor = 0.1; // Facteur de lissage (0-1), plus petit = plus lisse

    const handleRotation = (direction: 'up' | 'down' | 'left' | 'right') => {
        switch (direction) {
            case 'up':
                targetRotation.current.x = Math.max(-Math.PI / 3, targetRotation.current.x - rotationSpeed);
                break;
            case 'down':
                targetRotation.current.x = Math.min(Math.PI / 3, targetRotation.current.x + rotationSpeed);
                break;
            case 'left':
                targetRotation.current.y += rotationSpeed;
                break;
            case 'right':
                targetRotation.current.y -= rotationSpeed;
                break;
        }
    };

    useEffect(() => {
        if (onRotationUpdate) {
            onRotationUpdate(handleRotation);
        }
    }, [onRotationUpdate]);

    useEffect(() => {
        if (!isEnabled) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (isMousePressed.current) {
                targetRotation.current.y -= e.movementX * mouseSensitivityX;
                
                if (Math.abs(e.movementY) > 1) {
                    targetRotation.current.x = Math.max(
                        -Math.PI / 3,
                        Math.min(Math.PI / 3, targetRotation.current.x + e.movementY * mouseSensitivityY)
                    );
                }
            }
        };

        const handleMouseDown = () => {
            isMousePressed.current = true;
        };

        const handleMouseUp = () => {
            isMousePressed.current = false;
        };

        const handleWheel = (e: WheelEvent) => {
            if (!isEnabled) return;
            const perspCamera = camera as THREE.PerspectiveCamera;
            perspCamera.fov = Math.max(30, Math.min(90, perspCamera.fov + e.deltaY * 0.05));
            perspCamera.updateProjectionMatrix();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('wheel', handleWheel);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('wheel', handleWheel);
        };
    }, [isEnabled, camera]);

    useEffect(() => {
        if (!isEnabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key.toLowerCase()) {
                case 'z':
                case 'arrowup':
                    moveDirection.current.forward = true;
                    break;
                case 's':
                case 'arrowdown':
                    moveDirection.current.backward = true;
                    break;
                case 'q':
                case 'arrowleft':
                    moveDirection.current.left = true;
                    break;
                case 'd':
                case 'arrowright':
                    moveDirection.current.right = true;
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.key.toLowerCase()) {
                case 'z':
                case 'arrowup':
                    moveDirection.current.forward = false;
                    break;
                case 's':
                case 'arrowdown':
                    moveDirection.current.backward = false;
                    break;
                case 'q':
                case 'arrowleft':
                    moveDirection.current.left = false;
                    break;
                case 'd':
                case 'arrowright':
                    moveDirection.current.right = false;
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isEnabled]);

    useFrame(() => {
        if (!isEnabled || !characterRef.current) return;

        // Appliquer le lissage à la rotation
        rotationRef.current.x += (targetRotation.current.x - rotationRef.current.x) * smoothingFactor;
        rotationRef.current.y += (targetRotation.current.y - rotationRef.current.y) * smoothingFactor;

        const movement = new THREE.Vector3();
        const direction = new THREE.Vector3();
        const horizontalRotation = new THREE.Euler(0, rotationRef.current.y, 0);

        if (moveDirection.current.forward) direction.z -= 1;
        if (moveDirection.current.backward) direction.z += 1;
        if (moveDirection.current.left) direction.x -= 1;
        if (moveDirection.current.right) direction.x += 1;

        direction.normalize();
        direction.applyEuler(horizontalRotation);
        movement.copy(direction.multiplyScalar(speed));

        characterRef.current.position.add(movement);

        // Mettre à jour la position et la rotation de la caméra
        if (isEnabled) {
            const newPosition = characterRef.current.position.clone();
            newPosition.y = characterHeight;
            camera.position.copy(newPosition);
            
            // Appliquer la rotation à la caméra
            camera.rotation.x = rotationRef.current.x;
            camera.rotation.y = rotationRef.current.y;
            camera.rotation.z = 0;
            camera.updateProjectionMatrix();
        }

        if (onPositionUpdate) {
            onPositionUpdate(camera.position.clone(), camera.rotation.clone());
        }
    });

    return (
        <group ref={characterRef} position={[0, 0, 0]} rotation={[0, rotationRef.current.y, 0]}>
            {/* Corps du personnage (invisible en mode première personne) */}
            {!isEnabled && (
                <primitive 
                    object={characterModel.clone()} 
                    scale={[0.5, 0.5, 0.5]}
                    position={[0, 1, 0]}
                />
            )}
        </group>
    );
};

export default Character; 