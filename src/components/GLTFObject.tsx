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
    showDimensions: boolean; 
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
    showDimensions,
}) => {
    const meshRef = useRef<THREE.Group | THREE.Mesh>(null);
    const [scene, setScene] = useState<THREE.Group | THREE.Mesh | null>(null);
    const arrowWidthRef = useRef<THREE.Group | null>(null);
    const arrowHeightRef = useRef<THREE.Group | null>(null);
    const arrowDepthRef = useRef<THREE.Group | null>(null);

    
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
                const clonedScene = gltf.scene.clone();
                setScene(clonedScene);
            });
        } else {
            const wallGeometry = new THREE.BoxGeometry(scale[0], scale[1], scale[2]);
            const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            console.log("les positions", position);
            wallMesh.position.set(...position);
            if(rotation){
                wallMesh.rotation.set(rotation[0], rotation[1], rotation[2]);
            }
            
            setScene(wallMesh);
        }
    }, [url, position]);

    useEffect(() => {
        if (meshRef.current && scale) { 
            if ((meshRef.current as THREE.Mesh).geometry) {
                const mesh = meshRef.current as THREE.Mesh;
                const newGeometry = new THREE.BoxGeometry(scale[0], scale[1], scale[2]);
                mesh.geometry.dispose();
                mesh.geometry = newGeometry;
    
                updateDimensionHelpers();
            }else{
                meshRef.current.scale.set(scale[0], scale[1], scale[2]);
                meshRef.current.updateMatrixWorld(true);
                updateDimensionHelpers();}
        }
    }, [scale, showDimensions]);
    
    
    
 
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
        if (meshRef.current && rotation) {
            console.log("la rotation est : ",rotation)
            meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
        }
    }, [rotation]);

    useEffect(() => {
        if (scene && texture) {
            const loadedTexture = new THREE.TextureLoader().load(texture);
            loadedTexture.anisotropy = 16;
            scene.traverse((child: any) => {
                if (child.isMesh) {
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
