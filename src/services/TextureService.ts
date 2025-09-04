import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../config/env';
// Type pour les textures
export interface TextureItem {
  url: string;
  name: string;
  fullUrl: string;
}

// Type pour la réponse API
interface TextureApiItem {
  filename: string;
  url: string;
  last_modified: number;
  size: number;
}

// Fonction pour formater le nom d'une texture
const formatTextureName = (filename: string): string => {
  // Supprimer l'extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  // Remplacer les underscores et tirets par des espaces
  const nameWithSpaces = nameWithoutExt.replace(/[_-]/g, ' ');
  
  // Mettre en majuscule la première lettre de chaque mot
  return nameWithSpaces.replace(/\b\w/g, (char) => char.toUpperCase());
};

// Fonction pour récupérer les textures depuis l'API
export const fetchTextures = async (): Promise<TextureItem[]> => {
  try { 
        const response = await fetch(`${BACKEND_URL}/api/textures`, {
      method: "GET", 
      headers: {
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();
     
    
    if (response.ok) {
      // Format spécifique basé sur la réponse partagée par l'utilisateur
      if (data.textures && Array.isArray(data.textures)) {
        


        
        return data.textures.map((item: TextureApiItem) => {
          const filename = item.filename || item.url.split('/').pop() || 'Texture';

          return {
              // Remplace directement l'URL publique par ton API Flask en proxy
              url: `${BACKEND_URL}/api/textures/${filename}`,
              name: formatTextureName(filename),
              fullUrl: `${BACKEND_URL}/api/textures/${filename}`
          };
      });
      }
      
      // Aucun format reconnu
      console.error("Format de réponse API non reconnu:", data);
      return [];
    } else {
      console.error("Error fetching textures:", data.error);
      return [];
    }
  } catch (error) {
    console.error("Error fetching textures:", error);
    return [];
  }
};

// Hook personnalisé pour utiliser les textures
export const useTextures = () => {
  const [textures, setTextures] = useState<TextureItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTextures = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const textureItems = await fetchTextures();
        setTextures(textureItems);
      } catch (err) {
        setError("Erreur lors du chargement des textures");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTextures();
  }, []);

  return { textures, isLoading, error };
};

// Fonction pour obtenir le nom d'une texture à partir de son URL
export const getTextureNameFromUrl = (url: string): string => {
  return url.split('/').pop()?.replace(/\.[^/.]+$/, "") || url;
};
 