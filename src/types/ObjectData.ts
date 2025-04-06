import { Mesh } from "three";
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Type pour définir les propriétés d'une face
export type FaceData = {
    texture?: string;
    color?: string;
};

// Type pour définir toutes les faces d'un mur ou sol
export type FacesData = {
    front?: FaceData;   // Face avant (Z+)
    back?: FaceData;    // Face arrière (Z-)
    left?: FaceData;    // Face gauche (X-)
    right?: FaceData;   // Face droite (X+)
    top?: FaceData;     // Face supérieure (Y+)
    bottom?: FaceData;  // Face inférieure (Y-)
};

export type ObjectData = {
    id: string;
    url: string;
    price: number;
    details: string;
    position: [number, number, number];
    gltf : Mesh | GLTF;
    texture ?: string;  // Texture globale (appliquée si pas de faces spécifiques)
    scale : [number, number, number];
    rotation?: [number, number, number];
    color?: string;     // Couleur globale (appliquée si pas de faces spécifiques)
    startPoint?: [number, number];
    endPoint?: [number, number];
    parentScale?: [number, number, number];
    boundingBox?: {
        min: [number, number, number];
        max: [number, number, number];
        size: [number, number, number];
        center: [number, number, number];
    };
    faces?: FacesData;  // Définition des faces pour les murs et sols
    type?: 'wall' | 'floor' | 'object';  // Type d'objet pour différencier le comportement
    parametricData?: any; // Données paramétriques récupérées depuis l'API
};
