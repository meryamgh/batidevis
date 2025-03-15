import React, { useEffect, useState } from 'react';
import '../../styles/Controls.css';

interface ObjectSelectorProps {
    handleAddObject: (url: string) => void;
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
                                <button
                                    key={index}
                                    onClick={() => {
                                        handleAddObject(`http://127.0.0.1:5000/files/${file}`);
                                    }}
                                    className="object-selector-item"
                                >
                                    {file.replace(".gltf", "").replace(".glb", "")}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ObjectSelector; 