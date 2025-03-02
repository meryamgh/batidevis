import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface CharacterProps {
    isEnabled: boolean;
    onPositionUpdate?: (position: THREE.Vector3, rotation: THREE.Euler) => void;
}

const Character: React.FC<CharacterProps> = ({ isEnabled, onPositionUpdate }) => {
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
    const mouseSensitivity = 0.002;

    useEffect(() => {
        if (!isEnabled) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (isMousePressed.current) {
                rotationRef.current.y -= e.movementX * mouseSensitivity;
                rotationRef.current.x = Math.max(
                    -Math.PI / 3,
                    Math.min(Math.PI / 3, rotationRef.current.x - e.movementY * mouseSensitivity)
                );
            }
        };

        const handleMouseDown = () => {
            isMousePressed.current = true;
        };

        const handleMouseUp = () => {
            isMousePressed.current = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isEnabled]);

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

        if (onPositionUpdate) {
            const newPosition = characterRef.current.position.clone();
            newPosition.y = characterHeight;
            onPositionUpdate(newPosition, rotationRef.current);
        }
    });

    return (
        <group ref={characterRef} position={[0, 0, 0]} rotation={[0, rotationRef.current.y, 0]}>
            {/* Corps du personnage */}
            <mesh position={[0, characterHeight / 2, 0]}>
                <capsuleGeometry args={[0.2, 1.3, 8, 16]} />
                <meshStandardMaterial color="#4287f5" />
            </mesh>
            {/* Tête du personnage */}
            <mesh position={[0, characterHeight - 0.15, 0]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial color="#ffd700" />
            </mesh>
        </group>
    );
};

export default Character; 