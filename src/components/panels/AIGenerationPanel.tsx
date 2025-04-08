import React, { useState } from 'react';

interface AIGenerationPanelProps {
  onClose: () => void;
  onObjectGenerated: (objectUrl: string) => void;
}

const AIGenerationPanel: React.FC<AIGenerationPanelProps> = ({ onClose, onObjectGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [objName, setObjName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGenerate = async () => {
    if (!prompt || !objName) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setPreviewImage(null);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/generate_3d_model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          obj_name: objName
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération de l\'objet');
      }

      const result = await response.json();
      
      if (result.ThumbnailPreview) {
        // Convert base64 to image URL
        const imageUrl = `data:image/png;base64,${result.ThumbnailPreview}`;
        setPreviewImage(imageUrl);
        setSuccess(true);
        
        // If there's an object URL in the response, pass it to the parent
        if (result.objectUrl) {
          onObjectGenerated(result.objectUrl);
        }
      } else {
        throw new Error('Aucune prévisualisation disponible');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="panel ai-generation-panel">
      <div className="panel-header">
        <h3>Générer un objet 3D avec l'IA</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="panel-content">
        <div className="form-group">
          <label htmlFor="prompt">Description de l'objet:</label>
          <input
            type="text"
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: chaise moderne en bois"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="objName">Nom de l'objet:</label>
          <input
            type="text"
            id="objName"
            value={objName}
            onChange={(e) => setObjName(e.target.value)}
            placeholder="Ex: chair"
          />
        </div>
        
        <button 
          className="generate-button" 
          onClick={handleGenerate}
          disabled={isLoading}
        >
          {isLoading ? 'Génération en cours...' : 'Générer l\'objet'}
        </button>
        
        {error && <div className="error-message">{error}</div>}
        
        {success && (
          <div className="success-message">
            Votre objet a été généré avec succès!
          </div>
        )}
        
        {previewImage && (
          <div className="preview-container">
            <h4>Aperçu:</h4>
            <img src={previewImage} alt="Aperçu de l'objet généré" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AIGenerationPanel; 