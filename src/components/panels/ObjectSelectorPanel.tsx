import React, { useEffect, useState } from 'react';
import '../../styles/Controls.css'; 
import ObjectUpload from './ObjectUploadPanel';
import AIGenerationPanel from './AIGenerationPanel';
import { BACKEND_URL } from '../../config/env';
interface ObjectFile {
    name: string;
    imageUrl: string;
}

interface ObjectSelectorProps {
    showObjectUpload: boolean;
    setShowObjectUpload: (show: boolean) => void;
    handleObjectGenerated: (objectUrl: string) => void;
}

const ObjectSelector: React.FC<ObjectSelectorProps> = ({ showObjectUpload, setShowObjectUpload, handleObjectGenerated }) => {
    const [objects, setObjects] = useState<ObjectFile[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [showAIGeneration, setShowAIGeneration] = useState(false);

    useEffect(() => {
        const fetchFiles = async () => {
            console.log("Début de fetchFiles");
            try {
                // Vérifier si les données sont déjà en cache
                const cachedData = localStorage.getItem('objectList');
                console.log("Données en cache:", cachedData ? "présentes" : "absentes");
                
                // if (cachedData) {
                //     try {
                //         const parsedData = JSON.parse(cachedData);
                //         const cacheAge = Date.now() - parsedData.timestamp;
                //         console.log("Âge du cache:", Math.round(cacheAge / 1000 / 60), "minutes");
                        
                //         // Vérifier si le cache date de moins de 24 heures
                //         if (parsedData.timestamp && cacheAge < 86400000) {
                //             console.log("Utilisation des données en cache");
                //             setObjects(parsedData.objects);
                //             return;
                //         } else {
                //             console.log("Cache expiré, nouvelle requête nécessaire");
                //         }
                //     } catch (e) {
                //         console.error("Erreur lors de la lecture du cache:", e);
                //     }
                // }

                console.log("Récupération des données depuis le serveur");
                const response = await fetch(`${BACKEND_URL}/list_files`);
                const data = await response.json();
                if (response.ok) {
                    const newObjects = data.objects || data.files.map((file: string) => ({
                        name: file,
                        imageUrl: `${BACKEND_URL}/previews/${file}`
                    }));
                    setObjects(newObjects);
                    
                    // Mettre en cache les nouvelles données
                    const cacheData = {
                        objects: newObjects,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('objectList', JSON.stringify(cacheData));
                    console.log("Nouvelles données mises en cache");
                } else {
                    console.error("Error fetching files:", data.error);
                }
            } catch (error) {
                console.error("Error:", error);
            }
        };

        fetchFiles();
    }, []);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, file: string) => {
        e.dataTransfer.setData('text/plain', `${BACKEND_URL}/files/${file}`);
    };

    return (
        <div className="object-selector">
            <button 
                className="object-selector-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? 'Masquer la liste' : 'Afficher la liste des objets'}
            </button>
            {isOpen && (
                <div className="object-selector-dropdown">
                    <button
        onClick={() => setShowObjectUpload(true)}
        className="bouton"
      >
        Upload 3D Object
      </button>
      <button 
        onClick={() => setShowAIGeneration(true)}
        className="bouton ai-button"
        title="Générer un objet 3D avec l'IA"
      >
        Générer votre objet 3D avec l'IA
      </button>

      {showAIGeneration && (
        <AIGenerationPanel 
          onClose={() => setShowAIGeneration(false)} 
          onObjectGenerated={handleObjectGenerated}
        />
      )}

      {showObjectUpload && <ObjectUpload onClose={() => setShowObjectUpload(false)} />}

                    {objects.length === 0 ? (
                        <p>Chargement des modèles...</p>
                    ) : (
                        <div className="object-selector-grid">
                            {objects.map((object, index) => (
                                <div
                                    key={index}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, object.name)}
                                    className="object-selector-item"
                                    style={{ cursor: 'grab' }}
                                >
                                    <div className="object-preview">
                                        <img 
                                            src={object.imageUrl} 
                                            alt={object.name.replace(".gltf", "").replace(".glb", "")}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = '/placeholder-3d.png'; // Image par défaut si l'image n'est pas trouvée
                                            }}
                                        />
                                    </div>
                                    <div className="object-name">
                                        {object.name.replace(".gltf", "").replace(".glb", "")}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ObjectSelector; 