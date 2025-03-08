import React from 'react';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { ObjectData } from '../../types/ObjectData';

export const generateRoom = (
    roomConfig: { width: number; length: number; height: number },
    setObjects: React.Dispatch<React.SetStateAction<ObjectData[]>>,
    setQuote: React.Dispatch<React.SetStateAction<ObjectData[]>>
) => {
    const wallThickness = 0.2;
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xADD8E6,
        transparent: true,
        opacity: 0.8
    });
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xADD8E6,
        transparent: true,
        opacity: 0.7
    });

    // Créer le sol au niveau le plus bas (y = 0)
    const floorObject: ObjectData = {
        id: uuidv4(),
        url: '',
        price: 50,
        details: 'Sol (Rez-de-chaussée)',
        position: [0, wallThickness/2, 0],
        gltf: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), floorMaterial),
        rotation: [0, 0, 0],
        scale: [roomConfig.width, wallThickness, roomConfig.length],
    };

    // Créer les murs
    const walls = [
        // Mur avant
        {
            position: [0, roomConfig.height/2, roomConfig.length/4],
            scale: [roomConfig.width, roomConfig.height, wallThickness],
            rotation: [0, 0, 0]
        },
        // Mur arrière
        {
            position: [0, roomConfig.height/2, -roomConfig.length/4],
            scale: [roomConfig.width, roomConfig.height, wallThickness],
            rotation: [0, 0, 0]
        },
        // Mur gauche
        {
            position: [-roomConfig.width/4, roomConfig.height/2, 0],
            scale: [roomConfig.length, roomConfig.height, wallThickness],
            rotation: [0, Math.PI/2, 0]
        },
        // Mur droit
        {
            position: [roomConfig.width/4, roomConfig.height/2, 0],
            scale: [roomConfig.length, roomConfig.height, wallThickness],
            rotation: [0, Math.PI/2, 0]
        }
    ];

    // Ajouter le sol
    setObjects(prevObjects => [...prevObjects, floorObject]);
    setQuote(prevQuote => [...prevQuote, {
        ...floorObject,
        price: (roomConfig.width * roomConfig.length * 50)
    }]);

    // Ajouter les murs
    walls.forEach(wall => {
        const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

        const newWallObject: ObjectData = {
            id: uuidv4(),
            url: '',
            price: 100,
            details: 'Mur (Rez-de-chaussée)',
            position: wall.position as [number, number, number],
            gltf: wallMesh,
            rotation: wall.rotation as [number, number, number],
            scale: wall.scale as [number, number, number],
        };

        setObjects(prevObjects => [...prevObjects, newWallObject]);
        setQuote(prevQuote => [...prevQuote, newWallObject]);
    });
};

export const addNewFloor = (
    currentFloor: number,
    roomConfig: { width: number; length: number; height: number },
    setObjects: React.Dispatch<React.SetStateAction<ObjectData[]>>,
    setQuote: React.Dispatch<React.SetStateAction<ObjectData[]>>
) => {
    const wallThickness = 0.2;
    const nextFloorNumber = currentFloor + 1;
    const floorHeight = nextFloorNumber * roomConfig.height;

    const colors = [
        0xFFB6C1, // Rose clair
        0xFFE4B5, // Pêche
        0xE6E6FA, // Lavande
        0x98FB98  // Vert pâle
    ];

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: colors[nextFloorNumber % colors.length],
        transparent: true,
        opacity: 0.8
    });

    const wallMaterial = new THREE.MeshStandardMaterial({
        color: colors[(nextFloorNumber + 1) % colors.length],
        transparent: true,
        opacity: 0.7
    });

    // Créer le sol de l'étage
    const floorObject: ObjectData = {
        id: uuidv4(),
        url: '',
        price: 50,
        details: `Sol (Étage ${nextFloorNumber})`,
        position: [0, (floorHeight + wallThickness/2)/2, 0],
        gltf: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), floorMaterial),
        rotation: [0, 0, 0],
        scale: [roomConfig.width, wallThickness, roomConfig.length],
    };

    // Créer les murs de l'étage
    const walls = [
        // Mur avant
        {
            position: [0, (floorHeight + roomConfig.height/2)/2, roomConfig.length/4],
            scale: [roomConfig.width, roomConfig.height, wallThickness],
            rotation: [0, 0, 0]
        },
        // Mur arrière
        {
            position: [0, (floorHeight + roomConfig.height/2)/2, -roomConfig.length/4],
            scale: [roomConfig.width, roomConfig.height, wallThickness],
            rotation: [0, 0, 0]
        },
        // Mur gauche
        {
            position: [-roomConfig.width/4, (floorHeight + roomConfig.height/2)/2, 0],
            scale: [roomConfig.length, roomConfig.height, wallThickness],
            rotation: [0, Math.PI/2, 0]
        },
        // Mur droit
        {
            position: [roomConfig.width/4, (floorHeight + roomConfig.height/2)/2, 0],
            scale: [roomConfig.length, roomConfig.height, wallThickness],
            rotation: [0, Math.PI/2, 0]
        }
    ];

    // Ajouter le sol
    setObjects(prevObjects => [...prevObjects, floorObject]);
    setQuote(prevQuote => [...prevQuote, {
        ...floorObject,
        price: (roomConfig.width * roomConfig.length * 50)
    }]);

    // Ajouter les murs
    walls.forEach(wall => {
        const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

        const newWallObject: ObjectData = {
            id: uuidv4(),
            url: '',
            price: 100,
            details: `Mur (Étage ${nextFloorNumber})`,
            position: wall.position as [number, number, number],
            gltf: wallMesh,
            rotation: wall.rotation as [number, number, number],
            scale: wall.scale as [number, number, number],
        };

        setObjects(prevObjects => [...prevObjects, newWallObject]);
        setQuote(prevQuote => [...prevQuote, newWallObject]);
    });
};

export const handleAddWall2D = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    roomConfig: { width: number; length: number; height: number },
    currentFloor: number,
    setObjects: React.Dispatch<React.SetStateAction<ObjectData[]>>,
    setQuote: React.Dispatch<React.SetStateAction<ObjectData[]>>
) => {
    const wallThickness = 0.2;
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xADD8E6,
        transparent: true,
        opacity: 0.7
    });

    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const angle = Math.atan2(direction.z, direction.x);

    const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

    const floorHeight = currentFloor * roomConfig.height;
    const wallHeight = roomConfig.height;

    const newWallObject: ObjectData = {
        id: uuidv4(),
        url: '',
        price: 100 * length,
        details: currentFloor === 0 ? 'Mur (Rez-de-chaussée)' : `Mur (Étage ${currentFloor})`,
        position: [center.x, (floorHeight + wallHeight/2)/2, center.z],
        gltf: wallMesh,
        rotation: [0, angle, 0],
        scale: [length, wallHeight, wallThickness],
        startPoint: [start.x, start.z],
        endPoint: [end.x, end.z]
    };

    setObjects(prevObjects => [...prevObjects, newWallObject]);
    setQuote(prevQuote => [...prevQuote, newWallObject]);
}; 