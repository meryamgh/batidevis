import { useCallback } from 'react';
import { ObjectData, FacesData } from '../types/ObjectData';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useParametricDataService } from '../services/ParametricDataService';


interface UseObjectsProps {
  objects: ObjectData[]; 
  quote: ObjectData[]; 
  setObjects: React.Dispatch<React.SetStateAction<ObjectData[]>>;
  setQuote: React.Dispatch<React.SetStateAction<ObjectData[]>>;
  setIsMoving: React.Dispatch<React.SetStateAction<string | null>>;
  
  setShowDimensions: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
 
  setFocusedObjectId: React.Dispatch<React.SetStateAction<string | null>>;
}

// Interface pour définir les propriétés retournées par le hook
interface UseObjectsReturn {
  handleAddObject: (url: string, event?: React.DragEvent<HTMLDivElement>, camera?: THREE.Camera) => Promise<void>;
  handleAddObjectFromData: (object: ObjectData) => void;
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
    viewMode: '3D' | '2D' | 'ObjectOnly',
    renderObjectPanel: (selectedObject: ObjectData) => void
  ) => void;
  handleUpdateFaces: (id: string, faces: FacesData) => void;
  handleUpdateObjectParametricData: (id: string, object : any) => void;
}

export const useObjects = ({
  objects, 
  quote, 
  setObjects,
  setQuote,
  setIsMoving, 
  setShowDimensions, 
  setFocusedObjectId, 
}: UseObjectsProps): UseObjectsReturn => {

  const { fetchParametricData } = useParametricDataService();

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

      // Stocker les informations de la bounding box
      const boundingBox = {
        min: [box.min.x, box.min.y, box.min.z] as [number, number, number],
        max: [box.max.x, box.max.y, box.max.z] as [number, number, number],
        size: [size.x, size.y, size.z] as [number, number, number],
        center: [center.x, center.y, center.z] as [number, number, number]
      };

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
         
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        // Calculer l'intersection avec le plan
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          // Calculer la position en tenant compte du centre de l'objet et de sa hauteur minimale
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
        boundingBox,
        isBatiChiffrageObject: false
      };

      // Fetch parametric data from the API
      if (details) {
        try {
          const parametricData = await fetchParametricData(details);
          if (parametricData) {
            newObject.parametricData = parametricData;
            const prix = parametricData.item_details.prix;
            newObject.price = prix;
            newObject.isBatiChiffrageObject = true;
            console.log("newObject", newObject.isBatiChiffrageObject);
          }
        } catch (error) {
          console.error('Error fetching parametric data:', error);
        }
      }
      console.log("New object:", newObject);
      
      // Ajouter d'abord au devis
      setQuote(prevQuote => [...prevQuote, newObject]);
      
      // Puis ajouter à la scène
      setObjects(prevObjects => [...prevObjects, newObject]);

    } catch (error) {
      console.error('Error loading GLTF file:', error);
    }
  }, [setQuote, fetchParametricData]);

  const handleAddObjectFromData = useCallback((object: ObjectData) => {
    // Fetch parametric data if not already present
    if (object.details && !object.parametricData) {
      // Use an immediately invoked async function to handle the async operation
      (async () => {
        try {
          const parametricData = await fetchParametricData(object.details);
          console.log("Parametric data:", parametricData);
          if (parametricData) {
            // Update the object with parametric data
            setObjects(prevObjects => prevObjects.map(obj => 
              obj.id === object.id ? { ...obj, parametricData } : obj
            ));
            setQuote(prevQuote => prevQuote.map(obj => 
              obj.id === object.id ? { ...obj, parametricData } : obj
            ));
          }
        } catch (error) {
          console.error('Error fetching parametric data:', error);
        }
      })();
    }

    // Ajouter d'abord au devis
    setQuote(prevQuote => [...prevQuote, object]);
    
    // Puis ajouter à la scène
    setObjects(prevObjects => [...prevObjects, object]);
  }, [setQuote, fetchParametricData]);

  const handleRemoveObject = useCallback((id: string) => {
    setObjects((prevObjects) => prevObjects.filter((obj) => obj.id !== id));
    setQuote((prevQuote) => prevQuote.filter((item) => item.id !== id));
    setIsMoving(null);
  }, [ setQuote, setIsMoving]);

  const handleUpdatePosition = (id: string, position: [number, number, number]) => {
    console.log("Updating position in useObjects:", position);
    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id === id) {
          console.log("Found object to update:", obj.id);
          return { ...obj, position };
        }
        return obj;
      })
    );
  };

  const handleUpdateTexture = (id: string, newTexture: string) => {
    setObjects((prevObjects) =>
      prevObjects.map((obj) => {
        if (obj.id === id) {
          // Si l'objet a des faces spécifiques et est de type mur ou sol
          if ((obj.type === 'wall' || obj.type === 'floor') && obj.faces) {
            const updatedFaces = { ...obj.faces };
            // Pour les sols, on met à jour uniquement la face supérieure
            if (obj.type === 'floor') {
              updatedFaces.top = {
                ...updatedFaces.top,
                texture: newTexture
              };
            }
            // Pour les murs, on met à jour la face sélectionnée (si définie)
            else if (obj.type === 'wall') {
              // Si aucune face n'est sélectionnée, on applique à toutes les faces
              const faces = ['front', 'back', 'left', 'right', 'top', 'bottom'] as const;
              faces.forEach(face => {
                if (updatedFaces[face]) {
                  updatedFaces[face] = {
                    ...updatedFaces[face],
                    texture: newTexture
                  };
                } else {
                  updatedFaces[face] = {
                    texture: newTexture
                  };
                }
              });
            }
            return {
              ...obj,
              faces: updatedFaces
            };
          }
          // Pour les autres objets, on garde le comportement par défaut
          return { ...obj, texture: newTexture };
        }
        return obj;
      })
    );
  };

  const handleUpdateColor = useCallback((id: string, newColor: string) => {
    setObjects((prevObjects) =>
      prevObjects.map((obj) => {
        if (obj.id === id) {
          // Si l'objet a des faces spécifiques et est de type mur ou sol
          if ((obj.type === 'wall' || obj.type === 'floor') && obj.faces) {
            const updatedFaces = { ...obj.faces };
            // Pour les sols, on met à jour uniquement la face supérieure
            if (obj.type === 'floor') {
              updatedFaces.top = {
                ...updatedFaces.top,
                color: newColor
              };
            }
            // Pour les murs, on met à jour la face sélectionnée (si définie)
            else if (obj.type === 'wall') {
              // Si aucune face n'est sélectionnée, on applique à toutes les faces
              const faces = ['front', 'back', 'left', 'right', 'top', 'bottom'] as const;
              faces.forEach(face => {
                if (updatedFaces[face]) {
                  updatedFaces[face] = {
                    ...updatedFaces[face],
                    color: newColor
                  };
                } else {
                  updatedFaces[face] = {
                    color: newColor
                  };
                }
              });
            }
            return {
              ...obj,
              faces: updatedFaces,
              color: newColor // Garder la couleur globale pour la compatibilité
            };
          }
          // Pour les autres objets, on garde le comportement par défaut
          return { ...obj, color: newColor };
        }
        return obj;
      })
    );
  }, [setObjects]);

  const handleUpdateScale = (id: string, newScale: [number, number, number]) => {
    setObjects((prevObjects) => {
      return prevObjects.map((obj) => {
        if (obj.id === id) {
          console.log("Found object to update scale:", obj.id);
          // Vérifier si l'objet a une boundingBox et une échelle existante
          if (obj.boundingBox && obj.scale) {
            // Arrondir les nouvelles valeurs d'échelle au millimètre près
            const roundedScale: [number, number, number] = [
              Math.round(newScale[0] * 1000) / 1000,
              Math.round(newScale[1] * 1000) / 1000,
              Math.round(newScale[2] * 1000) / 1000
            ];

            // Calculate the scale factors with rounded values
            const scaleFactors = [
              roundedScale[0] / obj.scale[0],
              roundedScale[1] / obj.scale[1],
              roundedScale[2] / obj.scale[2]
            ];

            // Update the bounding box with the rounded scale
            const newBoundingBox = {
              min: [
                Math.round(obj.boundingBox.min[0] * scaleFactors[0] * 1000) / 1000,
                Math.round(obj.boundingBox.min[1] * scaleFactors[1] * 1000) / 1000,
                Math.round(obj.boundingBox.min[2] * scaleFactors[2] * 1000) / 1000
              ] as [number, number, number],
              max: [
                Math.round(obj.boundingBox.max[0] * scaleFactors[0] * 1000) / 1000,
                Math.round(obj.boundingBox.max[1] * scaleFactors[1] * 1000) / 1000,
                Math.round(obj.boundingBox.max[2] * scaleFactors[2] * 1000) / 1000
              ] as [number, number, number],
              size: [
                Math.round(obj.boundingBox.size[0] * scaleFactors[0] * 1000) / 1000,
                Math.round(obj.boundingBox.size[1] * scaleFactors[1] * 1000) / 1000,
                Math.round(obj.boundingBox.size[2] * scaleFactors[2] * 1000) / 1000
              ] as [number, number, number],
              center: [
                Math.round(obj.boundingBox.center[0] * scaleFactors[0] * 1000) / 1000,
                Math.round(obj.boundingBox.center[1] * scaleFactors[1] * 1000) / 1000,
                Math.round(obj.boundingBox.center[2] * scaleFactors[2] * 1000) / 1000
              ] as [number, number, number]
            };

            // Calculer le nouveau prix arrondi
            let newPrice = obj.price;
            if (obj.type === 'wall') {
              // Prix basé sur la surface du mur
              newPrice = Math.round(roundedScale[0] * roundedScale[1] * 15);
            } else if (obj.type === 'floor') {
              // Prix basé sur la surface du sol
              newPrice = Math.round(roundedScale[0] * roundedScale[2] * 25);
            }

            return {
              ...obj,
              scale: roundedScale,
              boundingBox: newBoundingBox,
              price: newPrice
            };
          }
          // Si l'objet n'a pas de boundingBox ou d'échelle, simplement mettre à jour l'échelle arrondie
          return {
            ...obj,
            scale: [
              Math.round(newScale[0] * 1000) / 1000,
              Math.round(newScale[1] * 1000) / 1000,
              Math.round(newScale[2] * 1000) / 1000
            ]
          };
        }
        return obj;
      });
    });

    // Mettre à jour le devis avec les nouvelles valeurs arrondies
    setQuote((prevQuote) => {
      return prevQuote.map((item) => {
        if (item.id === id) {
          const matchingObject = objects.find(obj => obj.id === id);
          if (matchingObject) {
            return {
              ...item,
              scale: [
                Math.round(newScale[0] * 1000) / 1000,
                Math.round(newScale[1] * 1000) / 1000,
                Math.round(newScale[2] * 1000) / 1000
              ],
              price: matchingObject.type === 'wall' 
                ? Math.round(newScale[0] * newScale[1] * 15)
                : matchingObject.type === 'floor'
                ? Math.round(newScale[0] * newScale[2] * 25)
                : item.price
            };
          }
        }
        return item;
      });
    });
    console.log("Objects after update:", objects);
  };

  

  const handleRotateObject = (id: string, newRotation: [number, number, number]) => {
    setObjects((prevObjects) =>
      prevObjects.map((obj) =>
        obj.id === id ? { ...obj, rotation: newRotation } : obj
      )
    );
    return [id, newRotation] as [string, [number, number, number]];
  };

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
      isBatiChiffrageObject: item.isBatiChiffrageObject
    }));
  }, [quote]);

  // Nouvelle fonction handleObjectClick déplacée depuis MaquettePage
  const handleObjectClick = useCallback((
    id: string, 
    viewMode: '3D' | '2D' | 'ObjectOnly',
    renderObjectPanel: (selectedObject: ObjectData) => void
  ) => {
    if (viewMode === 'ObjectOnly') {
      setFocusedObjectId(id);
    }

    const selectedObject = objects.find((obj) => obj.id === id);
    
    if (selectedObject) {
      renderObjectPanel(selectedObject);
    }
  }, [objects, setFocusedObjectId]);

  const handleUpdateFaces = useCallback((id: string, faces: FacesData) => {
    console.log('handleUpdateFaces called with:', { id, faces });
    setObjects((prevObjects) =>
      prevObjects.map((obj) => {
        if (obj.id === id) {
          console.log('Updating object faces:', {
            objectId: obj.id,
            oldFaces: obj.faces,
            newFaces: faces
          });
          
          // Créer un nouvel objet faces en ne conservant que les propriétés définies
          const cleanedFaces = Object.entries(faces).reduce((acc, [faceName, faceData]) => {
            // Assertion de type pour faceName
            const face = faceName as keyof FacesData;
            acc[face] = {};
            if (faceData.texture !== undefined) acc[face].texture = faceData.texture;
            if (faceData.color !== undefined && faceData.color !== null) acc[face].color = faceData.color;
            return acc;
          }, {} as FacesData);

          return {
            ...obj,
            faces: cleanedFaces
          };
        }
        return obj;
      })
    );
  }, [setObjects]);


  const handleUpdateObjectParametricData = (id: string, object : any) => {
    const price = object.item_details.prix;
    setObjects((prevObjects) =>
      prevObjects.map((obj) =>
        obj.id === id ? { ...obj, price : price, parametricData : object } : obj
      )
    );
    
    // Mettre à jour également le devis
    setQuote((prevQuote) =>
      prevQuote.map((item) =>
        item.id === id ? { ...item, price : price, parametricData : object } : item
      )
    );
    
    console.log("Objects after update:", object);
  }

  return {
    handleAddObject,
    handleAddObjectFromData,
    handleRemoveObject,
    handleUpdatePosition,
    handleUpdateTexture,
    handleUpdateColor,
    handleUpdateScale,
    handleRotateObject,
    handleToggleShowDimensions,
    updateQuotePrice,
    getSerializableQuote,
    handleObjectClick,
    handleUpdateFaces,
    handleUpdateObjectParametricData
  };
}; 

export default useObjects;