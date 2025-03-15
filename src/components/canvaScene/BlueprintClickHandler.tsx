import React, { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface BlueprintClickHandlerProps {
    isBlueprintView: boolean;
    tempPoint?: THREE.Vector3 | null;
    groundPlane: THREE.Object3D | null;
    rectangleStartPoint?: THREE.Vector3 | null;
    handleBlueprintClick?: (point: THREE.Vector3) => void;
    updateRectanglePreview?: (start: THREE.Vector3, end: THREE.Vector3) => void;
    isAngleAligned: (angle: number, tolerance?: number) => boolean;
}

const BlueprintClickHandler: React.FC<BlueprintClickHandlerProps> = ({
    isBlueprintView,
    tempPoint,
    groundPlane,
    rectangleStartPoint,
    handleBlueprintClick,
    updateRectanglePreview,
    isAngleAligned
}) => {
    const { camera, scene } = useThree();
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());
    const [mousePosition, setMousePosition] = useState<THREE.Vector3 | null>(null);
    const lineRef = useRef<THREE.Mesh | null>(null);
    const spriteRef = useRef<THREE.Sprite | null>(null);
    const [isAligned, setIsAligned] = useState(false);
    
    // Références pour les lignes de prévisualisation du rectangle
    const rectanglePreviewLinesRef = useRef<THREE.Mesh[]>([]);
    const rectanglePreviewSpriteRef = useRef<THREE.Sprite | null>(null);
    
    // Créer une ligne en pointillé entre le point temporaire et la position de la souris
    useEffect(() => {
        if (isBlueprintView && tempPoint && mousePosition) {
            // Calculer l'angle entre le point temporaire et la position de la souris
            const direction = new THREE.Vector3().subVectors(
                new THREE.Vector3(mousePosition.x, 0, mousePosition.z),
                new THREE.Vector3(tempPoint.x, 0, tempPoint.z)
            ).normalize();
            const angle = Math.atan2(direction.z, direction.x);
            
            // Vérifier si l'angle est aligné
            const aligned = isAngleAligned(angle);
            setIsAligned(aligned);
            
            // Supprimer l'ancienne ligne si elle existe
            if (lineRef.current) {
                scene.remove(lineRef.current);
                if (lineRef.current.geometry) lineRef.current.geometry.dispose();
                if (lineRef.current.material) {
                    if (Array.isArray(lineRef.current.material)) {
                        lineRef.current.material.forEach((m: THREE.Material) => m.dispose());
                    } else {
                        lineRef.current.material.dispose();
                    }
                }
            }
            
            // Supprimer l'ancien sprite s'il existe
            if (spriteRef.current) {
                scene.remove(spriteRef.current);
                if (spriteRef.current.material) {
                    if (Array.isArray(spriteRef.current.material)) {
                        spriteRef.current.material.forEach((m: THREE.Material) => m.dispose());
                    } else {
                        spriteRef.current.material.dispose();
                    }
                }
            }
            
            // Créer un tube épais au lieu d'une simple ligne
            const path = new THREE.LineCurve3(
                new THREE.Vector3(tempPoint.x, 0.1, tempPoint.z),
                new THREE.Vector3(mousePosition.x, 0.1, mousePosition.z)
            );
            const tubeGeometry = new THREE.TubeGeometry(path, 1, 0.2, 12, false);
            
            // Créer un matériau avec la couleur appropriée (vert si aligné, rouge sinon)
            const tubeMaterial = new THREE.MeshBasicMaterial({ 
                color: aligned ? 0x00cc00 : 0xff3333,
                transparent: true,
                opacity: 0.7,
            });
            
            const line = new THREE.Mesh(tubeGeometry, tubeMaterial);
            scene.add(line);
            lineRef.current = line;
            
            // Afficher la longueur de la ligne en cours de création
            const length = tempPoint.distanceTo(mousePosition);
            
            // Créer un canvas pour le texte
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
                canvas.width = 256;
                canvas.height = 128;
                
                // Fond avec bordure
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.strokeStyle = aligned ? '#00cc00' : '#ff3333';
                context.lineWidth = 6;
                context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
                
                // Texte avec la couleur appropriée
                context.fillStyle = aligned ? '#00cc00' : '#ff3333';
                context.font = 'bold 48px Arial';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                
                // Afficher la longueur et l'angle si aligné
                if (aligned) {
                    const degrees = ((angle * 180 / Math.PI) % 360 + 360) % 360;
                    context.fillText(`${length.toFixed(2)}m - ${Math.round(degrees)}°`, canvas.width / 2, canvas.height / 2);
                } else {
                    context.fillText(`${length.toFixed(2)}m`, canvas.width / 2, canvas.height / 2);
                }
                
                // Créer une texture et un sprite
                const texture = new THREE.CanvasTexture(canvas);
                const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
                const sprite = new THREE.Sprite(spriteMaterial);
                
                // Calculer la position du sprite
                const midPoint = new THREE.Vector3().addVectors(
                    new THREE.Vector3(tempPoint.x, 0.1, tempPoint.z),
                    new THREE.Vector3(mousePosition.x, 0.1, mousePosition.z)
                ).multiplyScalar(0.5);
                
                // Calculer la direction perpendiculaire à la ligne
                const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(0.7);
                
                // Position du texte
                const textPosition = new THREE.Vector3().addVectors(midPoint, perpendicular);
                
                sprite.position.set(textPosition.x, 0.2, textPosition.z);
                sprite.scale.set(2, 1, 1);
                scene.add(sprite);
                spriteRef.current = sprite;
            }
        } else {
            // Si le point temporaire n'existe plus, supprimer la ligne et le sprite
            if (lineRef.current) {
                scene.remove(lineRef.current);
                if (lineRef.current.geometry) lineRef.current.geometry.dispose();
                if (lineRef.current.material) {
                    if (Array.isArray(lineRef.current.material)) {
                        lineRef.current.material.forEach((m: THREE.Material) => m.dispose());
                    } else {
                        lineRef.current.material.dispose();
                    }
                }
                lineRef.current = null;
            }
            
            if (spriteRef.current) {
                scene.remove(spriteRef.current);
                if (spriteRef.current.material) {
                    if (Array.isArray(spriteRef.current.material)) {
                        spriteRef.current.material.forEach((m: THREE.Material) => m.dispose());
                    } else {
                        spriteRef.current.material.dispose();
                    }
                }
                spriteRef.current = null;
            }
        }
        
        return () => {
            // Nettoyer la ligne et le sprite lors du démontage
            if (lineRef.current) {
                scene.remove(lineRef.current);
                if (lineRef.current.geometry) lineRef.current.geometry.dispose();
                if (lineRef.current.material) {
                    if (Array.isArray(lineRef.current.material)) {
                        lineRef.current.material.forEach((m: THREE.Material) => m.dispose());
                    } else {
                        lineRef.current.material.dispose();
                    }
                }
                lineRef.current = null;
            }
            
            if (spriteRef.current) {
                scene.remove(spriteRef.current);
                if (spriteRef.current.material) {
                    if (Array.isArray(spriteRef.current.material)) {
                        spriteRef.current.material.forEach((m: THREE.Material) => m.dispose());
                    } else {
                        spriteRef.current.material.dispose();
                    }
                }
                spriteRef.current = null;
            }
        };
    }, [isBlueprintView, tempPoint, mousePosition, scene]);
    
    // Effet pour gérer la prévisualisation du rectangle
    useEffect(() => {
        // Nettoyer les lignes de prévisualisation existantes à chaque rendu
        const cleanupPreviews = () => {
            // Nettoyer les lignes de prévisualisation
            rectanglePreviewLinesRef.current.forEach(line => {
                scene.remove(line);
                if (line.geometry) line.geometry.dispose();
                if (line.material) {
                    if (Array.isArray(line.material)) {
                        line.material.forEach((m: THREE.Material) => m.dispose());
                    } else {
                        line.material.dispose();
                    }
                }
            });
            rectanglePreviewLinesRef.current = [];
            
            // Nettoyer le sprite
            if (rectanglePreviewSpriteRef.current) {
                scene.remove(rectanglePreviewSpriteRef.current);
                if (rectanglePreviewSpriteRef.current.material) {
                    if (Array.isArray(rectanglePreviewSpriteRef.current.material)) {
                        rectanglePreviewSpriteRef.current.material.forEach((m: THREE.Material) => m.dispose());
                    } else {
                        rectanglePreviewSpriteRef.current.material.dispose();
                    }
                }
                rectanglePreviewSpriteRef.current = null;
            }
        };

        // Toujours nettoyer les prévisualisations existantes
        cleanupPreviews();
        
        // Si les conditions ne sont pas remplies, ne pas créer de nouvelle prévisualisation
        if (!isBlueprintView || !groundPlane || !rectangleStartPoint || !mousePosition) {
            return;
        }
        
        // Créer les quatre coins du rectangle
        const x1 = rectangleStartPoint.x;
        const z1 = rectangleStartPoint.z;
        const x2 = mousePosition.x;
        const z2 = mousePosition.z;
        
        const corner1 = new THREE.Vector3(x1, 0.1, z1);
        const corner2 = new THREE.Vector3(x2, 0.1, z1);
        const corner3 = new THREE.Vector3(x2, 0.1, z2);
        const corner4 = new THREE.Vector3(x1, 0.1, z2);
        
        // Créer les quatre lignes
        const lines = [
            { start: corner1, end: corner2 },
            { start: corner2, end: corner3 },
            { start: corner3, end: corner4 },
            { start: corner4, end: corner1 }
        ];
        
        // Calculer les dimensions du rectangle
        const width = Math.abs(x2 - x1);
        const length = Math.abs(z2 - z1);
        
        // Créer les lignes de prévisualisation
        lines.forEach(line => {
            const path = new THREE.LineCurve3(
                new THREE.Vector3(line.start.x, 0.1, line.start.z),
                new THREE.Vector3(line.end.x, 0.1, line.end.z)
            );
            const tubeGeometry = new THREE.TubeGeometry(path, 1, 0.2, 12, false);
            const tubeMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x4CAF50,
                transparent: true,
                opacity: 0.7,
            });
            
            const tubeLine = new THREE.Mesh(tubeGeometry, tubeMaterial);
            scene.add(tubeLine);
            rectanglePreviewLinesRef.current.push(tubeLine);
        });
        
        // Créer un sprite pour afficher les dimensions
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
            canvas.width = 256;
            canvas.height = 128;
            
            // Fond avec bordure
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.strokeStyle = '#4CAF50';
            context.lineWidth = 6;
            context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
            
            // Texte
            context.fillStyle = '#4CAF50';
            context.font = 'bold 36px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(`${width.toFixed(2)}m × ${length.toFixed(2)}m`, canvas.width / 2, canvas.height / 2);
            
            // Créer une texture et un sprite
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(spriteMaterial);
            
            // Position du sprite au centre du rectangle
            const center = new THREE.Vector3(
                (corner1.x + corner3.x) / 2,
                0.2,
                (corner1.z + corner3.z) / 2
            );
            
            sprite.position.copy(center);
            sprite.scale.set(2, 1, 1);
            scene.add(sprite);
            rectanglePreviewSpriteRef.current = sprite;
        }
        
        // Mettre à jour l'état de prévisualisation du rectangle dans le composant parent
        if (updateRectanglePreview) {
            updateRectanglePreview(rectangleStartPoint, mousePosition);
        }
        
        // Nettoyer les prévisualisations lors du démontage du composant
        return cleanupPreviews;
        
    }, [isBlueprintView, rectangleStartPoint, mousePosition, scene, groundPlane, updateRectanglePreview]);
    
    useEffect(() => {
        if (!isBlueprintView || !groundPlane) return;
        
        const handleMouseMove = (e: MouseEvent) => {
            const canvas = e.target as HTMLElement;
            const canvasBounds = canvas.getBoundingClientRect();
            const x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
            const y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;
            
            mouseRef.current.set(x, y);
            raycasterRef.current.setFromCamera(mouseRef.current, camera);
            
            const intersects = raycasterRef.current.intersectObject(groundPlane);
            
            if (intersects.length > 0) {
                const point = intersects[0].point.clone();
                point.y = 0.1; // Légèrement au-dessus du sol
                setMousePosition(point);
            }
        };
        
        const handleClick = (e: MouseEvent) => {
            const canvas = e.target as HTMLElement;
            const canvasBounds = canvas.getBoundingClientRect();
            const x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
            const y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;
            
            mouseRef.current.set(x, y);
            raycasterRef.current.setFromCamera(mouseRef.current, camera);
            
            const intersects = raycasterRef.current.intersectObject(groundPlane);
            
            if (intersects.length > 0) {
                const point = intersects[0].point.clone();
                point.y = 0.1; // Légèrement au-dessus du sol
                
                console.log("Blueprint click at:", point);
                
                if (handleBlueprintClick) {
                    handleBlueprintClick(point);
                }
            }
        };
        
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('click', handleClick);
            canvas.addEventListener('mousemove', handleMouseMove);
            
            return () => {
                canvas.removeEventListener('click', handleClick);
                canvas.removeEventListener('mousemove', handleMouseMove);
            };
        }
        
        return undefined;
    }, [isBlueprintView, groundPlane, camera, scene, handleBlueprintClick]);
    
    return null;
};

export default BlueprintClickHandler;