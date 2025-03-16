import { useCallback } from 'react';
import { ObjectData } from '../types/ObjectData';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Root } from 'react-dom/client';

// Interface pour les paramètres d'entrée du hook
interface UseObjectsProps {
  objects: ObjectData[];
  setObjects: React.Dispatch<React.SetStateAction<ObjectData[]>>;
  quote: ObjectData[];
  setQuote: React.Dispatch<React.SetStateAction<ObjectData[]>>;
  isMoving: string | null;
  setIsMoving: React.Dispatch<React.SetStateAction<string | null>>;
  showDimensions: { [key: string]: boolean };
  setShowDimensions: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
  focusedObjectId: string | null;
  setFocusedObjectId: React.Dispatch<React.SetStateAction<string | null>>;
}

// Interface pour définir les propriétés retournées par le hook
interface UseObjectsReturn {
  handleAddObject: (url: string, event?: React.DragEvent<HTMLDivElement>, camera?: THREE.Camera) => Promise<void>;
  handleRemoveObject: (id: string) => void;
  handleUpdatePosition: (id: string, position: [number, number, number]) => void;
  handleUpdateTexture: (id: string, newTexture: string) => void;
  handleUpdateColor: (id: string, newColor: string) => void;
  handleUpdateScale: (id: string, newScale: [number, number, number]) => void;
  handleRotateObject: (id: string, newRotation: [number, number, number]) => [string, [number, number, number]];
  handleToggleShowDimensions: (id: string) => void;
  updateQuotePrice: (id: string, newPrice: number, newScale: [number, number, number]) => void;
  getSerializableQuote: () => Omit<ObjectData, 'gltf'>[];
  handleObjectClick: (
    id: string, 
    viewMode: '3D' | '2D' | 'Blueprint' | 'ObjectOnly',
    is2DView: boolean,
    renderObjectPanel: (selectedObject: ObjectData) => void
  ) => void;
}

