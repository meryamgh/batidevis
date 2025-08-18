import React, { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../../config/env';

interface AIGenerationPanelProps {
  onClose: () => void;
  onObjectGenerated: (objectUrl: string) => void;
}

interface GenerationStatus {
  status: 'pending' | 'processing' | 'refining' | 'completed' | 'failed';
  message?: string;
  taskId?: string;
}

const AIGenerationPanel: React.FC<AIGenerationPanelProps> = ({ onClose, onObjectGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [desiredFilename, setDesiredFilename] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [generatedFilename, setGeneratedFilename] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const setPromptExample = (text: string, suggestedFilename: string = '') => {
    setPrompt(text);
    if (suggestedFilename) {
      setDesiredFilename(suggestedFilename);
    }
  };

  const startGeneration = async () => {
    if (!prompt) {
      setError('Veuillez remplir la description de l\'objet');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setPreviewImage(null);
    setShowPreview(false);
    setGenerationStatus(null);
    setCurrentTaskId(null);
    setGeneratedFilename(null);
    setProgress(0);

    try {
      const response = await fetch(`${BACKEND_URL}/api/3d/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          art_style: 'realistic'
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'initialisation de la génération');
      }

      const result = await response.json();
      
      if (result.task_id) {
        setCurrentTaskId(result.task_id);
        setGenerationStatus({ status: 'pending', message: 'Génération initialisée...' });
        setProgress(10);
        startPolling(result.task_id);
      } else {
        throw new Error('Aucun identifiant de génération reçu');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setIsLoading(false);
    }
  };

  const startPolling = (taskId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/3d/status/${taskId}`);
        
        if (!response.ok) {
          throw new Error('Erreur lors de la vérification du statut');
        }

        const statusData = await response.json();
        
        if (statusData.status === 'COMPLETED') {
          clearInterval(pollingIntervalRef.current!);
          setGenerationStatus({ status: 'completed', taskId });
          setProgress(100);
          if (statusData.files && statusData.files.glb_url) {
            // Stocker le nom de fichier réel généré
            setGeneratedFilename(statusData.files.glb);
            showDownload(taskId);
          }
        } else if (statusData.status === 'FAILED') {
          clearInterval(pollingIntervalRef.current!);
          setGenerationStatus({ status: 'failed', message: statusData.error || 'Génération échouée' });
          setIsLoading(false);
        } else if (statusData.status === 'REFINING_MODEL') {
          setGenerationStatus({ 
            status: 'refining', 
            message: 'Le modèle est en cours de refinement avec textures et matériaux.' 
          });
          setProgress(70);
        } else if (statusData.status === 'PROCESSING') {
          setGenerationStatus({ 
            status: 'processing', 
            message: 'Le modèle 3D est en cours de génération. Cela peut prendre quelques minutes.' 
          });
          setProgress(40);
        } else {
          setGenerationStatus({ 
            status: 'pending', 
            message: 'Initialisation de la génération...' 
          });
          setProgress(20);
        }
      } catch (err) {
        clearInterval(pollingIntervalRef.current!);
        setError('Erreur lors de la vérification du statut');
        setIsLoading(false);
      }
    }, 5000); // Poll every 5 seconds
  };

  const showDownload = (taskId: string) => {
    setShowPreview(true);
    setIsLoading(false);
    loadPreview(taskId);
  };

  const loadPreview = async (taskId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/3d/preview/${taskId}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setPreviewImage(imageUrl);
      } else {
        console.error('Preview non disponible');
        setPreviewImage(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la preview:', error);
      setPreviewImage(null);
    }
  };

  const handleAccept = async () => {
    if (!currentTaskId || !generatedFilename) {
      setError('Aucun fichier à approuver');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/3d/approve/${generatedFilename}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          desired_filename: desiredFilename ? `${desiredFilename}.glb` : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'acceptation de l\'objet');
      }

      const result = await response.json();
      
      if (result.message) {
        setSuccess(true);
        // Si on a une URL Cloudflare, l'utiliser, sinon utiliser l'URL de téléchargement
        const downloadUrl = result.cloudflare_url || result.download_url;
        if (downloadUrl) {
          onObjectGenerated(downloadUrl);
        }
        // Close panel after a short delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error('Réponse invalide du serveur');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'acceptation');
    }
  };

  const handleReject = async () => {
    if (!currentTaskId || !generatedFilename) {
      setError('Aucun fichier à rejeter');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/3d/reject/${generatedFilename}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Erreur lors du rejet de l\'objet');
      }

      const result = await response.json();
      
      if (result.message) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error('Réponse invalide du serveur');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du rejet');
    }
  };

  const getStatusMessage = () => {
    if (!generationStatus) return '';
    
    switch (generationStatus.status) {
      case 'pending':
        return 'Génération initialisée...';
      case 'processing':
        return generationStatus.message || 'Le modèle 3D est en cours de génération. Cela peut prendre quelques minutes.';
      case 'refining':
        return generationStatus.message || 'Le modèle est en cours de refinement avec textures et matériaux.';
      case 'completed':
        return 'Votre modèle 3D texturé est prêt.';
      case 'failed':
        return generationStatus.message || 'Génération échouée';
      default:
        return '';
    }
  };

  const getStatusTitle = () => {
    if (!generationStatus) return '';
    
    switch (generationStatus.status) {
      case 'pending':
        return 'GÉNÉRATION DÉMARRÉE';
      case 'processing':
        return 'GÉNÉRATION EN COURS...';
      case 'refining':
        return 'AJOUT DES TEXTURES...';
      case 'completed':
        return 'GÉNÉRATION TERMINÉE';
      case 'failed':
        return 'ÉCHEC DE LA GÉNÉRATION';
      default:
        return '';
    }
  };

  return (
    <div className="ai-generation-panel">
      <div className="panel-header">
        <h1>GÉNÉRATEUR 3D</h1>
        <p>Créez des modèles 3D texturés avec l'IA</p>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="panel-content">
        <form onSubmit={(e) => { e.preventDefault(); startGeneration(); }}>
          <div className="form-group">
            <label htmlFor="desiredFilename">Nom du fichier (optionnel) :</label>
            <input
              type="text"
              id="desiredFilename"
              value={desiredFilename}
              onChange={(e) => setDesiredFilename(e.target.value)}
              placeholder="Ex: chaise_moderne, table_salle_manger, etc. (sans extension)"
              disabled={isLoading}
            />
            <small>Si laissé vide, un nom sera généré automatiquement</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="prompt">Description de l'objet à générer :</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Décrivez en détail l'objet que vous voulez générer. Plus la description est précise, meilleur sera le résultat..."
              disabled={isLoading}
              required
            />
          </div>
          
          <button 
            type="submit"
            className="generate-button" 
            disabled={isLoading}
          >
            <span className="btn-text">
              {isLoading ? 'GÉNÉRATION EN COURS...' : 'GÉNÉRER LE MODÈLE 3D'}
            </span>
            {isLoading && <span className="spinner"></span>}
          </button>
        </form>
        
        {error && <div className="error-message">{error}</div>}
        
        {generationStatus && (
          <div className={`status-container status-${generationStatus.status}`}>
            <h3>{getStatusTitle()}</h3>
            <p>{getStatusMessage()}</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {showPreview && (
          <div className="download-section">
            <h4>GÉNÉRATION TERMINÉE</h4>
            
            <div className="preview-section">
              <h5>APERÇU DU MODÈLE GÉNÉRÉ</h5>
              {previewImage ? (
                <img src={previewImage} alt="Aperçu du modèle 3D" />
              ) : (
                <div className="preview-loading">
                  <p>Chargement de l'aperçu...</p>
                </div>
              )}
            </div>
            
            <div className="preview-actions">
              <button 
                className="accept-button" 
                onClick={handleAccept}
              >
                APPROUVER LE FICHIER GLB
              </button>
              <button 
                className="reject-button" 
                onClick={handleReject}
              >
                REJETER LE FICHIER
              </button>
            </div>
          </div>
        )}
        
        {success && (
          <div className="success-message">
            ✅ Votre objet a été accepté et sera téléchargé !
          </div>
        )}

        <div className="example-prompts">
          <h3>💡 Exemples de descriptions</h3>
          <div 
            className="example-prompt"
            onClick={() => setPromptExample('Une chaise en bois moderne avec dossier ergonomique et assise rembourrée', 'chaise_moderne_bois')}
          >
            <strong>Chaise moderne :</strong> Une chaise en bois moderne avec dossier ergonomique et assise rembourrée
          </div>
          <div 
            className="example-prompt"
            onClick={() => setPromptExample('Fabrication et pose d\'un portail ouvrant plein 900 x 2100 mm 1 vantail, comprenant : 2 poteaux 100 x 100 mm, ouvrant avec ossature en tube carré de 50 x 50 mm, remplissage en tôle d\'acier 20/10 décapée, ferrage par pivot réglable avec cavalier, condamnation par serrure à pêne dormant 1/2 tour.', 'portail_ouvrant_metal')}
          >
            <strong>Portail technique :</strong> Fabrication et pose d'un portail ouvrant plein 900 x 2100 mm...
          </div>
          <div 
            className="example-prompt"
            onClick={() => setPromptExample('Une table de salle à manger ronde en marbre blanc avec pied central en métal chromé', 'table_salle_manger_marbre')}
          >
            <strong>Table élégante :</strong> Une table de salle à manger ronde en marbre blanc avec pied central en métal chromé
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIGenerationPanel; 