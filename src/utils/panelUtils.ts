import * as THREE from 'three';
import { ObjectData } from '../types/ObjectData';
import React from 'react';

/**
 * Starts dragging the panel
 * @param e - The mouse event
 */
export const startDraggingPanel = (e: React.MouseEvent): void => {
  const panel = e.currentTarget as HTMLElement;
  if (!panel) return;

  // Store initial mouse position
  const initialX = e.clientX;
  const initialY = e.clientY;
  
  // Store initial panel position
  const initialLeft = panel.offsetLeft;
  const initialTop = panel.offsetTop;

  // Function to handle mouse movement during drag
  const handleDrag = (moveEvent: MouseEvent): void => {
    const deltaX = moveEvent.clientX - initialX;
    const deltaY = moveEvent.clientY - initialY;
    
    // Update panel position
    panel.style.left = `${initialLeft + deltaX}px`;
    panel.style.top = `${initialTop + deltaY}px`;
  };

  // Function to stop dragging
  const stopDragging = (): void => {
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDragging);
  };

  // Add event listeners for dragging
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDragging);
};

/**
 * Closes the panel
 */
export const closePanel = (): void => {
  const panel = document.getElementById('floating-panel');
  if (panel) {
    panel.style.display = 'none';
  }
};

/**
 * Handles mouse movement for object manipulation
 * @param e - The mouse event
 * @param objectId - The ID of the object being moved
 * @param mouse - Reference to the mouse position
 * @param raycaster - Reference to the raycaster
 * @param objects - Array of objects in the scene
 * @param setObjects - Function to update objects
 * @param camera - The camera
 */
export const handleMouseMove = (
  e: MouseEvent, 
  objectId: string, 
  mouse: React.MutableRefObject<THREE.Vector2>, 
  raycaster: React.MutableRefObject<THREE.Raycaster>, 
  objects: ObjectData[], 
  setObjects: React.Dispatch<React.SetStateAction<ObjectData[]>>, 
  camera: THREE.Camera
): void => {
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  const rect = (e.target as HTMLElement).getBoundingClientRect();
  mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  // Update the raycaster with the mouse position and camera
  raycaster.current.setFromCamera(mouse.current, camera);

  // Find intersections with the ground plane
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersection = new THREE.Vector3();
  raycaster.current.ray.intersectPlane(groundPlane, intersection);

  // Update the position of the selected object
  if (objectId) {
    setObjects((prevObjects) =>
      prevObjects.map((obj) => {
        if (obj.id === objectId) {
          // Keep the original y position of the object
          const originalY = obj.position[1];
          return {
            ...obj,
            position: [intersection.x, originalY, intersection.z] as [number, number, number],
          };
        }
        return obj;
      })
    );
  }
}; 