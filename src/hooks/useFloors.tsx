import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import { ObjectData } from '../types/ObjectData';

// Constantes globales
// 8 10 5 ==> 8
// 80  100 5 ==> 4.2
// 16 20 
const WALL_THICKNESS = 0.2;
const FLOOR_PRICE_PER_SQUARE_METER = 50;
const WALL_PRICE = 100;
const WALL_POSITION_DIVISOR = 4.08;
// Définition des couleurs avec des valeurs hexadécimales plus vives
const FLOOR_COLORS = [
  '#808080', // Gris neutre (rez-de-chaussée)
  '#FF6B88', // Rose vif
  '#FFA500', // Orange
  '#9370DB', // Violet moyen
  '#32CD32'  // Vert lime
];

const WALL_COLORS = [
  '#808080', // Gris neutre (rez-de-chaussée)
  '#FF69B4', // Rose chaud
  '#FFD700', // Or
  '#9932CC', // Violet foncé
  '#3CB371'  // Vert mer moyen
];

const FLOOR_OPACITY = 0.8; 

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

    const boundingBox = new THREE.Box3();
    boundingBox.min.set(-roomConfig.width/2, -WALL_THICKNESS/2, -roomConfig.length/2);
    boundingBox.max.set(roomConfig.width/2, WALL_THICKNESS/2, roomConfig.length/2);
    
    const floorObject: ObjectData = {
      id: uuidv4(),
      url: '',
      price: FLOOR_PRICE_PER_SQUARE_METER,
      details: 'Sol (Rez-de-chaussée)',
      position: [0, WALL_THICKNESS/2, 0], // Ajuster la position Y pour l'épaisseur du sol
      gltf: floorMesh,
      isBatiChiffrageObject: false,
      rotation: [0, 0, 0],
      scale: [roomConfig.width, WALL_THICKNESS, roomConfig.length],
      color: FLOOR_COLORS[0], // Ajouter la couleur comme propriété
      type: 'floor',
      boundingBox: {
        min: [boundingBox.min.x, boundingBox.min.y, boundingBox.min.z],
        max: [boundingBox.max.x, boundingBox.max.y, boundingBox.max.z],
        size: [boundingBox.max.x - boundingBox.min.x, boundingBox.max.y - boundingBox.min.y, boundingBox.max.z - boundingBox.min.z],
        center: [boundingBox.min.x + (boundingBox.max.x - boundingBox.min.x) / 2, boundingBox.min.y + (boundingBox.max.y - boundingBox.min.y) / 2, boundingBox.min.z + (boundingBox.max.z - boundingBox.min.z) / 2]
      },
      faces: {
        top: {
          color: FLOOR_COLORS[0],
          texture: ''
        }
      }
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
    const roundedFloorScale: [number, number, number] = [
      Math.round(roomConfig.width * 1000) / 1000,
      Math.round(WALL_THICKNESS * 1000) / 1000,
      Math.round(roomConfig.length * 1000) / 1000
    ];

    setObjects((prevObjects: ObjectData[]) => [...prevObjects, {
      ...floorObject,
      scale: roundedFloorScale
    }]);
    setQuote((prevQuote: ObjectData[]) => [...prevQuote, {
      ...floorObject,
      scale: roundedFloorScale,
      price: Math.round(roomConfig.width * roomConfig.length * FLOOR_PRICE_PER_SQUARE_METER)
    }]);

    // Ajouter les murs
    walls.forEach(wall => {
      const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
      const wallMaterial = new THREE.MeshStandardMaterial();
      const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
      const boundingBox = new THREE.Box3();
      boundingBox.min.set(-wall.scale[0]/2, -wall.scale[1]/2, -wall.scale[2]/2);
      boundingBox.max.set(wall.scale[0]/2, wall.scale[1]/2, wall.scale[2]/2);

      // Arrondir les valeurs d'échelle au millimètre près
      const roundedWallScale: [number, number, number] = [
        Math.round(wall.scale[0] * 1000) / 1000,
        Math.round(wall.scale[1] * 1000) / 1000,
        Math.round(wall.scale[2] * 1000) / 1000
      ];

      const newWallObject: ObjectData = {
        id: uuidv4(),
        url: '',
        price: Math.round(WALL_PRICE),
        details: 'Mur (Rez-de-chaussée)',
        isBatiChiffrageObject: false,
        position: [
          wall.position[0],
          (wall.position[1] + WALL_THICKNESS/2)/2,
          wall.position[2]
        ],
        gltf: wallMesh,
        rotation: wall.rotation as [number, number, number],
        scale: roundedWallScale,
        color: '',
        texture: '',
        type: 'wall',
        faces: {
          front: {
            color: '',
            texture: ''
          },
          back: {
            color: '',
            texture: ''
          },
          left: {
            color: '',
            texture: ''
          },
          right: {
            color: '',
            texture: ''
          },
          top: {
            color: '',
            texture: ''
          },
          bottom: {
            color: '',
            texture: ''
          }
        },
        boundingBox: {
          min: [boundingBox.min.x, boundingBox.min.y, boundingBox.min.z],
          max: [boundingBox.max.x, boundingBox.max.y, boundingBox.max.z],
          size: [boundingBox.max.x - boundingBox.min.x, boundingBox.max.y - boundingBox.min.y, boundingBox.max.z - boundingBox.min.z],
          center: [boundingBox.min.x + (boundingBox.max.x - boundingBox.min.x) / 2, boundingBox.min.y + (boundingBox.max.y - boundingBox.min.y) / 2, boundingBox.min.z + (boundingBox.max.z - boundingBox.min.z) / 2]
        }
      };

      setObjects((prevObjects: ObjectData[]) => [...prevObjects, newWallObject]);
      setQuote((prevQuote: ObjectData[]) => [...prevQuote, newWallObject]);
    });

    // Ajouter le plafond
    const ceilingGeometry = new THREE.BoxGeometry(1, 1, 1);
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
      color: FLOOR_COLORS[0],
      transparent: true,
      opacity: FLOOR_OPACITY,
      side: THREE.DoubleSide
    });
    const ceilingMesh = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    const ceilingBoundingBox = new THREE.Box3();
    ceilingBoundingBox.min.set(-roomConfig.width/2, -WALL_THICKNESS/2, -roomConfig.length/2);
    ceilingBoundingBox.max.set(roomConfig.width/2, WALL_THICKNESS/2, roomConfig.length/2);

    const ceilingObject: ObjectData = {
      id: uuidv4(),
      url: '',
      price: FLOOR_PRICE_PER_SQUARE_METER,
      details: 'Plafond (Rez-de-chaussée)',
      position: [0, roomConfig.height/2, 0],
      gltf: ceilingMesh,
      isBatiChiffrageObject: false,
      rotation: [0, 0, 0],
      scale: [roomConfig.width, WALL_THICKNESS, roomConfig.length],
      color: FLOOR_COLORS[0],
      type: 'ceiling',
      boundingBox: {
        min: [ceilingBoundingBox.min.x, ceilingBoundingBox.min.y, ceilingBoundingBox.min.z],
        max: [ceilingBoundingBox.max.x, ceilingBoundingBox.max.y, ceilingBoundingBox.max.z],
        size: [ceilingBoundingBox.max.x - ceilingBoundingBox.min.x, ceilingBoundingBox.max.y - ceilingBoundingBox.min.y, ceilingBoundingBox.max.z - ceilingBoundingBox.min.z],
        center: [ceilingBoundingBox.min.x + (ceilingBoundingBox.max.x - ceilingBoundingBox.min.x) / 2, ceilingBoundingBox.min.y + (ceilingBoundingBox.max.y - ceilingBoundingBox.min.y) / 2, ceilingBoundingBox.min.z + (ceilingBoundingBox.max.z - ceilingBoundingBox.min.z) / 2]
      },
      faces: {
        bottom: {
          color: FLOOR_COLORS[0],
          texture: ''
        }
      }
    };

    const roundedCeilingScale: [number, number, number] = [
      Math.round(roomConfig.width * 1000) / 1000,
      Math.round(WALL_THICKNESS * 1000) / 1000,
      Math.round(roomConfig.length * 1000) / 1000
    ];

    setObjects((prevObjects: ObjectData[]) => [...prevObjects, {
      ...ceilingObject,
      scale: roundedCeilingScale
    }]);
    setQuote((prevQuote: ObjectData[]) => [...prevQuote, {
      ...ceilingObject,
      scale: roundedCeilingScale,
      price: Math.round(roomConfig.width * roomConfig.length * FLOOR_PRICE_PER_SQUARE_METER)
    }]);

    setCurrentFloor(0);
    setShowRoomConfig(false);
  }, [roomConfig, setObjects, setQuote, setCurrentFloor, setShowRoomConfig]);

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
    const boundingBox = new THREE.Box3();
    boundingBox.min.set(-roomConfig.width/2, -WALL_THICKNESS/2, -roomConfig.length/2);
    boundingBox.max.set(roomConfig.width/2, WALL_THICKNESS/2, roomConfig.length/2);
    const floorObject: ObjectData = {
      id: uuidv4(),
      url: '',
      price: FLOOR_PRICE_PER_SQUARE_METER,
      details: `Sol (Étage ${nextFloorNumber})`,
      position: [0, (floorHeight + WALL_THICKNESS/2)/2, 0],
      isBatiChiffrageObject: false,
      gltf: floorMesh,
      rotation: [0, 0, 0],
      scale: [roomConfig.width, WALL_THICKNESS, roomConfig.length],
      color: floorColor,
      type: 'floor',
      boundingBox: {
        min: [boundingBox.min.x, boundingBox.min.y, boundingBox.min.z],
        max: [boundingBox.max.x, boundingBox.max.y, boundingBox.max.z],
        size: [boundingBox.max.x - boundingBox.min.x, boundingBox.max.y - boundingBox.min.y, boundingBox.max.z - boundingBox.min.z],
        center: [boundingBox.min.x + (boundingBox.max.x - boundingBox.min.x) / 2, boundingBox.min.y + (boundingBox.max.y - boundingBox.min.y) / 2, boundingBox.min.z + (boundingBox.max.z - boundingBox.min.z) / 2]
      },
      faces: {
        top: {
          color: floorColor,
          texture: ''
        }
      }
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
    const roundedFloorScale: [number, number, number] = [
      Math.round(roomConfig.width * 1000) / 1000,
      Math.round(WALL_THICKNESS * 1000) / 1000,
      Math.round(roomConfig.length * 1000) / 1000
    ];

    setObjects((prevObjects: ObjectData[]) => [...prevObjects, {
      ...floorObject,
      scale: roundedFloorScale
    }]);
    setQuote((prevQuote: ObjectData[]) => [...prevQuote, {
      ...floorObject,
      scale: roundedFloorScale,
      price: Math.round(roomConfig.width * roomConfig.length * FLOOR_PRICE_PER_SQUARE_METER)
    }]);

    // Ajouter le plafond de l'étage
    const ceilingGeometry = new THREE.BoxGeometry(1, 1, 1);
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
      color: floorColor,
      transparent: true,
      opacity: FLOOR_OPACITY,
      side: THREE.DoubleSide
    });
    const ceilingMesh = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    const ceilingBoundingBox = new THREE.Box3();
    ceilingBoundingBox.min.set(-roomConfig.width/2, -WALL_THICKNESS/2, -roomConfig.length/2);
    ceilingBoundingBox.max.set(roomConfig.width/2, WALL_THICKNESS/2, roomConfig.length/2);

    const ceilingObject: ObjectData = {
      id: uuidv4(),
      url: '',
      price: FLOOR_PRICE_PER_SQUARE_METER,
      details: `Plafond (Étage ${nextFloorNumber})`,
      position: [0, (floorHeight + roomConfig.height)/2, 0],
      gltf: ceilingMesh,
      isBatiChiffrageObject: false,
      rotation: [0, 0, 0],
      scale: [roomConfig.width, WALL_THICKNESS, roomConfig.length],
      color: floorColor,
      type: 'ceiling',
      boundingBox: {
        min: [ceilingBoundingBox.min.x, ceilingBoundingBox.min.y, ceilingBoundingBox.min.z],
        max: [ceilingBoundingBox.max.x, ceilingBoundingBox.max.y, ceilingBoundingBox.max.z],
        size: [ceilingBoundingBox.max.x - ceilingBoundingBox.min.x, ceilingBoundingBox.max.y - ceilingBoundingBox.min.y, ceilingBoundingBox.max.z - ceilingBoundingBox.min.z],
        center: [ceilingBoundingBox.min.x + (ceilingBoundingBox.max.x - ceilingBoundingBox.min.x) / 2, ceilingBoundingBox.min.y + (ceilingBoundingBox.max.y - ceilingBoundingBox.min.y) / 2, ceilingBoundingBox.min.z + (ceilingBoundingBox.max.z - ceilingBoundingBox.min.z) / 2]
      },
      faces: {
        bottom: {
          color: floorColor,
          texture: ''
        }
      }
    };

    const roundedCeilingScale: [number, number, number] = [
      Math.round(roomConfig.width * 1000) / 1000,
      Math.round(WALL_THICKNESS * 1000) / 1000,
      Math.round(roomConfig.length * 1000) / 1000
    ];

    setObjects((prevObjects: ObjectData[]) => [...prevObjects, {
      ...ceilingObject,
      scale: roundedCeilingScale
    }]);
    setQuote((prevQuote: ObjectData[]) => [...prevQuote, {
      ...ceilingObject,
      scale: roundedCeilingScale,
      price: Math.round(roomConfig.width * roomConfig.length * FLOOR_PRICE_PER_SQUARE_METER)
    }]);

    // Ajouter les murs
    walls.forEach(wall => {
      const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
      const wallMaterial = new THREE.MeshStandardMaterial();
      const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
      const boundingBox = new THREE.Box3();
      boundingBox.min.set(-wall.scale[0]/2, -wall.scale[1]/2, -wall.scale[2]/2);
      boundingBox.max.set(wall.scale[0]/2, wall.scale[1]/2, wall.scale[2]/2);

      // Arrondir les valeurs d'échelle au millimètre près
      const roundedWallScale: [number, number, number] = [
        Math.round(wall.scale[0] * 1000) / 1000,
        Math.round(wall.scale[1] * 1000) / 1000,
        Math.round(wall.scale[2] * 1000) / 1000
      ];

      const newWallObject: ObjectData = {
        id: uuidv4(),
        url: '',
        price: Math.round(WALL_PRICE),
        details: `Mur (Étage ${nextFloorNumber})`,
        isBatiChiffrageObject: false,
        position: [
          wall.position[0],
          wall.position[1],
          wall.position[2]
        ],
        gltf: wallMesh,
        rotation: wall.rotation as [number, number, number],
        scale: roundedWallScale,
        color: wallColor,
        texture: '',
        type: 'wall',
        faces: {
          front: {
            color: wallColor,
            texture: ''
          },
          back: {
            color: wallColor,
            texture: ''
          },
          left: {
            color: wallColor,
            texture: ''
          },
          right: {
            color: wallColor,
            texture: ''
          },
          top: {
            color: wallColor,
            texture: ''
          },
          bottom: {
            color: wallColor,
            texture: ''
          }
        },
        boundingBox: {
          min: [boundingBox.min.x, boundingBox.min.y, boundingBox.min.z],
          max: [boundingBox.max.x, boundingBox.max.y, boundingBox.max.z],
          size: [boundingBox.max.x - boundingBox.min.x, boundingBox.max.y - boundingBox.min.y, boundingBox.max.z - boundingBox.min.z],
          center: [boundingBox.min.x + (boundingBox.max.x - boundingBox.min.x) / 2, boundingBox.min.y + (boundingBox.max.y - boundingBox.min.y) / 2, boundingBox.min.z + (boundingBox.max.z - boundingBox.min.z) / 2]
        }
      };

      setObjects((prevObjects: ObjectData[]) => [...prevObjects, newWallObject]);
      setQuote((prevQuote: ObjectData[]) => [...prevQuote, newWallObject]);
    });

    setCurrentFloor(nextFloorNumber);
  }, [currentFloor, roomConfig, setObjects, setQuote, setCurrentFloor]);

  // Nouvelle fonction pour mettre à jour les dimensions d'une pièce existante
  const updateRoomDimensions = useCallback((floorId: string, newWidth: number, newLength: number, newHeight: number) => {
    // Arrondir les nouvelles dimensions au millimètre près
    const roundedWidth = Math.round(newWidth * 1000) / 1000;
    const roundedLength = Math.round(newLength * 1000) / 1000;
    const roundedHeight = Math.round(newHeight * 1000) / 1000;

    setObjects((prevObjects: ObjectData[]) => prevObjects.map((obj: ObjectData) => {
      if (!obj.details.includes(floorId === '0' ? 'Rez-de-chaussée' : `Étage ${floorId}`)) return obj;

      if (obj.type === 'floor') {
        const roundedScale: [number, number, number] = [
          roundedWidth,
          obj.scale[1],
          roundedLength
        ];

        return {
          ...obj,
          scale: roundedScale,
          price: Math.round(roundedWidth * roundedLength * FLOOR_PRICE_PER_SQUARE_METER)
        };
      }

      if (obj.type === 'wall') {
        const rotation = obj.rotation || [0, 0, 0];
        const isHorizontalWall = Math.abs(rotation[1]) < 0.1 || Math.abs(rotation[1] - Math.PI) < 0.1;
        const roundedScale: [number, number, number] = isHorizontalWall
          ? [roundedWidth, roundedHeight, obj.scale[2]]
          : [roundedLength, roundedHeight, obj.scale[2]];

        return {
          ...obj,
          scale: roundedScale,
          price: Math.round(roundedScale[0] * roundedScale[1] * 15)
        };
      }

      return obj;
    }));

    // Mettre à jour les prix dans le devis avec les valeurs arrondies
    setQuote((prevQuote: ObjectData[]) => prevQuote.map((item: ObjectData) => {
      const matchingObject = objects.find((obj: ObjectData) => obj.id === item.id);
      if (!matchingObject) return item;

      // Vérifier si l'objet appartient à l'étage concerné
      const isCurrentFloor = floorId === '0'
        ? matchingObject.details.includes('Rez-de-chaussée')
        : matchingObject.details.includes(`Étage ${floorId}`);

      if (!isCurrentFloor) return item;

      if (matchingObject.type === 'floor') {
        return {
          ...item,
          scale: [roundedWidth, item.scale[1], roundedLength],
          price: Math.round(roundedWidth * roundedLength * FLOOR_PRICE_PER_SQUARE_METER)
        };
      }

      if (matchingObject.type === 'wall') {
        const rotation = matchingObject.rotation || [0, 0, 0];
        const isHorizontalWall = Math.abs(rotation[1]) < 0.1 || Math.abs(rotation[1] - Math.PI) < 0.1;
        const roundedScale: [number, number, number] = isHorizontalWall
          ? [roundedWidth, roundedHeight, matchingObject.scale[2]]
          : [roundedLength, roundedHeight, matchingObject.scale[2]];

        return {
          ...item,
          scale: roundedScale,
          price: Math.round(roundedScale[0] * roundedScale[1] * 15)
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