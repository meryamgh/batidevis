import React, { useState } from 'react';
import { useTextures } from '../../services/TextureService';
import '../../styles/TexturePanel.css';

interface TexturePanelProps {
  onSelectTexture: (textureUrl: string) => void;
  selectedTexture?: string;
  onUploadClick?: () => void;
  setShowUpload: (show: boolean) => void;
}

const TexturePanel: React.FC<TexturePanelProps> = ({ onSelectTexture, selectedTexture, setShowUpload }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { textures, isLoading, error } = useTextures();

  // Fonction pour gérer les erreurs de chargement d'image
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = "/textures/default.jpg"; // Image par défaut en cas d'erreur
    target.onerror = null; // Éviter les boucles infinies
  };

  return (
    <div className={`texture-panel ${isExpanded ? 'expanded' : 'collapsed'}`} style={{
      display: 'none'
    }}>
      <button 
        className="texture-panel-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '◀' : '▶'}
      </button>
      {isExpanded && (
        
        <div className="texture-panel-content">
          <h3>Textures</h3>
          <button
            onClick={() => setShowUpload(true)}
            className="bouton"
          >
            Upload Texture
          </button>
          {isLoading ? (
            <div className="texture-loading">Chargement des textures...</div>
          ) : error ? (
            <div className="texture-error">
              <p>Erreur lors du chargement des textures</p>
              <p className="error-details">{error}</p>
            </div>
          ) : (
            <div className="texture-list">
              {textures.map((texture) => (
                <div
                  key={texture.url}
                  className={`texture-item ${selectedTexture === texture.fullUrl ? 'selected' : ''}`}
                  onClick={() => onSelectTexture(texture.fullUrl)}
                >
                  <img 
                    src={texture.fullUrl} 
                    alt={texture.name}
                    onError={handleImageError}
                  />
                  <span>{texture.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
      )}
    </div>
    
  );
};

export default TexturePanel; 