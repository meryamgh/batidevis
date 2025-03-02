import { Mesh } from "three";
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type ObjectData = {
    id: string;
    url: string;
    price: number;
    details: string;
    position: [number, number, number];
    gltf : Mesh | GLTF;
    texture ?: string;
    scale : [number, number, number];
    rotation?: [number, number, number];
    // Points pour le rendu 2D des murs
    startPoint?: [number, number];
    endPoint?: [number, number];
};
