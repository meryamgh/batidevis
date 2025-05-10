import React, { useEffect, useState } from 'react';
import '../../styles/Controls.css';
import { BACKEND_URL } from '../../config/env';
import ObjectUpload from './ObjectUploadPanel';

interface ObjectFile {
    name: string;
    imageUrl: string;
    isBatiChiffrageObject: boolean;
}

interface DecorativeObjectSelectorProps {
    showObjectUpload: boolean;
    setShowObjectUpload: (show: boolean) => void;
    handleObjectGenerated: (objectUrl: string) => void;
}

const DecorativeObjectSelector: React.FC<DecorativeObjectSelectorProps> = ({ 
    showObjectUpload, 
    setShowObjectUpload, 
    handleObjectGenerated 
}) => {
    const [objects, setObjects] = useState<ObjectFile[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchFiles = async () => {
            console.log("Début de fetchFiles pour objets décoratifs");
            try {
                const response = await fetch(`${BACKEND_URL}/list_files`);
                const data = await response.json();
                if (response.ok) {
                    const newObjects = data.objects || data.files.map((file: string) => ({
                        name: file,
                        imageUrl: `${BACKEND_URL}/previews/${file}`,
                        isBatiChiffrageObject: /^[^_]+_\d+\.(glb|gltf)$/i.test(file)
                    }));
                    // Ne garder que les objets décoratifs
                    const decorativeObjects = newObjects.filter((obj: ObjectFile) => !obj.isBatiChiffrageObject);
                    setObjects(decorativeObjects);
                    console.log("Objets décoratifs chargés:", decorativeObjects);
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

    const renderObjectGrid = (objects: ObjectFile[]) => (
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
                                target.src = '/placeholder-3d.png';
                            }}
                        />
                    </div>
                    <div className="object-name">
                        {object.name.replace(".gltf", "").replace(".glb", "")}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="object-selector decorative">
            <button 
                className="object-selector-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? 'Masquer les objets décoratifs' : 'Afficher les objets décoratifs'}
            </button>
            {isOpen && (
                <div className="object-selector-dropdown">
                    <button
                        onClick={() => setShowObjectUpload(true)}
                        className="bouton"
                    >
                        Upload Objet Décoratif
                    </button>

                    {showObjectUpload && <ObjectUpload onClose={() => setShowObjectUpload(false)} />}

                    {objects.length === 0 ? (
                        <p>Chargement des objets décoratifs...</p>
                    ) : (
                        renderObjectGrid(objects)
                    )}
                </div>
            )}
        </div>
    );
};

export default DecorativeObjectSelector; 