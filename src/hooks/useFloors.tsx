import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import { ObjectData } from '../types/ObjectData';

interface RoomConfig {
  width: number;
  length: number;
  height: number;
}

// Interface pour les paramètres d'entrée du hook
interface UseFloorsProps {
  setObjects: React.Dispatch<React.SetStateAction<ObjectData[]>>;
  setQuote: React.Dispatch<React.SetStateAction<ObjectData[]>>;
  currentFloor: number;
  setCurrentFloor: React.Dispatch<React.SetStateAction<number>>;
  selectedFloor2D: number;
  setSelectedFloor2D: React.Dispatch<React.SetStateAction<number>>;
  showRoomConfig: boolean;
  setShowRoomConfig: React.Dispatch<React.SetStateAction<boolean>>;
  roomConfig: RoomConfig;
  setRoomConfig: React.Dispatch<React.SetStateAction<RoomConfig>>;
}

// Interface pour définir les propriétés retournées par le hook
interface UseFloorsReturn {
  generateRoom: () => void;
  addNewFloor: () => void;
}

export const useFloors = ({ 
  setObjects, 
  setQuote,
  currentFloor,
  setCurrentFloor,
  selectedFloor2D,
  setSelectedFloor2D,
  showRoomConfig,
  setShowRoomConfig,
  roomConfig,
  setRoomConfig
}: UseFloorsProps): UseFloorsReturn => {

  const generateRoom = useCallback(() => {
    const wallThickness = 0.2;
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x90EE90,
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
      position: [0, wallThickness/2, 0], // Ajuster la position Y pour l'épaisseur du sol
      gltf: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), floorMaterial),
      rotation: [0, 0, 0],
      scale: [roomConfig.width, wallThickness, roomConfig.length],
    };

    // Créer les murs en commençant au niveau du sol
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
        position: [
          wall.position[0],
          (wall.position[1] + wallThickness/2)/2, // Ajuster la position Y pour commencer au niveau du sol
          wall.position[2]
        ],
        gltf: wallMesh,
        rotation: wall.rotation as [number, number, number],
        scale: wall.scale as [number, number, number],
      };

      setObjects(prevObjects => [...prevObjects, newWallObject]);
      setQuote(prevQuote => [...prevQuote, newWallObject]);
    });

    setCurrentFloor(0);
    setShowRoomConfig(false);
  }, [roomConfig]);

  const addNewFloor = useCallback(() => {
    const wallThickness = 0.2;
    const nextFloorNumber = currentFloor + 1;
    const floorHeight = nextFloorNumber * roomConfig.height;

    // Couleurs différentes pour chaque étage
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
      position: [0, (floorHeight + wallThickness/2)/2, 0], // Ajuster la position Y pour l'épaisseur du sol
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
        position: [
          wall.position[0],
          wall.position[1] + wallThickness/2, // Ajuster la position Y pour commencer au niveau du sol de l'étage
          wall.position[2]
        ],
        gltf: wallMesh,
        rotation: wall.rotation as [number, number, number],
        scale: wall.scale as [number, number, number],
      };

      setObjects(prevObjects => [...prevObjects, newWallObject]);
      setQuote(prevQuote => [...prevQuote, newWallObject]);
    });

    setCurrentFloor(nextFloorNumber);
  }, [currentFloor, roomConfig]);

  return {
    generateRoom,
    addNewFloor
  };
}; 