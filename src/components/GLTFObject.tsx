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
                console.log("gltf.scene.scale", scale);
                defaultScaleRef.current = [scale[0], scale[1], scale[2]];
                const clonedScene = gltf.scene.clone();
                
                // Store the first mesh found for texture application
                clonedScene.traverse((child: any) => {
                    if (child.isMesh && !selectedMeshRef.current) {
                        selectedMeshRef.current = child;
                    }
                    
                    // Appliquer la couleur à tous les meshes si elle est définie
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
            const wallGeometry = new THREE.BoxGeometry(scale[0], scale[1], scale[2]);
            const wallColor = color ? new THREE.Color(color) : new THREE.Color(0x808080);
            const wallMaterial = new THREE.MeshStandardMaterial({ 
                color: wallColor,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            console.log("les positions", position);
            console.log("les scale", scale);
            console.log("la couleur", color);
            wallMesh.position.set(...position);
            if(rotation){
                wallMesh.rotation.set(rotation[0], rotation[1], rotation[2]);
            }
            selectedMeshRef.current = wallMesh;
            setScene(wallMesh);
        }
    }, [url, color, scale, position, rotation]);

    const calculatePrice = (scale: [number, number, number]) => {
        // Exemple : Calcul du prix en fonction du volume
        const volume = scale[0] * scale[1] * scale[2];
        const basePricePerUnit = price; // Exemple de base
        return volume * basePricePerUnit;
    };
    useEffect(() => {
        if (meshRef.current && scale) { 
            const mesh = meshRef.current as THREE.Mesh;
    
            if (mesh.geometry) {
                const newGeometry = new THREE.BoxGeometry(scale[0], scale[1], scale[2]);
                newGeometry.translate(0, scale[1] / 2, 0);
                mesh.geometry.dispose();
                mesh.geometry = newGeometry;
                
            } else {
                console.log("defaultScaleRef.current", defaultScaleRef.current);
                console.log("scale", scale);

                const x = 1 + (scale[0] - defaultScaleRef.current[0]);
                const y = 1 + (scale[1] - defaultScaleRef.current[1]);
                const z = 1 + (scale[2] - defaultScaleRef.current[2]);

                mesh.scale.set(x, y, z);
                
                const box = new THREE.Box3().setFromObject(mesh);
                const height = box.max.y - box.min.y;
                mesh.position.y = height / 2;
                
                mesh.updateMatrixWorld(true);
            }
            updateDimensionHelpers();
            price = calculatePrice(scale);
            updateQuotePrice(id, price, scale);
            console.log(`Le prix mis à jour est de ${price} €`);
        }
    }, [scale]); 
    
    
    
    
 
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
            console.log("la rotation est : ",rotation)
            meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
        }
    }, [rotation]);

    useEffect(() => {
        if (scene && texture) {
            console.log("Applying texture:", texture);
            const loadedTexture = new THREE.TextureLoader().load(texture);
            loadedTexture.anisotropy = 16;
            loadedTexture.wrapS = loadedTexture.wrapT = THREE.RepeatWrapping;
            loadedTexture.repeat.set(scale[0], scale[1]);
            
            scene.traverse((child: any) => {
                if (child.isMesh) {
                    // Create a new material if it doesn't exist
                    if (!child.material) {
                        child.material = new THREE.MeshStandardMaterial();
                    }
                    
                    // Sauvegarder la couleur actuelle
                    const currentColor = child.material.color ? child.material.color.clone() : new THREE.Color(color || '#FFFFFF');
                    
                    child.material.map = loadedTexture;
                    child.material.needsUpdate = true;
                    child.material.side = THREE.DoubleSide;
                    child.material.roughness = 0.8;
                    child.material.metalness = 0.2;
                    
                    // Restaurer la couleur après avoir appliqué la texture
                    child.material.color = currentColor;
                    
                    // Appliquer la couleur si elle est définie
                    if (color) {
                        child.material.color = new THREE.Color(color);
                    }
                    
                    if (child.geometry) {
                        child.geometry.computeVertexNormals();
                        child.geometry.computeBoundingSphere();
                    }
                    
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Si c'est un mur (pas d'URL), appliquer directement la texture au mesh
            if (!url && scene instanceof THREE.Mesh && scene.material) {
                // Vérifier si le matériau est un tableau ou un seul matériau
                const material = Array.isArray(scene.material) ? scene.material[0] : scene.material;
                
                // Vérifier si c'est un MeshStandardMaterial
                if (material instanceof THREE.MeshStandardMaterial) {
                    // Sauvegarder la couleur actuelle
                    const currentColor = material.color ? material.color.clone() : new THREE.Color(color || '#FFFFFF');
                    
                    material.map = loadedTexture;
                    material.needsUpdate = true;
                    material.side = THREE.DoubleSide;
                    material.roughness = 0.8;
                    material.metalness = 0.2;
                    
                    // Restaurer la couleur après avoir appliqué la texture
                    material.color = currentColor;
                    
                    // Conserver la couleur d'origine mais avec la texture
                    if (color) {
                        material.color = new THREE.Color(color);
                    }
                }
            }
        }
    }, [scene, texture, scale, url, color]);

    useEffect(() => {
        if (scene && color) {
            console.log("Updating color to:", color);
            scene.traverse((child: any) => {
                if (child.isMesh) {
                    if (child.material) {
                        child.material.color = new THREE.Color(color);
                        child.material.needsUpdate = true;
                    }
                }
            });
        }
    }, [scene, color]);

    useEffect(() => {
        if (scene) {
            // Appliquer un effet visuel pour mettre en évidence l'objet sélectionné
            scene.traverse((child: any) => {
                if (child.isMesh) {
                    if (isSelected) {
                        // Si l'objet est sélectionné, ajouter un effet d'émission
                        if (!child.material.emissive) {
                            // Si le matériau n'a pas de propriété emissive, c'est probablement un MeshBasicMaterial
                            // Convertir en MeshStandardMaterial
                            const oldMaterial = child.material;
                            const newMaterial = new THREE.MeshStandardMaterial({
                                color: oldMaterial.color,
                                map: oldMaterial.map,
                                transparent: oldMaterial.transparent,
                                opacity: oldMaterial.opacity,
                                side: oldMaterial.side
                            });
                            child.material = newMaterial;
                        }
                        
                        // Ajouter un effet d'émission beaucoup plus intense pour mettre en évidence l'objet
                        child.material.emissive = new THREE.Color(0x00ffff); // Couleur cyan brillante
                        child.material.emissiveIntensity = 1.0; // Intensité plus élevée
                        
                        // Augmenter la brillance et réduire la rugosité pour un effet plus brillant
                        child.material.metalness = 0.8;
                        child.material.roughness = 0.1;
                        
                        // Ajouter un léger effet de transparence pour un aspect plus lumineux
                        child.material.transparent = true;
                        child.material.opacity = 0.9;
                        
                        child.material.needsUpdate = true;
                        
                        // Créer un contour lumineux autour de l'objet sélectionné
                        if (!child.userData.outlineMesh) {
                            // Créer une copie légèrement plus grande de la géométrie pour le contour
                            const outlineGeometry = child.geometry.clone();
                            const outlineMaterial = new THREE.MeshBasicMaterial({
                                color: 0x00ffff, // Couleur cyan pour le contour
                                side: THREE.BackSide, // Afficher seulement l'arrière pour créer un contour
                                transparent: true,
                                opacity: 0.7
                            });
                            
                            const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
                            outlineMesh.scale.multiplyScalar(1.05); // Légèrement plus grand que l'objet original
                            outlineMesh.position.copy(child.position);
                            outlineMesh.rotation.copy(child.rotation);
                            outlineMesh.quaternion.copy(child.quaternion);
                            
                            child.parent.add(outlineMesh);
                            child.userData.outlineMesh = outlineMesh;
                        }
                    } else {
                        // Si l'objet n'est pas sélectionné, réinitialiser l'effet d'émission
                        if (child.material.emissive) {
                            child.material.emissive = new THREE.Color(0x000000);
                            child.material.emissiveIntensity = 0;
                            
                            // Restaurer les propriétés du matériau
                            child.material.metalness = 0.2;
                            child.material.roughness = 0.8;
                            
                            // Restaurer l'opacité si elle a été modifiée
                            if (child.material.transparent) {
                                // Si c'est un mur, garder la transparence
                                if (!url) {
                                    child.material.opacity = 0.8;
                                } else {
                                    child.material.transparent = false;
                                    child.material.opacity = 1.0;
                                }
                            }
                            
                            child.material.needsUpdate = true;
                        }
                        
                        // Supprimer le contour s'il existe
                        if (child.userData.outlineMesh) {
                            child.parent.remove(child.userData.outlineMesh);
                            child.userData.outlineMesh = null;
                        }
                    }
                }
            });
        }
    }, [scene, isSelected, url]);

    return (
        scene && (
            <TransformControls
                position={position}
                enabled={isMovable}
                mode="translate"
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
