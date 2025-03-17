import React, { useEffect, useRef, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Mesh } from "three";

type GLTFObjectProps = {
    id: string;
    url: string;
    position: [number, number, number];
    scale: [number, number, number];
    rotation?: [number, number, number];
    onUpdatePosition: (id: string, position: [number, number, number]) => void;
    isMovable: boolean;
    gltf?: GLTF | Mesh;
    onClick: () => void;
    texture: string;
    price: number;
    updateQuotePrice: (id:string, price: number, scale : [number, number, number]) => void;
    showDimensions: boolean; 
    color?: string;
    isSelected?: boolean;
};

const GLTFObject: React.FC<GLTFObjectProps> = ({
    id,
    url,
    position,
    scale,
    rotation,
    onUpdatePosition,
    isMovable,
    onClick,
    texture,
    price,
    updateQuotePrice,
    showDimensions,
    color,
    isSelected = false,
}) => {
    const meshRef = useRef<THREE.Group | THREE.Mesh>(null);
    const [scene, setScene] = useState<THREE.Group | THREE.Mesh | null>(null);
    const arrowWidthRef = useRef<THREE.Group | null>(null);
    const arrowHeightRef = useRef<THREE.Group | null>(null);
    const arrowDepthRef = useRef<THREE.Group | null>(null);
    const defaultScaleRef = useRef([1, 1, 1]);
    const selectedMeshRef = useRef<THREE.Mesh | null>(null);

    const createTextSprite = (text: string) => {
        console.log("createTextSprite")
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (context) {
            context.font = 'Bold 30px Arial';
            context.fillStyle = 'rgba(255, 255, 255, 1.0)';
            context.fillText(text, 0, 50);
        }

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2, 1, 1);  
        return sprite;
    };
    
    useEffect(() => {
        if (url !== '') {
            const loader = new GLTFLoader();
            loader.load(url, (gltf) => {
                const clonedScene = gltf.scene.clone();
                
                // Calculer l'échelle initiale en fonction de la taille du modèle
                const box = new THREE.Box3().setFromObject(clonedScene);
                const size = new THREE.Vector3();
                box.getSize(size);
                
                // Stocker la taille originale pour les calculs d'échelle futurs
                defaultScaleRef.current = [size.x, size.y, size.z];
                
                // Calculer les facteurs d'échelle
                const scaleX = scale[0] / size.x;
                const scaleY = scale[1] / size.y;
                const scaleZ = scale[2] / size.z;
                
                // Appliquer l'échelle
                clonedScene.scale.set(scaleX, scaleY, scaleZ);
                
                // Appliquer la rotation initiale si elle existe
                if (rotation) {
                    clonedScene.rotation.set(rotation[0], rotation[1], rotation[2]);
                }
                
                // Store the first mesh found for texture application
                clonedScene.traverse((child: any) => {
                    if (child.isMesh && !selectedMeshRef.current) {
                        selectedMeshRef.current = child;
                    }
                    
                    // Appliquer la couleur uniquement si une nouvelle couleur est spécifiée
                    if (child.isMesh && color) {
                        if (!child.material) {
                            child.material = new THREE.MeshStandardMaterial();
                        }
                        child.material.color = new THREE.Color(color);
                        child.material.needsUpdate = true;
                    }
                });
                
                setScene(clonedScene);
            });
        } else {
            // Détecter si c'est un sol (rotation X = -PI/2)
            const isFloor = rotation && rotation[0] === -Math.PI / 2;
            
            let geometry;
            if (isFloor) {
                // Pour le sol, utiliser PlaneGeometry avec les dimensions réelles
                geometry = new THREE.PlaneGeometry(scale[0], scale[2]);
            } else {
                // Pour les murs, utiliser BoxGeometry
                geometry = new THREE.BoxGeometry(1, 1, 1);
            }

            const wallColor = color ? new THREE.Color(color) : new THREE.Color(0x808080);
            const wallMaterial = new THREE.MeshStandardMaterial({ 
                color: wallColor,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
                dithering: true,
                toneMapped: true
            });
            
            const wallMesh = new THREE.Mesh(geometry, wallMaterial);
            if (!isFloor) {
                wallMesh.scale.set(scale[0], scale[1], scale[2]);
            }
            wallMesh.position.set(...position);
            if(rotation){
                wallMesh.rotation.set(rotation[0], rotation[1], rotation[2]);
            }
            selectedMeshRef.current = wallMesh;
            setScene(wallMesh);
        }
    }, [url, color, position, rotation]);

    const calculatePrice = (scale: [number, number, number]) => {
        // Exemple : Calcul du prix en fonction du volume
        const volume = scale[0] * scale[1] * scale[2];
        const basePricePerUnit = price; // Exemple de base
        return volume * basePricePerUnit;
    };
    useEffect(() => {
        if (meshRef.current && scale && defaultScaleRef.current) {
            if (url !== '') {
                // Pour les modèles GLTF, calculer l'échelle relative
                const scaleX = scale[0] / defaultScaleRef.current[0];
                const scaleY = scale[1] / defaultScaleRef.current[1];
                const scaleZ = scale[2] / defaultScaleRef.current[2];
                meshRef.current.scale.set(scaleX, scaleY, scaleZ);
            } else {
                // Pour les murs et autres objets simples, appliquer l'échelle directement
                meshRef.current.scale.set(scale[0], scale[1], scale[2]);
            }
            
            meshRef.current.updateMatrixWorld(true);
            
            // Mettre à jour les dimensions et le prix
            updateDimensionHelpers();
            const newPrice = calculatePrice(scale);
            updateQuotePrice(id, newPrice, scale);
        }
    }, [scale, id, updateQuotePrice, url]);
    
    
    
    
 
    const updateDimensionHelpers = () => {
        if (scene && meshRef.current) { 
            if (arrowWidthRef.current) {
                scene.remove(arrowWidthRef.current);
                arrowWidthRef.current = null;
            }
            if (arrowHeightRef.current) {
                scene.remove(arrowHeightRef.current);
                arrowHeightRef.current = null;
            }
            if (arrowDepthRef.current) {
                scene.remove(arrowDepthRef.current);
                arrowDepthRef.current = null;
            }

            if (showDimensions) {
                const box = new THREE.Box3().setFromObject(meshRef.current);
                const size = new THREE.Vector3();
                box.getSize(size);
                console.log(size);
                const arrowWidthGroup = new THREE.Group();
                const arrowHelperWidth = new THREE.ArrowHelper(
                    new THREE.Vector3(1, 0, 0), 
                    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
                    size.x,
                    0xff0000
                );
                arrowWidthGroup.add(arrowHelperWidth);

                const widthLabel = createTextSprite(`${size.x.toFixed(2)} m`);
                widthLabel.position.set(
                    box.min.x + size.x / 2,
                    box.min.y,
                    box.min.z
                );
                arrowWidthGroup.add(widthLabel);

                scene.add(arrowWidthGroup);
                arrowWidthRef.current = arrowWidthGroup;

                // Flèche pour la hauteur (Y)
                const arrowHeightGroup = new THREE.Group();
                const arrowHelperHeight = new THREE.ArrowHelper(
                    new THREE.Vector3(0, 1, 0), 
                    new THREE.Vector3(box.min.x, box.min.y, box.min.z), 
                    size.y,
                    0x00ff00
                );
                arrowHeightGroup.add(arrowHelperHeight);

                const heightLabel = createTextSprite(`${size.y.toFixed(2)} m`);
                heightLabel.position.set(
                    box.min.x,
                    box.min.y + size.y / 2,
                    box.min.z
                );
                arrowHeightGroup.add(heightLabel);

                scene.add(arrowHeightGroup);
                arrowHeightRef.current = arrowHeightGroup;
 
                const arrowDepthGroup = new THREE.Group();
                const arrowHelperDepth = new THREE.ArrowHelper(
                    new THREE.Vector3(0, 0, 1),  
                    new THREE.Vector3(box.min.x, box.min.y, box.min.z),  
                    size.z,
                    0x0000ff 
                );
                arrowDepthGroup.add(arrowHelperDepth);

                const depthLabel = createTextSprite(`${size.z.toFixed(2)} m`);
                depthLabel.position.set(
                    box.min.x,
                    box.min.y,
                    box.min.z + size.z / 2
                );
                arrowDepthGroup.add(depthLabel);

                scene.add(arrowDepthGroup);
                arrowDepthRef.current = arrowDepthGroup;
            }
        }
    };

    useEffect(() => {
        if (scene && meshRef.current) {
            updateDimensionHelpers();
        }
    }, [showDimensions]);

    useEffect(() => {
        if (meshRef.current && rotation) {
            // Appliquer la rotation directement à l'objet
            meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
            
            // Mettre à jour la matrice mondiale pour s'assurer que la rotation est appliquée
            meshRef.current.updateMatrixWorld(true);
            
            // Mettre à jour les helpers de dimension si nécessaire
            if (showDimensions) {
                updateDimensionHelpers();
            }
        }
    }, [rotation, showDimensions]);

    useEffect(() => {
        if (scene && texture) {
            const loadedTexture = new THREE.TextureLoader().load(texture);
            loadedTexture.anisotropy = 16;
            loadedTexture.wrapS = loadedTexture.wrapT = THREE.RepeatWrapping;
            
            // Détecter si c'est un sol en vérifiant si c'est un PlaneGeometry
            let isFloor = false;
            scene.traverse((child: any) => {
                if (child.isMesh && child.geometry instanceof THREE.PlaneGeometry) {
                    isFloor = true;
                }
            });
            
            if (isFloor) {
                // Pour le sol, utiliser une répétition fixe
                loadedTexture.repeat.set(1, 1);
                loadedTexture.offset.set(0, 0);
                loadedTexture.rotation = 0;
                loadedTexture.flipY = true;
            } else {
                // Pour les autres objets, utiliser l'échelle
                loadedTexture.repeat.set(scale[0] / 2, scale[1] / 2);
            }
            
            loadedTexture.colorSpace = 'srgb';
            loadedTexture.minFilter = THREE.LinearFilter;
            loadedTexture.magFilter = THREE.LinearFilter;
            loadedTexture.generateMipmaps = true;
            
            scene.traverse((child: any) => {
                if (child.isMesh && child.material) {
                    // Créer un nouveau matériau pour la texture
                    const newMaterial = new THREE.MeshStandardMaterial({
                        map: loadedTexture,
                        side: THREE.DoubleSide,
                        transparent: true,
                        metalness: 0,
                        roughness: 1,
                        dithering: true,
                        toneMapped: true
                    });
                    
                    child.material = newMaterial;
                    child.material.needsUpdate = true;
                }
            });
        } 
    }, [scene, texture, scale, color]);

    useEffect(() => {
        if (scene && color && !texture) {  // Ajouter la condition !texture
            scene.traverse((child: any) => {
                if (child.isMesh && child.material) {
                    if (color !== '') {
                        child.material.color = new THREE.Color(color);
                        child.material.needsUpdate = true;
                    }
                }
            });
        }
    }, [scene, color, texture]);  // Ajouter texture comme dépendance

    useEffect(() => {
        if (scene) {
            const meshes: THREE.Mesh[] = [];
            scene.traverse((child: any) => {
                if (child.isMesh) {
                    meshes.push(child);
                    
                    // S'assurer que le matériau est du bon type pour les transformations
                    if (!(child.material instanceof THREE.MeshStandardMaterial)) {
                        const oldMaterial = child.material;
                        const newMaterial = new THREE.MeshStandardMaterial({
                            color: oldMaterial.color ? oldMaterial.color.clone() : new THREE.Color(0xffffff),
                            map: oldMaterial.map,
                            transparent: oldMaterial.transparent,
                            opacity: oldMaterial.opacity,
                            side: oldMaterial.side
                        });
                        
                        // Copier d'autres propriétés si elles existent
                        if (oldMaterial.roughness !== undefined) newMaterial.roughness = oldMaterial.roughness;
                        if (oldMaterial.metalness !== undefined) newMaterial.metalness = oldMaterial.metalness;
                        
                        child.material = newMaterial;
                        child.material.needsUpdate = true;
                    }

                    // Supprimer les effets visuels de sélection s'ils existent
                    if (child.userData.outlineMesh) {
                        child.parent.remove(child.userData.outlineMesh);
                        child.userData.outlineMesh = null;
                    }

                    // Ajouter l'effet de contour si l'objet est sélectionné
                    if (isSelected) {
                        const geometry = child.geometry;
                        const edges = new THREE.EdgesGeometry(geometry);
                        const outlineMaterial = new THREE.LineDashedMaterial({
                            color: 0x000000,
                            dashSize: 0.3,
                            gapSize: 0.1,
                            linewidth: 3,
                            scale: 1,
                            transparent: true,
                            opacity: 1
                        });
                        const outlineMesh = new THREE.LineSegments(edges, outlineMaterial);
                        outlineMesh.computeLineDistances();
                        
                        // Créer un groupe pour le contour
                        const outlineGroup = new THREE.Group();
                        outlineGroup.add(outlineMesh);
                        
                        // Appliquer une légère augmentation d'échelle pour décaler le contour
                        const scaleFactor = 1.02; // 2% plus grand
                        outlineGroup.scale.set(
                            child.scale.x * scaleFactor,
                            child.scale.y * scaleFactor,
                            child.scale.z * scaleFactor
                        );
                        
                        outlineGroup.position.copy(child.position);
                        outlineGroup.rotation.copy(child.rotation);
                        
                        child.parent.add(outlineGroup);
                        child.userData.outlineMesh = outlineGroup;
                    }
                }
            });

            // Nettoyage lors du démontage
            return () => {
                meshes.forEach((mesh) => {
                    if (mesh) {
                        if (mesh.userData.outlineMesh && mesh.parent) {
                            mesh.parent.remove(mesh.userData.outlineMesh);
                            mesh.userData.outlineMesh = null;
                        }
                    }
                });
            };
        }
    }, [scene, isSelected, url]);

    // Modifier le useEffect pour la mise à jour du contour
    useEffect(() => {
        if (scene && isSelected) {
            scene.traverse((child: any) => {
                if (child.isMesh && child.userData.outlineMesh) {
                    const outlineGroup = child.userData.outlineMesh;
                    const scaleFactor = 1.06; // 2% plus grand
                    
                    // Mettre à jour l'échelle avec le facteur d'augmentation
                    outlineGroup.scale.set(
                        child.scale.x * scaleFactor,
                        child.scale.y * scaleFactor,
                        child.scale.z * scaleFactor
                    );
                    
                    outlineGroup.position.copy(child.position);
                    outlineGroup.rotation.copy(child.rotation);
                    
                    // Mettre à jour les distances des lignes en pointillés
                    outlineGroup.children.forEach((outlineMesh: any) => {
                        if (outlineMesh instanceof THREE.LineSegments) {
                            outlineMesh.computeLineDistances();
                        }
                    });
                }
            });
        }
    }, [scene, isSelected, scale, position, rotation]);

    return (
        scene && (
            <TransformControls
                position={position}
                enabled={isMovable}
                mode="translate"
                showX={false}
                showY={false}
                showZ={false}
                onObjectChange={() => {
                    if (meshRef.current) {
                        const newPos: [number, number, number] = [
                            meshRef.current.position.x,
                            meshRef.current.position.y,
                            meshRef.current.position.z,
                        ];
                        onUpdatePosition(id, newPos);
                    }
                }}
            >
                <primitive
                    object={scene}
                    position={position}
                    ref={meshRef}
                    onClick={(event: any) => {
                        event.stopPropagation();
                        console.log('Objet cliqué:', {
                            id: id,
                            type: url ? 'Modèle 3D' : 'Mur',
                            details: {
                                position: position,
                                scale: scale,
                                rotation: rotation || [0, 0, 0],
                                mesh: event.object,
                                material: event.object.material,
                                geometry: event.object.geometry,
                                color: color
                            }
                        });
                        onClick();
                    }}
                />
            </TransformControls>
        )
    );
};

export default GLTFObject;
