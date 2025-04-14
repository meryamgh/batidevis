import React, { useEffect, useRef, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Mesh } from "three";
import { FacesData } from '../types/ObjectData';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

// Mapping des faces pour les murs
const faceIndexMapping = {
    right: 0,  // +X
    left: 1,   // -X
    top: 2,    // +Y
    bottom: 3, // -Y
    front: 4,  // +Z
    back: 5    // -Z
} as const;

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
    faces?: FacesData;
    type?: 'wall' | 'floor' | 'object';
    onUpdateFaces: (id: string, faces: FacesData) => void;
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
    color,
    faces,
    type,
}) => {
    const meshRef = useRef<THREE.Group | THREE.Mesh>(null);
    const [scene, setScene] = useState<THREE.Group | THREE.Mesh | null>(null);
    const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null);
    
     
    const defaultScaleRef = useRef([1, 1, 1]);
    const selectedMeshRef = useRef<THREE.Mesh | null>(null);
   
    useEffect(() => {
        if (url !== '') {
            const loader = new GLTFLoader();
    // 1. Configuration du DRACOLoader
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/') // Le dossier dans "public"
    dracoLoader.setDecoderConfig({ type: 'js' }) // ou 'wasm' si tu préfères
    loader.setDRACOLoader(dracoLoader)
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

            const initialMaterial = new THREE.MeshStandardMaterial({ 
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            
            const mesh = new THREE.Mesh(geometry, initialMaterial);
            if (!isFloor) {
                mesh.scale.set(scale[0], scale[1], scale[2]);
            }
            mesh.position.set(...position);
            if(rotation){
                mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
            }
            selectedMeshRef.current = mesh;
            setScene(mesh);
        }
    }, [url, position, rotation, scale]);

    const calculatePrice = (scale: [number, number, number]) => {
        // Exemple : Calcul du prix en fonction du volume
        const volume = scale[0] * scale[1] * scale[2];
        const basePricePerUnit = price; // Exemple de base
        return Math.round(volume * basePricePerUnit);
    };

    useEffect(() => {
        if (meshRef.current && scale) {
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

            // Mettre à jour le prix si nécessaire
            const newPrice = calculatePrice(scale);
            updateQuotePrice(id, newPrice, scale);
        }
    }, [scale, id, updateQuotePrice, url]);

    useEffect(() => {
        if (meshRef.current && rotation) {
            meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
            meshRef.current.updateMatrixWorld(true);
        }
    }, [rotation]);

    useEffect(() => {
        console.log('=== Début de l\'effet texture/faces ===');
        console.log('Props reçues:', {
            type,
            texture,
            faces,
            color,
            scale,
            id
        });

        if (scene && (texture || faces)) {
            console.log('Scene et texture/faces présentes, début du traitement');
            
            const loadTexture = async (textureUrl: string) => {
                console.log('Chargement de la texture:', textureUrl);
                return new Promise<THREE.Texture>((resolve, reject) => {
                    new THREE.TextureLoader().load(
                        textureUrl,
                        (loadedTexture) => {
                            console.log('Texture chargée avec succès:', textureUrl);
                            loadedTexture.anisotropy = 16;
                            loadedTexture.wrapS = loadedTexture.wrapT = THREE.RepeatWrapping;

                            if (type === 'floor' || !type) { // !type pour les surfaces
                                // Pour les sols et surfaces, utiliser les dimensions x et z
                                loadedTexture.repeat.set(scale[0], scale[2]);
                            } else  {
                                // Pour les murs, utiliser les dimensions x et y
                loadedTexture.repeat.set(scale[0] / 2, scale[1] / 2);
                            }
            
            loadedTexture.colorSpace = 'srgb';
            loadedTexture.minFilter = THREE.LinearFilter;
            loadedTexture.magFilter = THREE.LinearFilter;
            loadedTexture.generateMipmaps = true;
                            resolve(loadedTexture);
                        },
                        undefined,
                        (error) => {
                            console.error('Erreur lors du chargement de la texture:', error);
                            reject(error);
                        }
                    );
                });
            };
            
            scene.traverse(async (child: any) => {
                if (child.isMesh && child.material) {
                    console.log('Traitement du mesh:', {
                        geometry: child.geometry.type,
                        type: type,
                        materialType: Array.isArray(child.material) ? 'Array' : 'Single'
                    });

                    if (child.geometry instanceof THREE.BoxGeometry && type === 'wall') {
                        console.log('Configuration des matériaux du mur avec faces:', faces);
                        const materials = Array(6).fill(null).map((_, index) => 
                            new THREE.MeshStandardMaterial({
                                side: THREE.DoubleSide,
                                roughness: 0.8,
                                metalness: 0.2,
                                emissive: new THREE.Color(index === selectedFaceIndex ? 0x666666 : 0x000000),
                                emissiveIntensity: index === selectedFaceIndex ? 0.5 : 0
                            })
                        );

                        if (faces) {
                            for (const [faceName, faceData] of Object.entries(faces)) {
                                const faceIndex = faceIndexMapping[faceName as keyof typeof faceIndexMapping];
                                console.log('Application de la face:', {
                                    faceName,
                                    faceIndex,
                                    faceData
                                });
                                
                                if (faceData && faceIndex !== undefined) {
                                    if (faceData.texture) {
                                        try {
                                            const faceTexture = await loadTexture(faceData.texture);
                                            materials[faceIndex].map = faceTexture;
                                            materials[faceIndex].needsUpdate = true;
                                            console.log(`Texture appliquée à la face ${faceName}`);
                                        } catch (error) {
                                            console.error(`Erreur lors de l'application de la texture à la face ${faceName}:`, error);
                                        }
                                    }
                                    if (faceData.color) {
                                        materials[faceIndex].color = new THREE.Color(faceData.color);
                                        materials[faceIndex].needsUpdate = true;
                                    }
                                }
                            }
                        }
                        
                        child.material = materials;
                        child.material.needsUpdate = true;
                    } else if (child.geometry instanceof THREE.PlaneGeometry && type === 'floor') {
                        console.log('Traitement d\'un sol');
                        if (faces?.top) {
                            console.log('Configuration de la face supérieure du sol:', faces.top);
                            const material = new THREE.MeshStandardMaterial({
                                color: faces.top.color ? new THREE.Color(faces.top.color) : (color ? new THREE.Color(color) : 0x808080),
                                transparent: true,
                                opacity: 0.8,
                                side: THREE.DoubleSide,
                                dithering: true,
                                toneMapped: true
                            });

                            if (faces.top.texture) {
                                console.log('Application de la texture au sol:', faces.top.texture);
                                try {
                                    const floorTexture = await loadTexture(faces.top.texture);
                                    material.map = floorTexture;
                                    console.log('Texture du sol appliquée avec succès');
                                } catch (error) {
                                    console.error('Erreur lors du chargement de la texture du sol:', error);
                                }
                            }

                            child.material = material;
                        }
                    } else if (texture) {
                        console.log('Application de la texture globale:', texture);
                        try {
                            const globalTexture = await loadTexture(texture);
                            child.material = new THREE.MeshStandardMaterial({
                                map: globalTexture,
                        side: THREE.DoubleSide,
                        transparent: true,
                        metalness: 0,
                        roughness: 1,
                        dithering: true,
                        toneMapped: true
                    });
                            console.log('Texture globale appliquée avec succès');
                        } catch (error) {
                            console.error('Erreur lors du chargement de la texture globale:', error);
                        }
                    }
                    
                    child.material.needsUpdate = true;
                    console.log('Matériau mis à jour');
                }
            });
        } else {
            console.log('Pas de scene ou pas de texture/faces à appliquer');
        } 
        console.log('=== Fin de l\'effet texture/faces ===');
    }, [scene, texture, scale, color, faces, type, id, selectedFaceIndex]);

    useEffect(() => {
        if (scene && color && !texture && type !== 'wall') {
            scene.traverse((child: any) => {
                if (child.isMesh && child.material) {
                    if (color !== '') {
                        child.material.color = new THREE.Color(color);
                        child.material.needsUpdate = true;
                    }
                }
            });
        }
    }, [scene, color, texture, type]);


    // useEffect(() => {
    //     if (scene) {
    //         scene.traverse((child: any) => {
    //             if (child.isMesh) {
    //                 // Supprimer les effets visuels de sélection s'ils existent
    //                 if (child.userData.outlineMesh) {
    //                     if (child.userData.outlineMesh.parent) {
    //                         child.userData.outlineMesh.parent.remove(child.userData.outlineMesh);
    //                     }
    //                     child.userData.outlineMesh = null;
    //                 }

    //                 // Ajouter l'effet de contour si l'objet est sélectionné
    //                 if (isSelected) {
    //                     let clonedMesh;
                        
    //                     // Vérifier si c'est un mur ou un sol
    //                     const isWallOrFloor = !url || child.geometry instanceof THREE.PlaneGeometry || child.geometry instanceof THREE.BoxGeometry;
                        
    //                     if (isWallOrFloor) {
    //                         // Pour les murs et le sol, créer une nouvelle géométrie simple
    //                         const isFloor = rotation && rotation[0] === -Math.PI / 2;
                            
    //                         if (isFloor) {
    //                             // Pour le sol, utiliser PlaneGeometry
    //                             const geometry = new THREE.PlaneGeometry(1, 1);
    //                             const material = new THREE.MeshBasicMaterial({ visible: false });
    //                             clonedMesh = new THREE.Mesh(geometry, material);
    //                             clonedMesh.scale.set(scale[0], scale[2], 1);
    //                         } else {
    //                             // Pour les murs, utiliser BoxGeometry
    //                             const geometry = new THREE.BoxGeometry(1, 1, 1);
    //                             const material = new THREE.MeshBasicMaterial({ visible: false });
    //                             clonedMesh = new THREE.Mesh(geometry, material);
    //                             clonedMesh.scale.set(scale[0], scale[1], scale[2]);
    //                         }
                            
    //                         clonedMesh.position.set(
    //                             position[0] / 2,
    //                             position[1] / 2,
    //                             position[2] / 2
    //                         );
                            
    //                         if (rotation) {
    //                             clonedMesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    //                         }
    //                     } else {
    //                         // Pour les objets 3D importés, cloner comme avant
    //                         clonedMesh = child.clone();
    //                         clonedMesh.position.set(
    //                             child.position.x / 2,
    //                             child.position.y / 2,
    //                             child.position.z / 2
    //                         );
    //                         if (child.parent) {
    //                             clonedMesh.matrix.copy(child.parent.matrix);
    //                         }
    //                     }
                        
    //                     clonedMesh.updateMatrix();
                        
    //                     // Créer la boîte de sélection basée sur le clone
    //                     const box = new THREE.Box3().setFromObject(clonedMesh);
    //                     const boxHelper = new THREE.Box3Helper(box, new THREE.Color(0x000000));
    //                     const material = boxHelper.material as THREE.LineBasicMaterial;
    //                     material.linewidth = 2;
    //                     material.transparent = true;
    //                     material.opacity = 1;

    //                     // Créer un groupe pour contenir le BoxHelper et le clone
    //                     const group = new THREE.Group();
    //                     group.add(boxHelper);
    //                     group.add(clonedMesh);
                        
    //                     scene.add(group);
    //                     child.userData.outlineMesh = group;
    //                     child.userData.clonedMesh = clonedMesh;
    //                     meshesWithOutlines.push({ mesh: child, helper: group });
    //                 }
    //             }
    //         });

    //         // Nettoyage lors du démontage
    //         return () => {
    //             meshesWithOutlines.forEach(({ mesh, helper }) => {
    //                 if (helper.parent) {
    //                     helper.parent.remove(helper);
    //                     mesh.userData.outlineMesh = null;
    //                 }
    //             });
    //         };
    //     }
    // }, [scene, isSelected, url]);

    // // Modifier le useEffect pour la mise à jour du contour
    // useEffect(() => {
    //     if (scene && isSelected) {
    //         scene.traverse((child: any) => {
    //             if (child.isMesh && child.userData.outlineMesh && child.userData.clonedMesh) {
    //                 const group = child.userData.outlineMesh;
    //                 const clonedMesh = child.userData.clonedMesh;
                    
    //                 // Vérifier si c'est un mur ou un sol
    //                 const isWallOrFloor = !url || child.geometry instanceof THREE.PlaneGeometry || child.geometry instanceof THREE.BoxGeometry;
                    
    //                 if (isWallOrFloor) {
    //                     const isFloor = rotation && rotation[0] === -Math.PI / 2;
                        
    //                     if (isFloor) {
    //                         clonedMesh.scale.set(scale[0], scale[2], 1);
    //                     } else {
    //                         clonedMesh.scale.set(scale[0], scale[1], scale[2]);
    //                     }
                        
    //                     clonedMesh.position.set(
    //                         position[0] / 2,
    //                         position[1] / 2,
    //                         position[2] / 2
    //                     );
                        
    //                     if (rotation) {
    //                         clonedMesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    //                     }
    //                 } else {
    //                     clonedMesh.position.set(
    //                         child.position.x / 2,
    //                         child.position.y / 2,
    //                         child.position.z / 2
    //                     );
    //                 }
                    
    //                 clonedMesh.updateMatrix();
                    
    //                 // Mettre à jour la boîte
    //                 const boxHelper = group.children[0] as THREE.Box3Helper;
    //                 const box = new THREE.Box3().setFromObject(clonedMesh);
    //                 boxHelper.box.copy(box);
    //             }
    //         });
    //     }
    // }, [scene, isSelected, scale, position, rotation]);

    // Effet pour mettre à jour la position
    useEffect(() => {
        if (meshRef.current && position) {
            meshRef.current.position.set(position[0], position[1], position[2]);
            meshRef.current.updateMatrixWorld(true);
        }
    }, [position]);

    // Nouvel effet simplifié pour la mise à jour des textures des faces
    useEffect(() => {
        console.log('=== Début de l\'effet de mise à jour des textures des faces ===');
        console.log('État actuel:', {
            meshRef: meshRef.current ? 'Existe' : 'Null',
            faces,
            type,
            id
        });

        if (!meshRef.current || !faces || !type) {
            console.log('Conditions non remplies pour la mise à jour:', {
                hasMesh: !!meshRef.current,
                hasFaces: !!faces,
                hasType: !!type
            });
            return;
        }

        const mesh = meshRef.current;
        if (!(mesh instanceof THREE.Mesh)) {
            console.log('meshRef.current n\'est pas une instance de THREE.Mesh');
            return;
        }

        console.log('Mise à jour texture face:', { type, faces });

        const textureLoader = new THREE.TextureLoader();

        if (type === 'wall') {
            console.log('Traitement d\'un mur');
            // Créer un tableau de matériaux si ce n'est pas déjà fait
            if (!Array.isArray(mesh.material)) {
                console.log('Création du tableau de matériaux pour le mur');
                mesh.material = Array(6).fill(null).map(() => (
                    new THREE.MeshStandardMaterial({
                        transparent: true,
                        opacity: 0.8,
                        side: THREE.DoubleSide
                    })
                ));
            }

            // S'assurer que le matériau est un tableau
            const materials = mesh.material as THREE.Material[];

            // Mettre à jour les matériaux pour chaque face
            Object.entries(faces).forEach(([faceName, faceData]) => {
                const faceIndex = faceIndexMapping[faceName as keyof typeof faceIndexMapping];
                console.log('Traitement de la face:', {
                    faceName,
                    faceIndex,
                    faceData
                });

                if (faceIndex === undefined || !faceData) {
                    console.log('Face invalide ou données manquantes');
                    return;
                }

                const material = materials[faceIndex] as THREE.MeshStandardMaterial;
                
                if (faceData.texture) {
                    console.log('Chargement de la texture pour la face:', faceName);
                    textureLoader.load(faceData.texture, (texture) => {
                        console.log('Texture chargée avec succès pour la face:', faceName);
                        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                        texture.repeat.set(1, 1);
                        material.map = texture;
                        material.needsUpdate = true;
                    });
                }

                if (faceData.color) {
                    console.log('Application de la couleur pour la face:', faceName);
                    material.color = new THREE.Color(faceData.color);
                }
                material.needsUpdate = true;
            });

        } else if (type === 'floor') {
            console.log('Traitement d\'un sol');
            // Pour les sols, créer un seul matériau
            if (!mesh.material || Array.isArray(mesh.material)) {
                console.log('Création du matériau pour le sol');
                mesh.material = new THREE.MeshStandardMaterial({
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                });
            }

            const material = mesh.material as THREE.MeshStandardMaterial;

            if (faces.top?.texture) {
                console.log('Chargement de la texture pour le sol');
                textureLoader.load(faces.top.texture, (texture) => {
                    console.log('Texture du sol chargée avec succès');
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(1, 1);
                    material.map = texture;
                    material.needsUpdate = true;
                });
            }

            if (faces.top?.color) {
                console.log('Application de la couleur pour le sol');
                material.color = new THREE.Color(faces.top.color);
            }
            material.needsUpdate = true;
        }

        console.log('=== Fin de l\'effet de mise à jour des textures des faces ===');
    }, [faces, type, id]);

    useEffect(() => {
        if (scene && type === 'wall') {
            scene.traverse((child: any) => {
                if (child.isMesh && Array.isArray(child.material)) {
                    child.material.forEach((mat: THREE.MeshStandardMaterial, index: number) => {
                        if (index === selectedFaceIndex) {
                            mat.emissive = new THREE.Color(0x666666);
                            mat.emissiveIntensity = 0.5;
                        } else {
                            mat.emissive = new THREE.Color(0x000000);
                            mat.emissiveIntensity = 0;
                        }
                        mat.needsUpdate = true;
                    });
                }
            });
        }
    }, [scene, selectedFaceIndex, type]);

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
                        console.log("Updating position to:", newPos);
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
                        
                        // Détecter la face cliquée
                        if (event.faceIndex !== undefined && event.object.geometry instanceof THREE.BoxGeometry) {
                            // Convertir l'index de face (0-11 pour un cube) en index de matériau (0-5)
                            const materialIndex = Math.floor(event.faceIndex / 2);
                            setSelectedFaceIndex(materialIndex);
                            console.log('Face cliquée:', materialIndex);
                        }

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
                                color: color,
                                faceIndex: event.faceIndex
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
