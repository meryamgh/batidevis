import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import { ObjectData } from '../types/ObjectData';

// Constantes globales
const WALL_THICKNESS = 0.2;
const FLOOR_PRICE_PER_SQUARE_METER = 50;
const WALL_PRICE = 100;
const WALL_POSITION_DIVISOR = 4.08;
// Définition des couleurs avec des valeurs hexadécimales plus vives
const FLOOR_COLORS = [
  '#90EE90', // Vert clair (rez-de-chaussée)
  '#FF6B88', // Rose vif
  '#FFA500', // Orange
  '#9370DB', // Violet moyen
  '#32CD32'  // Vert lime
];

const WALL_COLORS = [
  '#87CEEB', // Bleu ciel (rez-de-chaussée)
  '#FF69B4', // Rose chaud
  '#FFD700', // Or
  '#9932CC', // Violet foncé
  '#3CB371'  // Vert mer moyen
];

const FLOOR_OPACITY = 0.8;
const WALL_OPACITY = 0.7;

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
  setShowRoomConfig: React.Dispatch<React.SetStateAction<boolean>>;
  roomConfig: RoomConfig;
  objects: ObjectData[]; // Ajout des objets pour pouvoir les mettre à jour
}

// Interface pour définir les propriétés retournées par le hook
interface UseFloorsReturn {
  generateRoom: () => void;
  addNewFloor: () => void;
  updateRoomDimensions: (floorId: string, newWidth: number, newLength: number, newHeight: number) => void;
}

