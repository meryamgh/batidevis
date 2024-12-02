import React from 'react';
import * as THREE from 'three';

export const startDraggingPanel = (e: React.MouseEvent) => {
    const panel = document.getElementById('floating-panel');
    if (!panel) return;

    const offsetX = e.clientX - panel.getBoundingClientRect().left;
    const offsetY = e.clientY - panel.getBoundingClientRect().top;

    const handleMouseMove = (moveEvent: MouseEvent) => {
        panel.style.left = `${moveEvent.clientX - offsetX}px`;
        panel.style.top = `${moveEvent.clientY - offsetY}px`;
    };

    const stopDragging = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopDragging);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDragging);
};

export const closePanel = () => {
    const panel = document.getElementById('floating-panel');
    if (panel) {
        panel.style.display = 'none';
    }
};

export const handleMouseMove = (
    e: MouseEvent,
    isMoving: string | null,
    mouse: React.MutableRefObject<THREE.Vector2>,
    raycaster: React.MutableRefObject<THREE.Raycaster>,
    objects: any[],
    setObjects: React.Dispatch<React.SetStateAction<any[]>>,
    camera: THREE.Camera,
) => {
    if (isMoving === null) return;

    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;

    const bounds = canvasElement.getBoundingClientRect();
    mouse.current.x = ((e.clientX - bounds.left) / bounds.width) * 2 - 1;
    mouse.current.y = -((e.clientY - bounds.top) / bounds.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(plane, intersectPoint);

    const updatedObjects = objects.map((obj) => {
        if (obj.id === isMoving) {
            return {
                ...obj,
                position: [intersectPoint.x, intersectPoint.y, intersectPoint.z],
            };
        }
        return obj;
    });
    setObjects(updatedObjects);
};
