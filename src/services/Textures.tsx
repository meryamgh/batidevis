import React from "react";
import { useTextures } from "./TextureService";
import "../styles/Controls.css";

interface TexturesProps {
  handleAddObject: (url: string) => void;
}

const Textures: React.FC<TexturesProps> = ({ handleAddObject }) => {
  // Utilisation du hook personnalisé pour récupérer les textures
  const { textures, isLoading, error } = useTextures();

  // Fonction pour gérer les erreurs de chargement d'image
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = "textures/Cube_BaseColor.png"; // Image de remplacement en cas d'erreur
    target.onerror = null; // Éviter les boucles infinies
  };

  return (
    <div className="banner">
      {isLoading ? (
        <p className="texture-loading">Chargement des textures...</p>
      ) : error ? (
        <div className="texture-error">
          <p>Erreur lors du chargement des textures</p>
          <p className="error-details">{error}</p>
        </div>
      ) : textures.length === 0 ? (
        <div className="texture-info">
          <p>Aucune texture disponible</p>
        </div>
      ) : (
        <div className="texture-grid">
          {textures.map((texture, index) => (
            <button
              key={index}
              onClick={() => handleAddObject(texture.fullUrl)}
              className="bouton texture-button"
              title={texture.name}
            >
              <img 
                src={texture.fullUrl} 
                alt={texture.name} 
                className="texture-preview-small"
                onError={handleImageError}
              />
              <span>{texture.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Textures;
