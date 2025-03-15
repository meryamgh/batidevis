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
  handleAddObject: (url: string) => Promise<void>;
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
  setFocusedObjectId
}: UseObjectsProps): UseObjectsReturn => {

  const handleAddObject = useCallback(async (url: string) => {
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      const extras = gltf.asset?.extras || {};
      const price = extras.price || 0;
      const details = extras.details || 'No details available';
      const newObject: ObjectData = {
        id: uuidv4(),
        url,
        price,
        details,
        position: [0, 0, 0] as [number, number, number],
        gltf: gltf,
        rotation: [0, 0, 0],
        scale: [size.x, size.y, size.z],
        color: '#FFFFFF',
      };
      setObjects((prevObjects) => [...prevObjects, newObject]);
      setQuote((prevQuote) => [...prevQuote, newObject]);
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