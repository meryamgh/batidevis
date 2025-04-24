import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../config/env';
import '../../styles/ObjectsPanel.css';

interface ObjectFile {
    name: string;
    imageUrl: string;
}

interface ObjectsPanelProps {
    onSelectObject: (objectUrl: string) => void;
    selectedObject?: string;
}

const ObjectsPanel: React.FC<ObjectsPanelProps> = ({ onSelectObject, selectedObject }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [objects, setObjects] = useState<ObjectFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchObjects = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await fetch(`${BACKEND_URL}/list_files`);
                const data = await response.json();
                
                if (response.ok) {
                    const newObjects = data.objects || data.files.map((file: string) => ({
                        name: file,
                        imageUrl: `${BACKEND_URL}/previews/${file}`
                    }));
                    setObjects(newObjects);
                } else {
                    setError(data.error || 'Erreur lors du chargement des objets');
                }
            } catch (error) {
                setError('Erreur lors de la connexion au serveur');
                console.error('Error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchObjects();
    }, []);

    const handleObjectClick = (object: ObjectFile) => {
        onSelectObject(`${BACKEND_URL}/files/${object.name}`);
    };

    return (
        <div className={`objects-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <button 
                className="objects-panel-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? '◀' : '▶'}
            </button>
            
            <div className="objects-panel-content">
                <h3>Objets 3D</h3>
                
                {isLoading ? (
                    <div className="objects-loading">Chargement des objets...</div>
                ) : error ? (
                    <div className="objects-error">
                        <p>{error}</p>
                        <p className="error-details">Veuillez réessayer plus tard.</p>
                    </div>
                ) : (
                    <div className="objects-list">
                        {objects.map((object, index) => (
                            <div
                                key={index}
                                className={`object-item ${selectedObject === `${BACKEND_URL}/files/${object.name}` ? 'selected' : ''}`}
                                onClick={() => handleObjectClick(object)}
                            >
                                <img 
                                    src={object.imageUrl} 
                                    alt={object.name.replace(".gltf", "").replace(".glb", "")}
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/placeholder-3d.png';
                                    }}
                                />
                                <span>{object.name.replace(".gltf", "").replace(".glb", "")}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ObjectsPanel; 