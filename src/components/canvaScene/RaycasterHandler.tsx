import React, { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';


const RaycasterHandler: React.FC<{
    is2DView: boolean;
    creatingWallMode: boolean;
    groundPlane: THREE.Mesh | null;
    handleAddWall2D: (start: THREE.Vector3, end: THREE.Vector3) => void;
    walls2D: THREE.Line[];
}> = ({ is2DView, creatingWallMode, groundPlane, handleAddWall2D, walls2D }) => {
    const { camera, scene } = useThree();
    const raycaster = useRef(new THREE.Raycaster());
    const mouse = useRef(new THREE.Vector2());
    const [wallStart, setWallStart] = useState<THREE.Vector3 | null>(null);
    const lineHelper = useRef<THREE.Line | null>(null);
    const spheres = useRef<THREE.Mesh[]>([]);

    const isWallAligned = (start: THREE.Vector3, end: THREE.Vector3): boolean => {
        const angle = Math.atan2(end.z - start.z, end.x - start.x) * (180 / Math.PI);
        const tolerance = 0.3; // Tolérance en degrés
        const alignedAngles = [0, 45, 90, 135, 180, -45, -90, -135, -180];
        return alignedAngles.some(targetAngle => 
            Math.abs(angle - targetAngle) < tolerance
        );
    };

    const checkWallIntersection = (start: THREE.Vector3, end: THREE.Vector3): boolean => {
        // Fonction pour vérifier si deux segments se croisent
        const doSegmentsIntersect = (
            p1: THREE.Vector3, p2: THREE.Vector3,
            p3: THREE.Vector3, p4: THREE.Vector3
        ): boolean => {
            const denominator = ((p4.z - p3.z) * (p2.x - p1.x)) - ((p4.x - p3.x) * (p2.z - p1.z));
            if (denominator === 0) return false;

            const ua = (((p4.x - p3.x) * (p1.z - p3.z)) - ((p4.z - p3.z) * (p1.x - p3.x))) / denominator;
            const ub = (((p2.x - p1.x) * (p1.z - p3.z)) - ((p2.z - p1.z) * (p1.x - p3.x))) / denominator;

            return (ua >= 0 && ua <= 1) && (ub >= 0 && ub <= 1);
        };

        return walls2D.some(wall => {
            const geometry = wall.geometry as THREE.BufferGeometry;
            const positions = geometry.getAttribute('position');
            const wallStart = new THREE.Vector3(positions.getX(0), 0, positions.getZ(0));
            const wallEnd = new THREE.Vector3(positions.getX(1), 0, positions.getZ(1));

            return doSegmentsIntersect(start, end, wallStart, wallEnd);
        });
    };

    useEffect(() => {
        if (!is2DView || !creatingWallMode || !groundPlane) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!wallStart) return;

            const canvasBounds = (e.target as HTMLElement).getBoundingClientRect();
            const x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
            const y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

            mouse.current.set(x, y);
            raycaster.current.setFromCamera(mouse.current, camera);

            const intersects = raycaster.current.intersectObject(groundPlane);

            if (intersects.length > 0) {
                const point = intersects[0].point.clone();
                point.y = 0;

                // Vérifier l'alignement et l'intersection
                const isAligned = isWallAligned(wallStart, point);
                const hasIntersection = checkWallIntersection(wallStart, point);
                const lineColor = (isAligned || hasIntersection) ? 0x00ff00 : 0x0000ff;

                if (lineHelper.current) {
                    const points = [
                        new THREE.Vector3(wallStart.x, 1, wallStart.z),
                        new THREE.Vector3(point.x, 1, point.z)
                    ];
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    lineHelper.current.geometry.dispose();
                    lineHelper.current.geometry = geometry;
                    (lineHelper.current.material as THREE.LineBasicMaterial).color.setHex(lineColor);

                    // Calculer la distance et la position de l'étiquette
                    const length = wallStart.distanceTo(point);
                    const direction = new THREE.Vector3().subVectors(point, wallStart);
                    const midPoint = new THREE.Vector3().addVectors(wallStart, point).multiplyScalar(0.5);
                    
                    // Calculer un décalage perpendiculaire pour l'étiquette
                    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(1);
                    const labelPosition = midPoint.clone().add(perpendicular);

                    // Supprimer l'ancienne étiquette si elle existe
                    scene.children = scene.children.filter(child => !child.userData.isDynamicDimensionLabel);

                    // Créer l'étiquette de dimension
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (context) {
                        canvas.width = 100;
                        canvas.height = 40;
                        context.fillStyle = lineColor === 0x00ff00 ? '#4CAF50' : '#2196F3';
                        context.fillRect(0, 0, canvas.width, canvas.height);
                        context.font = 'bold 20px Arial';
                        context.fillStyle = 'white';
                        context.textAlign = 'center';
                        context.textBaseline = 'middle';
                        context.fillText(`${length.toFixed(2)}m`, canvas.width / 2, canvas.height / 2);
                    }

                    const texture = new THREE.CanvasTexture(canvas);
                    const spriteMaterial = new THREE.SpriteMaterial({ 
                        map: texture,
                        depthTest: false,
                        depthWrite: false
                    });
                    const sprite = new THREE.Sprite(spriteMaterial);
                    sprite.position.copy(labelPosition);
                    sprite.position.y = 0.05;
                    sprite.scale.set(1.5, 0.6, 1);
                    sprite.userData.isDynamicDimensionLabel = true;
                    scene.add(sprite);
                } else {
                    const material = new THREE.LineBasicMaterial({ 
                        color: lineColor,
                        linewidth: 3
                    });
                    const points = [wallStart, point];
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.LineSegments(geometry, material);
                    line.computeLineDistances();
                    lineHelper.current = line;
                    scene.add(line);

                    // Ajouter des points plus gros aux extrémités
                    const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
                    const sphereMaterial = new THREE.MeshBasicMaterial({ color: lineColor });
                    
                    const startSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                    startSphere.position.copy(wallStart);
                    line.add(startSphere);

                    const endSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                    endSphere.position.copy(point);
                    line.add(endSphere);

                    // Créer l'étiquette initiale
                    const length = wallStart.distanceTo(point);
                    const direction = new THREE.Vector3().subVectors(point, wallStart);
                    const midPoint = new THREE.Vector3().addVectors(wallStart, point).multiplyScalar(0.5);
                    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(1);
                    const labelPosition = midPoint.clone().add(perpendicular);

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (context) {
                        canvas.width = 100;
                        canvas.height = 40;
                        context.fillStyle = lineColor === 0x00ff00 ? '#4CAF50' : '#2196F3';
                        context.fillRect(0, 0, canvas.width, canvas.height);
                        context.font = 'bold 20px Arial';
                        context.fillStyle = 'white';
                        context.textAlign = 'center';
                        context.textBaseline = 'middle';
                        context.fillText(`${length.toFixed(2)}m`, canvas.width / 2, canvas.height / 2);
                    }

                    const texture = new THREE.CanvasTexture(canvas);
                    const spriteMaterial = new THREE.SpriteMaterial({ 
                        map: texture,
                        depthTest: false,
                        depthWrite: false
                    });
                    const sprite = new THREE.Sprite(spriteMaterial);
                    sprite.position.copy(labelPosition);
                    sprite.position.y = 0.05;
                    sprite.scale.set(1.5, 0.6, 1);
                    sprite.userData.isDynamicDimensionLabel = true;
                    scene.add(sprite);
                }
            }
        };

        const handleMouseClick = (e: MouseEvent) => {
            if (!groundPlane) return;

            const canvasBounds = (e.target as HTMLElement).getBoundingClientRect();
            const x = ((e.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
            const y = -((e.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

            mouse.current.set(x, y);
            raycaster.current.setFromCamera(mouse.current, camera);

            const intersects = raycaster.current.intersectObject(groundPlane);

            if (intersects.length > 0) {
                const point = intersects[0].point.clone();
                point.y = 0;

                // Ajouter une sphère pour marquer le point
                const geometry = new THREE.SphereGeometry(0.1, 16, 16);
                const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                const sphere = new THREE.Mesh(geometry, material);
                sphere.position.copy(point);
                scene.add(sphere);
                spheres.current.push(sphere);

                if (!wallStart) {
                    setWallStart(point);
                } else {
                    const isAligned = isWallAligned(wallStart, point);
                    const hasIntersection = checkWallIntersection(wallStart, point);
                    
                    handleAddWall2D(wallStart, point);

                    setWallStart(null);
                    if (lineHelper.current) {
                        lineHelper.current.geometry.dispose();
                        if (lineHelper.current.material) {
                            if (Array.isArray(lineHelper.current.material)) {
                                lineHelper.current.material.forEach(material => material.dispose());
                            } else {
                                lineHelper.current.material.dispose();
                            }
                        }
                        scene.remove(lineHelper.current);
                        lineHelper.current = null;
                    }
                }
            }
        };

        const canvas = document.querySelector('canvas');
        canvas?.addEventListener('mousemove', handleMouseMove);
        canvas?.addEventListener('click', handleMouseClick);

        return () => {
            canvas?.removeEventListener('mousemove', handleMouseMove);
            canvas?.removeEventListener('click', handleMouseClick);
            // Nettoyer les sphères lors du démontage
            spheres.current.forEach(sphere => {
                sphere.geometry.dispose();
                if (sphere.material instanceof THREE.Material) {
                    sphere.material.dispose();
                }
                scene.remove(sphere);
            });
            spheres.current = [];
        };
    }, [is2DView, creatingWallMode, wallStart, groundPlane, camera, scene, handleAddWall2D, walls2D]);

    return null;
};

export default RaycasterHandler;