export const useFloors = ({ 
  setObjects, 
  setQuote,
  currentFloor,
  setCurrentFloor,
  setShowRoomConfig,
  roomConfig,
  objects,
}: UseFloorsProps): UseFloorsReturn => {

  //const WALL_POSITION_DIVISOR = 4.056 - (0.050 / roomConfig.width) - (0.167 / roomConfig.length) + (3.111 / (roomConfig.width * roomConfig.length));

  const generateRoom = useCallback(() => {
    // Créer le sol au niveau le plus bas (y = 0)
    const floorGeometry = new THREE.BoxGeometry(1, 1, 1);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: FLOOR_COLORS[0],
      transparent: true,
      opacity: FLOOR_OPACITY,
      side: THREE.DoubleSide
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    
    const floorObject: ObjectData = {
      id: uuidv4(),
      url: '',
      price: FLOOR_PRICE_PER_SQUARE_METER,
      details: 'Sol (Rez-de-chaussée)',
      position: [0, WALL_THICKNESS/2, 0], // Ajuster la position Y pour l'épaisseur du sol
      gltf: floorMesh,
      rotation: [0, 0, 0],
      scale: [roomConfig.width, WALL_THICKNESS, roomConfig.length],
      color: FLOOR_COLORS[0] // Ajouter la couleur comme propriété
    };

    // Créer les murs en commençant au niveau du sol
    const walls = [
      // Mur avant
      {
        position: [0, roomConfig.height/2, roomConfig.length/WALL_POSITION_DIVISOR],
        scale: [roomConfig.width, roomConfig.height, WALL_THICKNESS],
        rotation: [0, 0, 0]
      },
      // Mur arrière
      {
        position: [0, roomConfig.height/2, -roomConfig.length/WALL_POSITION_DIVISOR],
        scale: [roomConfig.width, roomConfig.height, WALL_THICKNESS],
        rotation: [0, 0, 0]
      },
      // Mur gauche
      {
        position: [-roomConfig.width/WALL_POSITION_DIVISOR, roomConfig.height/2, 0],
        scale: [roomConfig.length, roomConfig.height, WALL_THICKNESS],
        rotation: [0, Math.PI/2, 0]
      },
      // Mur droit
      {
        position: [roomConfig.width/WALL_POSITION_DIVISOR, roomConfig.height/2, 0],
        scale: [roomConfig.length, roomConfig.height, WALL_THICKNESS],
        rotation: [0, Math.PI/2, 0]
      }
    ];

    // Ajouter le sol
    setObjects(prevObjects => [...prevObjects, floorObject]);
    setQuote(prevQuote => [...prevQuote, {
      ...floorObject,
      price: (roomConfig.width * roomConfig.length * FLOOR_PRICE_PER_SQUARE_METER)
    }]);

    // Ajouter les murs
    walls.forEach(wall => {
      const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
      const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: WALL_COLORS[0],
        transparent: true,
        opacity: WALL_OPACITY,
        side: THREE.DoubleSide
      });
      const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

      const newWallObject: ObjectData = {
        id: uuidv4(),
        url: '',
        price: WALL_PRICE,
        details: 'Mur (Rez-de-chaussée)',
        position: [
          wall.position[0],
          (wall.position[1] + WALL_THICKNESS/2)/2, // Ajuster la position Y pour commencer au niveau du sol
          wall.position[2]
        ],
        gltf: wallMesh,
        rotation: wall.rotation as [number, number, number],
        scale: wall.scale as [number, number, number],
        color: WALL_COLORS[0] // Ajouter la couleur comme propriété
      };

      setObjects(prevObjects => [...prevObjects, newWallObject]);
      setQuote(prevQuote => [...prevQuote, newWallObject]);
    });

    setCurrentFloor(0);
    setShowRoomConfig(false);
  }, [roomConfig]);

  const addNewFloor = useCallback(() => {
    const nextFloorNumber = currentFloor + 1;
    const floorHeight = nextFloorNumber * roomConfig.height;
    
    // Sélectionner les couleurs pour cet étage
    const floorColor = FLOOR_COLORS[nextFloorNumber % FLOOR_COLORS.length];
    const wallColor = WALL_COLORS[nextFloorNumber % WALL_COLORS.length];

    // Créer le sol de l'étage
    const floorGeometry = new THREE.BoxGeometry(1, 1, 1);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: floorColor,
      transparent: true,
      opacity: FLOOR_OPACITY,
      side: THREE.DoubleSide
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    
    const floorObject: ObjectData = {
      id: uuidv4(),
      url: '',
      price: FLOOR_PRICE_PER_SQUARE_METER,
      details: `Sol (Étage ${nextFloorNumber})`,
      position: [0, (floorHeight + WALL_THICKNESS/2)/2, 0], // Ajuster la position Y pour l'épaisseur du sol
      gltf: floorMesh,
      rotation: [0, 0, 0],
      scale: [roomConfig.width, WALL_THICKNESS, roomConfig.length],
      color: floorColor // Ajouter la couleur comme propriété
    };

    // Créer les murs de l'étage
    const walls = [
      // Mur avant
      {
        position: [0, (floorHeight + roomConfig.height/2)/2, roomConfig.length/WALL_POSITION_DIVISOR],
        scale: [roomConfig.width, roomConfig.height, WALL_THICKNESS],
        rotation: [0, 0, 0]
      },
      // Mur arrière
      {
        position: [0, (floorHeight + roomConfig.height/2)/2, -roomConfig.length/WALL_POSITION_DIVISOR],
        scale: [roomConfig.width, roomConfig.height, WALL_THICKNESS],
        rotation: [0, 0, 0]
      },
      // Mur gauche
      {
        position: [-roomConfig.width/WALL_POSITION_DIVISOR, (floorHeight + roomConfig.height/2)/2, 0],
        scale: [roomConfig.length, roomConfig.height, WALL_THICKNESS],
        rotation: [0, Math.PI/2, 0]
      },
      // Mur droit
      {
        position: [roomConfig.width/WALL_POSITION_DIVISOR, (floorHeight + roomConfig.height/2)/2, 0],
        scale: [roomConfig.length, roomConfig.height, WALL_THICKNESS],
        rotation: [0, Math.PI/2, 0]
      }
    ];

    // Ajouter le sol
    setObjects(prevObjects => [...prevObjects, floorObject]);
    setQuote(prevQuote => [...prevQuote, {
      ...floorObject,
      price: (roomConfig.width * roomConfig.length * FLOOR_PRICE_PER_SQUARE_METER)
    }]);

    // Ajouter les murs
    walls.forEach(wall => {
      const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
      const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: wallColor,
        transparent: true,
        opacity: WALL_OPACITY,
        side: THREE.DoubleSide
      });
      const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

      const newWallObject: ObjectData = {
        id: uuidv4(),
        url: '',
        price: WALL_PRICE,
        details: `Mur (Étage ${nextFloorNumber})`,
        position: [
          wall.position[0],
          wall.position[1] + WALL_THICKNESS/2, // Ajuster la position Y pour commencer au niveau du sol de l'étage
          wall.position[2]
        ],
        gltf: wallMesh,
        rotation: wall.rotation as [number, number, number],
        scale: wall.scale as [number, number, number],
        color: wallColor // Ajouter la couleur comme propriété
      };

      setObjects(prevObjects => [...prevObjects, newWallObject]);
      setQuote(prevQuote => [...prevQuote, newWallObject]);
    });

    setCurrentFloor(nextFloorNumber);
  }, [currentFloor, roomConfig]);

  // Nouvelle fonction pour mettre à jour les dimensions d'une pièce existante
  const updateRoomDimensions = useCallback((floorId: string, newWidth: number, newLength: number, newHeight: number) => {
    // Trouver l'étage concerné
    const floorObject = objects.find(obj => obj.id === floorId);
    if (!floorObject || !floorObject.details.includes('Sol')) return;
    
    // Déterminer le numéro d'étage
    const floorNumberMatch = floorObject.details.match(/Étage (\d+)/);
    const floorNumber = floorNumberMatch ? parseInt(floorNumberMatch[1]) : 0;
    
    // Trouver tous les objets de cet étage (sol et murs)
    const floorObjects = objects.filter(obj => {
      const isCurrentFloor = floorNumber === 0 
        ? obj.details.includes('Rez-de-chaussée')
        : obj.details.includes(`Étage ${floorNumber}`);
      return isCurrentFloor;
    });
    
    // Mettre à jour les objets
    setObjects(prevObjects => prevObjects.map(obj => {
      // Vérifier si l'objet appartient à l'étage concerné
      const isCurrentFloor = floorNumber === 0 
        ? obj.details.includes('Rez-de-chaussée')
        : obj.details.includes(`Étage ${floorNumber}`);
      
      if (!isCurrentFloor) return obj;
      
      // Calculer la hauteur de base de l'étage
      const baseHeight = floorNumber * newHeight;
      
      // Mettre à jour le sol
      if (obj.details.includes('Sol')) {
        return {
          ...obj,
          scale: [newWidth, WALL_THICKNESS, newLength],
          position: [0, (baseHeight + WALL_THICKNESS/2)/2, 0]
        };
      }
      
      // Mettre à jour les murs
      if (obj.details.includes('Mur')) {
        // Déterminer quel mur est concerné en fonction de sa position et rotation
        const rotation = obj.rotation || [0, 0, 0];
        const isVerticalWall = Math.abs(Math.sin(rotation[1])) > 0.5;
        const isPositivePosition = obj.position[isVerticalWall ? 0 : 2] > 0;
        
        if (isVerticalWall) {
          // Murs gauche et droit
          return {
            ...obj,
            scale: [newLength, newHeight, WALL_THICKNESS],
            position: [
              (isPositivePosition ? 1 : -1) * newWidth/WALL_POSITION_DIVISOR,
              (baseHeight + newHeight/2)/2,
              0
            ]
          };
        } else {
          // Murs avant et arrière
          return {
            ...obj,
            scale: [newWidth, newHeight, WALL_THICKNESS],
            position: [
              0,
              (baseHeight + newHeight/2)/2,
              (isPositivePosition ? 1 : -1) * newLength/WALL_POSITION_DIVISOR
            ]
          };
        }
      }
      
      return obj;
    }));
    
    // Mettre à jour les prix dans le devis
    setQuote(prevQuote => prevQuote.map(item => {
      const matchingObject = objects.find(obj => obj.id === item.id);
      if (!matchingObject) return item;
      
      // Vérifier si l'objet appartient à l'étage concerné
      const isCurrentFloor = floorNumber === 0 
        ? matchingObject.details.includes('Rez-de-chaussée')
        : matchingObject.details.includes(`Étage ${floorNumber}`);
      
      if (!isCurrentFloor) return item;
      
      // Mettre à jour le prix du sol
      if (matchingObject.details.includes('Sol')) {
        return {
          ...item,
          price: newWidth * newLength * FLOOR_PRICE_PER_SQUARE_METER
        };
      }
      
      return item;
    }));
    
  }, [objects, setObjects, setQuote]);

  return {
    generateRoom,
    addNewFloor,
    updateRoomDimensions
  };
}; 