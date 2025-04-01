import React, { useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three'; 
interface MoveControlsProps {
  cameraPositionRef: React.MutableRefObject<THREE.Vector3 | null>;
  orbitControlsRef: React.MutableRefObject<any>;
  isMovingToTargetRef: React.MutableRefObject<boolean>;
  navigationMode: string;
  firstPersonView: boolean;
  is2DView: boolean;
  isObjectOnlyView?: boolean;
  groundPlane: THREE.Object3D | null; 
  handleSceneClick: (intersection: THREE.Intersection) => void;
}

const MoveControls: React.FC<MoveControlsProps> = ({
  cameraPositionRef,
  orbitControlsRef,
  isMovingToTargetRef,
  navigationMode,
  firstPersonView,
  is2DView,
  isObjectOnlyView,
  groundPlane, 
  handleSceneClick
}) => {
    const { camera, scene, raycaster, pointer, gl } = useThree();
    
    // Stocker la position actuelle de la caméra
    useEffect(() => {
        if (!cameraPositionRef.current) {
            cameraPositionRef.current = camera.position.clone();
        }
    }, [camera]);
    
    // Hook pour mettre à jour la position de la caméra à chaque frame
    useFrame(() => {
        // Stocker la position actuelle de la caméra
        if (!cameraPositionRef.current) {
            cameraPositionRef.current = camera.position.clone();
        } else {
            cameraPositionRef.current.copy(camera.position);
        }
         
    });
    
    // Gestionnaire pour les contrôles de la télécommande virtuelle
    useEffect(() => {
        const handleCameraControl = (event: Event) => {
            console.log('handleCameraControl appelé dans MoveControls');
            const customEvent = event as CustomEvent;
            const { direction, mode } = customEvent.detail;
            
            // Facteur de vitesse pour les déplacements
            const moveSpeed = 1.0;
            const rotateSpeed = 0.1;
            const zoomSpeed = 1.0;
            
            // Calculer les directions de déplacement
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            forward.y = 0; // Garder le déplacement horizontal
            forward.normalize();
            
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            right.y = 0; // Garder le déplacement horizontal
            right.normalize();
             
            
            switch (direction) {
                case 'forward':
                    // Déplacement vers l'avant - toujours un déplacement horizontal
                    camera.position.add(forward.multiplyScalar(moveSpeed));
                    if (orbitControlsRef.current) {
                        // Mettre à jour la cible des contrôles d'orbite pour qu'elle reste devant la caméra
                        orbitControlsRef.current.target.add(forward.clone().multiplyScalar(moveSpeed));
                        orbitControlsRef.current.update();
                    }
                    break;
                case 'backward':
                    // Déplacement vers l'arrière - toujours un déplacement horizontal
                    camera.position.sub(forward.multiplyScalar(moveSpeed));
                    if (orbitControlsRef.current) {
                        // Mettre à jour la cible des contrôles d'orbite pour qu'elle reste devant la caméra
                        orbitControlsRef.current.target.sub(forward.clone().multiplyScalar(moveSpeed));
                        orbitControlsRef.current.update();
                    }
                    break;
                case 'left':
                    // Déplacement vers la gauche - toujours un déplacement horizontal
                    camera.position.sub(right.multiplyScalar(moveSpeed));
                    if (orbitControlsRef.current) {
                        // Mettre à jour la cible des contrôles d'orbite pour qu'elle reste alignée avec la caméra
                        orbitControlsRef.current.target.sub(right.clone().multiplyScalar(moveSpeed));
                        orbitControlsRef.current.update();
                    }
                    break;
                case 'right':
                    // Déplacement vers la droite - toujours un déplacement horizontal
                    camera.position.add(right.multiplyScalar(moveSpeed));
                    if (orbitControlsRef.current) {
                        // Mettre à jour la cible des contrôles d'orbite pour qu'elle reste alignée avec la caméra
                        orbitControlsRef.current.target.add(right.clone().multiplyScalar(moveSpeed));
                        orbitControlsRef.current.update();
                    }
                    break;
                case 'zoomOut':
                    // Zoom avant
                    if (orbitControlsRef.current) {
                        // Vérifier si la méthode dollyIn existe
                        if (typeof orbitControlsRef.current.dollyIn === 'function') {
                            orbitControlsRef.current.dollyIn(1 + zoomSpeed * 0.1);
                            orbitControlsRef.current.update();
                        } else {
                            // Méthode alternative de zoom
                            const zoomTarget = orbitControlsRef.current.target;
                            const zoomDirection = new THREE.Vector3().subVectors(camera.position, zoomTarget).normalize();
                            camera.position.sub(zoomDirection.multiplyScalar(zoomSpeed));
                        }
                    } else {
                        // Si pas d'OrbitControls, simplement avancer la caméra
                        camera.position.add(forward.multiplyScalar(zoomSpeed));
                    }
                    break;
                case 'zoomIn':
                    // Zoom arrière
                    if (orbitControlsRef.current) {
                        // Vérifier si la méthode dollyOut existe
                        if (typeof orbitControlsRef.current.dollyOut === 'function') {
                            orbitControlsRef.current.dollyOut(1 + zoomSpeed * 0.1);
                            orbitControlsRef.current.update();
                        } else {
                            // Méthode alternative de zoom
                            const zoomTarget = orbitControlsRef.current.target;
                            const zoomDirection = new THREE.Vector3().subVectors(camera.position, zoomTarget).normalize();
                            camera.position.add(zoomDirection.multiplyScalar(zoomSpeed));
                        }
                    } else {
                        // Si pas d'OrbitControls, simplement reculer la caméra
                        camera.position.sub(forward.multiplyScalar(zoomSpeed));
                    }
                    break;
                case 'rotateLeft':
                    // Rotation horizontale vers la gauche
                    if (orbitControlsRef.current) {
                        // Vérifier si la méthode rotateLeft existe
                        if (typeof orbitControlsRef.current.rotateLeft === 'function') {
                            orbitControlsRef.current.rotateLeft(rotateSpeed);
                            orbitControlsRef.current.update();
                        } else {
                            // Méthode alternative de rotation
                            const currentAzimuth = orbitControlsRef.current.getAzimuthalAngle ? 
                                orbitControlsRef.current.getAzimuthalAngle() : 0;
                            orbitControlsRef.current.setAzimuthalAngle?.(currentAzimuth + rotateSpeed);
                            orbitControlsRef.current.update();
                        }
                    } else {
                        // En mode déplacement, tourner la caméra sur place
                        const rotationMatrix = new THREE.Matrix4().makeRotationY(rotateSpeed);
                        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                        cameraDirection.applyMatrix4(rotationMatrix);
                        camera.lookAt(camera.position.clone().add(cameraDirection));
                    }
                    break;
                case 'rotateRight':
                    // Rotation horizontale vers la droite
                    if (orbitControlsRef.current) {
                        // Vérifier si la méthode rotateRight existe
                        if (typeof orbitControlsRef.current.rotateRight === 'function') {
                            orbitControlsRef.current.rotateRight(rotateSpeed);
                            orbitControlsRef.current.update();
                        } else {
                            // Méthode alternative de rotation
                            const currentAzimuth = orbitControlsRef.current.getAzimuthalAngle ? 
                                orbitControlsRef.current.getAzimuthalAngle() : 0;
                            orbitControlsRef.current.setAzimuthalAngle?.(currentAzimuth - rotateSpeed);
                            orbitControlsRef.current.update();
                        }
                    } else {
                        // En mode déplacement, tourner la caméra sur place
                        const rotationMatrix = new THREE.Matrix4().makeRotationY(-rotateSpeed);
                        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                        cameraDirection.applyMatrix4(rotationMatrix);
                        camera.lookAt(camera.position.clone().add(cameraDirection));
                    }
                    break;
                case 'rotateUp':
                    // Rotation verticale vers le haut
                    if (orbitControlsRef.current) {
                        // Méthode pour la rotation verticale
                        if (typeof orbitControlsRef.current.rotateUp === 'function') {
                            orbitControlsRef.current.rotateUp(rotateSpeed);
                            orbitControlsRef.current.update();
                        } else {
                            // Méthode alternative utilisant l'angle polaire
                            const currentPolar = orbitControlsRef.current.getPolarAngle ? 
                                orbitControlsRef.current.getPolarAngle() : Math.PI / 2;
                            // Limiter l'angle pour éviter de dépasser les limites
                            const newPolar = Math.max(0.1, currentPolar - rotateSpeed);
                            orbitControlsRef.current.setPolarAngle?.(newPolar);
                            orbitControlsRef.current.update();
                        }
                    } else { 
                        const axis = new THREE.Vector3().crossVectors(camera.up, forward).normalize();
                        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(axis, rotateSpeed);
                        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                        cameraDirection.applyMatrix4(rotationMatrix);
                        camera.lookAt(camera.position.clone().add(cameraDirection));
                    }
                    break;
                case 'rotateDown':
                    // Rotation verticale vers le bas
                    if (orbitControlsRef.current) {
                        // Méthode pour la rotation verticale
                        if (typeof orbitControlsRef.current.rotateUp === 'function') {
                            orbitControlsRef.current.rotateUp(-rotateSpeed);
                            orbitControlsRef.current.update();
                        } else {
                            // Méthode alternative utilisant l'angle polaire
                            const currentPolar = orbitControlsRef.current.getPolarAngle ? 
                                orbitControlsRef.current.getPolarAngle() : Math.PI / 2;
                            // Limiter l'angle pour éviter de dépasser les limites
                            const newPolar = Math.min(Math.PI - 0.1, currentPolar + rotateSpeed);
                            orbitControlsRef.current.setPolarAngle?.(newPolar);
                            orbitControlsRef.current.update();
                        }
                    } else { 
                        const axis = new THREE.Vector3().crossVectors(camera.up, forward).normalize();
                        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(axis, -rotateSpeed);
                        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                        cameraDirection.applyMatrix4(rotationMatrix);
                        camera.lookAt(camera.position.clone().add(cameraDirection));
                    }
                    break;
            }
            
            // Mettre à jour la position de référence
            if (cameraPositionRef.current) {
                cameraPositionRef.current.copy(camera.position);
            }
            
            // Si nous sommes en mode orbit, mettre à jour le target
            if (mode === 'orbit' && orbitControlsRef.current) {
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                const target = camera.position.clone().add(forward.multiplyScalar(10));
                orbitControlsRef.current.target.copy(target);
                orbitControlsRef.current.update();
            }
        };
        
        console.log("Ajout de l'écouteur d'événements cameraControl dans MoveControls");
         
        // Supprimer d'abord tout écouteur existant pour éviter les doublons
        window.removeEventListener('cameraControl', handleCameraControl);
        
        // Ajouter l'écouteur d'événements
        window.addEventListener('cameraControl', handleCameraControl);
        
        // Nettoyer l'écouteur d'événements
        return () => {
            console.log("Suppression de l'écouteur d'événements cameraControl dans MoveControls");
            window.removeEventListener('cameraControl', handleCameraControl);
        };
    }, [camera, orbitControlsRef, cameraPositionRef]);
    
    useEffect(() => {
        // Variables pour le drag and drop
        let isDragging = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        
        const handleMouseDown = (event: MouseEvent) => {
            if (navigationMode !== 'move' || firstPersonView || is2DView || isObjectOnlyView) return;
            
            isDragging = true;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            
            // Désactiver les contrôles d'orbite pendant le déplacement
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enabled = false;
            }
            
            // Arrêter tout déplacement automatique en cours
            isMovingToTargetRef.current = false;
        };
        
        const handleMouseMove = (event: MouseEvent) => {
            if (!isDragging || navigationMode !== 'move' || firstPersonView || is2DView || isObjectOnlyView) return;
            
            // Calculer le déplacement de la souris
            const deltaX = event.clientX - lastMouseX;
            const deltaY = event.clientY - lastMouseY;
            
            // Mettre à jour les dernières positions
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            
            // Calculer la direction de déplacement dans l'espace 3D
            // On utilise la direction de la caméra pour déterminer le déplacement avant/arrière
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            forward.y = 0; // Garder le déplacement horizontal
            forward.normalize();
            
            // Calculer la direction perpendiculaire pour le déplacement latéral
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            right.y = 0; // Garder le déplacement horizontal
            right.normalize();
            
            // Facteur de vitesse
            const speed = 0.05;
            
            // Appliquer le déplacement dans la direction OPPOSÉE au mouvement de la souris
            // (comme si on "tirait" la carte)
            camera.position.add(forward.multiplyScalar(deltaY * speed));
            camera.position.add(right.multiplyScalar(-deltaX * speed));
            
            // Mettre à jour la position de référence
            if (cameraPositionRef.current) {
                cameraPositionRef.current.copy(camera.position);
            }
        };
        
        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                
                // Réactiver les contrôles d'orbite
                if (orbitControlsRef.current) {
                    orbitControlsRef.current.enabled = true;
                    
                    // Important: mettre à jour le target des contrôles d'orbite
                    // pour qu'il soit relatif à la nouvelle position de la caméra
                    if (cameraPositionRef.current) {
                        // Calculer un nouveau point cible devant la caméra
                        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                        const target = cameraPositionRef.current.clone().add(forward.multiplyScalar(10));
                        orbitControlsRef.current.target.copy(target);
                    }
                }
            }
        };
        
        const handleClick = (event: MouseEvent) => {
            if (navigationMode !== 'move' || firstPersonView || is2DView || isObjectOnlyView || isDragging) return;
            
            // Calculer les coordonnées normalisées de la souris
            pointer.x = (event.clientX / gl.domElement.clientWidth) * 2 - 1;
            pointer.y = -(event.clientY / gl.domElement.clientHeight) * 2 + 1;
            
            // Mettre à jour le raycaster
            raycaster.setFromCamera(pointer, camera);
            
            // Trouver les intersections avec la scène
            const intersects = raycaster.intersectObjects(scene.children, true);
            
            if (intersects.length > 0) {
                // Trouver la première intersection avec le sol ou un objet
                const intersection = intersects.find(i => 
                    i.object === groundPlane || 
                    (i.object.userData && i.object.userData.isFloor)
                );
                
                if (intersection) {
                    handleSceneClick(intersection);
                }
            }
        };
        
        // Ajouter les écouteurs d'événements
        gl.domElement.addEventListener('mousedown', handleMouseDown);
        gl.domElement.addEventListener('mousemove', handleMouseMove);
        gl.domElement.addEventListener('mouseup', handleMouseUp);
        gl.domElement.addEventListener('click', handleClick);
        
        // Ajouter un écouteur pour le cas où la souris sort de la fenêtre
        window.addEventListener('mouseup', handleMouseUp);
        
        // Nettoyer les écouteurs d'événements
        return () => {
            gl.domElement.removeEventListener('mousedown', handleMouseDown);
            gl.domElement.removeEventListener('mousemove', handleMouseMove);
            gl.domElement.removeEventListener('mouseup', handleMouseUp);
            gl.domElement.removeEventListener('click', handleClick);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [camera, scene, raycaster, pointer, gl, navigationMode, firstPersonView, is2DView, isObjectOnlyView]);
    
    return null;
};


export default MoveControls;