export const useObjects = ({
  objects,
  setObjects,
  quote,
  setQuote,
  isMoving,
  setIsMoving,
  showDimensions,
  setShowDimensions,
  focusedObjectId,
  setFocusedObjectId,
}: UseObjectsProps): UseObjectsReturn => {

  const handleAddObject = useCallback(async (url: string, event?: React.DragEvent<HTMLDivElement>, camera?: THREE.Camera) => {
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      
      // Calculer la bounding box de l'objet
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const extras = gltf.asset?.extras || {};
      const price = extras.price || 100; // Prix par défaut si non spécifié
      const details = extras.details || url.split('/').pop()?.replace('.gltf', '').replace('.glb', '') || 'No details available';

      // Si l'événement de glisser-déposer est fourni, calculer la position basée sur l'intersection avec le plan
      let position: [number, number, number] = [0, 0, 0];
      
      if (event && camera) {
        // Créer un plan horizontal pour l'intersection
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        // Convertir les coordonnées de la souris en coordonnées normalisées (-1 à 1)
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        // Calculer l'intersection avec le plan
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          // Calculer la position en tenant compte du centre de l'objet et de sa hauteur minimale
          const objectHeight = box.max.y - box.min.y;
          const bottomOffset = -box.min.y / 2; // Diviser par 2 pour ajuster la hauteur
          
          position = [
            (intersection.x - center.x)/2,
            bottomOffset,
            (intersection.z - center.z)/2
          ];
        }
      } else {
        // Si pas d'événement de drop, placer l'objet au centre
        const bottomOffset = -box.min.y / 2; // Diviser par 2 pour ajuster la hauteur
        position = [-center.x, bottomOffset, -center.z];
      }

      // Réinitialiser la position de la scène de l'objet
      gltf.scene.position.set(0, 0, 0);

      const objectId = uuidv4();
      const scale: [number, number, number] = [size.x, size.y, size.z];
      const rotation: [number, number, number] = [0, 0, 0];

      // Créer l'objet avec les propriétés de base
      const newObject: ObjectData = {
        id: objectId,
        url,
        price,
        details,
        position,
        gltf,
        rotation,
        scale,
        texture: '',
        color: '#FFFFFF',
      };

      // Ajouter d'abord au devis
      setQuote(prevQuote => [...prevQuote, newObject]);
      
      // Puis ajouter à la scène
      setObjects(prevObjects => [...prevObjects, newObject]);

    } catch (error) {
      console.error('Error loading GLTF file:', error);
    }
  }, [setObjects, setQuote]);

  const handleRemoveObject = useCallback((id: string) => {
    setObjects((prevObjects) => prevObjects.filter((obj) => obj.id !== id));
    setQuote((prevQuote) => prevQuote.filter((item) => item.id !== id));
    setIsMoving(null);
  }, [setObjects, setQuote, setIsMoving]);

  const handleUpdatePosition = useCallback((id: string, position: [number, number, number]) => {
    setObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, position } : obj))
    );
  }, [setObjects]);

  const handleUpdateTexture = useCallback((id: string, newTexture: string) => {
    setObjects((prevObjects) =>
      prevObjects.map((obj) =>
        obj.id === id ? { ...obj, texture: newTexture } : obj
      )
    );
  }, [setObjects]);

  const handleUpdateColor = useCallback((id: string, newColor: string) => {
    setObjects((prevObjects) =>
      prevObjects.map((obj) =>
        obj.id === id ? { ...obj, color: newColor } : obj
      )
    );
  }, [setObjects]);

  const handleUpdateScale = useCallback((id: string, newScale: [number, number, number]) => {
    setObjects((prevObjects) => {
      return prevObjects.map((obj) => {
        if (obj.id === id) {
          return {
            ...obj,
            scale: newScale,
          };
        }
        return obj;
      });
    });
  }, [setObjects]);

  const handleRotateObject = useCallback((id: string, newRotation: [number, number, number]) => {
    setObjects((prevObjects) =>
      prevObjects.map((obj) =>
        obj.id === id ? { ...obj, rotation: newRotation } : obj
      )
    );
    return [id, newRotation] as [string, [number, number, number]];
  }, [setObjects]);

  const handleToggleShowDimensions = useCallback((id: string) => {
    setShowDimensions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, [setShowDimensions]);

  const updateQuotePrice = useCallback((id: string, newPrice: number, newScale: [number, number, number]) => {
    setQuote((prevQuote) =>
      prevQuote.map((item) =>
        item.id === id ? { ...item, price: newPrice, scale: newScale } : item
      )
    );
  }, [setQuote]);

  const getSerializableQuote = useCallback(() => {
    return quote.map((item) => ({
      id: item.id,
      url: item.url,
      price: item.price,
      details: item.details,
      position: item.position,
      scale: item.scale,
      texture: item.texture,
      rotation: item.rotation,
    }));
  }, [quote]);

  // Nouvelle fonction handleObjectClick déplacée depuis MaquettePage
  const handleObjectClick = useCallback((
    id: string, 
    viewMode: '3D' | '2D' | 'Blueprint' | 'ObjectOnly',
    is2DView: boolean,
    renderObjectPanel: (selectedObject: ObjectData) => void
  ) => {
    if (viewMode === 'ObjectOnly') {
      setFocusedObjectId(id);
    }
    
    if (is2DView || viewMode === 'ObjectOnly') {
      return;
    }

    const selectedObject = objects.find((obj) => obj.id === id);
    
    if (selectedObject) {
      renderObjectPanel(selectedObject);
    }
  }, [objects, setFocusedObjectId]);

  return {
    handleAddObject,
    handleRemoveObject,
    handleUpdatePosition,
    handleUpdateTexture,
    handleUpdateColor,
    handleUpdateScale,
    handleRotateObject,
    handleToggleShowDimensions,
    updateQuotePrice,
    getSerializableQuote,
    handleObjectClick
  };
}; 

export default useObjects;