import React, { useEffect, useRef, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type GLTFObjectProps = {
    id: string;
    url: string;
    position: [number, number, number];
    scale: [number, number, number];
    rotation?: [number, number, number];
    onUpdatePosition: (id: string, position: [number, number, number]) => void;
    isMovable: boolean;
    onClick: () => void;
    texture: string;
    showDimensions: boolean; // Ajout de la prop pour afficher/masquer les dimensions
};

const GLTFObject: React.FC<GLTFObjectProps> = ({
    id,
    url,
    position,
    scale,
    rotation = [0, 0, 0],
    onUpdatePosition,
    isMovable,
    onClick,
    texture,
    showDimensions,
}) => {
    const meshRef = useRef<THREE.Group | THREE.Mesh>(null);
    const [scene, setScene] = useState<THREE.Group | THREE.Mesh | null>(null);
    const arrowsRef = useRef<THREE.Group | null>(null); // Référence pour stocker les flèches de dimension

    // Fonction pour créer un label texte sous forme de sprite
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
        sprite.scale.set(2, 1, 1); // Ajuster la taille du sprite
        return sprite;
    };

    // CHANGEMENT: Utilisation de useEffect pour charger un objet 3D en fonction de l'URL
    useEffect(() => {
        if (url !== '') {
            // Charger un objet GLTF si l'URL est définie
            const loader = new GLTFLoader();
            loader.load(url, (gltf) => {
                const clonedScene = gltf.scene.clone();
                setScene(clonedScene);
            });
        } else {
            // Si l'URL est vide, générer un mur avec BoxGeometry
            const wallHeight = 3;  // Hauteur prédéfinie
            const wallLength = 5;  // Longueur prédéfinie
            const wallThickness = 0.2;  // Épaisseur prédéfinie

            // Création de la géométrie et du matériau du mur
            const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
            const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });

            // Création du mesh du mur
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            wallMesh.position.set(...position); // Position initiale

            setScene(wallMesh);  // Définir la scène avec le mur généré
        }
    }, [url, position]);

    useEffect(() => {
        if (meshRef.current && scale && scale.length === 3) {
            meshRef.current.scale.set(scale[0], scale[1], scale[2]);
            updateDimensionHelpers();
        }
    }, [scale, showDimensions]);

    // Fonction pour mettre à jour les helpers de dimension
    const updateDimensionHelpers = () => {
        if (scene) {
            // Supprimer les anciens helpers de dimension s'ils existent
            if (arrowsRef.current) {
                scene.remove(arrowsRef.current);
                arrowsRef.current = null;
            }

            // Ajouter de nouveaux helpers de dimension uniquement si `showDimensions` est activé
            if (showDimensions) {
                console.log("showing dimensions")
                const box = new THREE.Box3().setFromObject(scene);
                const size = new THREE.Vector3();
                box.getSize(size);

                const arrows = new THREE.Group();
                arrows.name = 'dimensionHelpers';

                // Flèche pour la largeur (X)
                const arrowHelperWidth = new THREE.ArrowHelper(
                    new THREE.Vector3(1, 0, 0),
                    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
                    size.x,
                    0xff0000 // Rouge pour la largeur
                );
                arrows.add(arrowHelperWidth);

                // Ajouter un label pour la largeur
                const widthLabel = createTextSprite(`${size.x.toFixed(2)} m`);
                widthLabel.position.set(
                    box.min.x + size.x / 2,
                    box.min.y,
                    box.min.z
                );
                arrows.add(widthLabel);

                // Flèche pour la hauteur (Y)
                const arrowHelperHeight = new THREE.ArrowHelper(
                    new THREE.Vector3(0, 1, 0),
                    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
                    size.y,
                    0x00ff00 // Vert pour la hauteur
                );
                arrows.add(arrowHelperHeight);

                // Ajouter un label pour la hauteur
                const heightLabel = createTextSprite(`${size.y.toFixed(2)} m`);
                heightLabel.position.set(
                    box.min.x,
                    box.min.y + size.y / 2,
                    box.min.z
                );
                arrows.add(heightLabel);

                // Flèche pour la profondeur (Z)
                const arrowHelperDepth = new THREE.ArrowHelper(
                    new THREE.Vector3(0, 0, 1),
                    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
                    size.z,
                    0x0000ff // Bleu pour la profondeur
                );
                arrows.add(arrowHelperDepth);

                // Ajouter un label pour la profondeur
                const depthLabel = createTextSprite(`${size.z.toFixed(2)} m`);
                depthLabel.position.set(
                    box.min.x,
                    box.min.y,
                    box.min.z + size.z / 2
                );
                arrows.add(depthLabel);

                arrowsRef.current = arrows; // Stocker la référence des flèches et labels
                scene.add(arrows); // Ajouter les flèches et labels à la scène
            }
        }
    };

    useEffect(() => {
        if (meshRef.current && rotation && rotation.length === 3) {
            meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
        }
    }, [rotation]);

    // Appliquer une texture si spécifiée
    useEffect(() => {
        if (scene && texture) {
            scene.traverse((child: any) => {
                if (child.isMesh) {
                    const loadedTexture = new THREE.TextureLoader().load(texture);
                    loadedTexture.anisotropy = 16;
                    loadedTexture.magFilter = THREE.LinearFilter;
                    loadedTexture.minFilter = THREE.LinearMipMapLinearFilter;
                    child.material.map = loadedTexture;
                    child.material.needsUpdate = true;
                }
            });
        }
    }, [scene, texture]);

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
                        onClick();
                    }}
                />
            </TransformControls>
        )
    );
};

export default GLTFObject;
