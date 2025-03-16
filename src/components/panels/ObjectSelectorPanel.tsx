import React, { useEffect, useState } from 'react';
import '../../styles/Controls.css';
import * as THREE from 'three';

interface ObjectSelectorProps {
    handleAddObject: (url: string, event: React.DragEvent<HTMLDivElement>, camera?: THREE.Camera) => Promise<void>;
}

const ObjectSelector: React.FC<ObjectSelectorProps> = ({ handleAddObject }) => {
    const [gltfFiles, setGltfFiles] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const response = await fetch("http://127.0.0.1:5000/list_files");
                const data = await response.json();
                if (response.ok) {
                    setGltfFiles(data.files);
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
                    {gltfFiles.length === 0 ? (
                        <p>Chargement des modèles...</p>
                    ) : (
                        <div className="object-selector-list">
                            {gltfFiles.map((file, index) => (
                                <div
                                    key={index}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, file)}
                                    className="object-selector-item"
                                    style={{ cursor: 'grab' }}
                                >
                                    {file.replace(".gltf", "").replace(".glb", "")}
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