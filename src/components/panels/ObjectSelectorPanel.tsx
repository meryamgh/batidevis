import React, { useEffect, useState } from 'react';
import '../../styles/Controls.css';
import * as THREE from 'three';

interface ObjectFile {
    name: string;
    imageUrl: string;
}

interface ObjectSelectorProps {
    handleAddObject: (url: string, event: React.DragEvent<HTMLDivElement>, camera?: THREE.Camera) => Promise<void>;
}

const ObjectSelector: React.FC<ObjectSelectorProps> = ({ handleAddObject }) => {
    const [objects, setObjects] = useState<ObjectFile[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchFiles = async () => {
            console.log("fetchFiles")
            try {
                const response = await fetch("http://127.0.0.1:5000/list_files");
                const data = await response.json();
                if (response.ok) {
                    setObjects(data.objects || data.files.map((file: string) => ({
                        name: file,
                        imageUrl: `http://127.0.0.1:5000/previews/${file}`
                    })));
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
        e.dataTransfer.setData('text/plain', `http://127.0.0.1:5000/files/${file}`);
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