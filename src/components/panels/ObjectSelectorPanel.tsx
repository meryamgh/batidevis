import React, { useEffect, useState } from 'react';
import '../../styles/Controls.css'; 
import ObjectUpload from './ObjectUploadPanel';
import { BACKEND_URL } from '../../config/env';

interface ObjectFile {
    name: string;
    imageUrl: string;
    isBatiChiffrageObject: boolean;
}

interface ObjectSelectorProps {
    showObjectUpload: boolean;
    setShowObjectUpload: (show: boolean) => void;
}

const ObjectSelector: React.FC<ObjectSelectorProps> = ({ showObjectUpload, setShowObjectUpload }) => {
    const [objects, setObjects] = useState<ObjectFile[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchFiles = async () => { 
            try { 
                const response = await fetch(`${BACKEND_URL}/list_files`);
                const data = await response.json();
                if (response.ok) {
                    // is batichiffrage if the file name looks like this : "objname_id.glb or gltf"
                    const newObjects = data.objects || data.files.map((file: string) => ({
                        name: file,
                        imageUrl: `${BACKEND_URL}/previews/${file}`,
                        isBatiChiffrageObject: /^[^_]+_\d+\.(glb|gltf)$/i.test(file)
                    }));
                    setObjects(newObjects);
                    
                    const cacheData = {
                        objects: newObjects,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('objectList', JSON.stringify(cacheData)); 
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
                            // display the name only what is before the first _
                            alt={object.name.split('_')[0]}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-3d.png';
                            }}
                        />
                    </div>
                    <div className="object-name">
                        {object.name.split('_')[0]}
                    </div>
                </div>
            ))}
        </div>
    );

    const buttonStyle = {
        padding: '6px 12px',
        borderRadius: '4px',
        border: '1px solid #ced4da',
        backgroundColor: 'white',
        fontSize: '12px',
        height: '32px',
        color: '#2D3C54',
        textShadow: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0'
    };

    return (
        <div className="object-selector">
            <button 
                className="object-selector-toggle"
                onClick={() => setIsOpen(!isOpen)}
                style={buttonStyle}
            >
                {isOpen ? 'masquer la liste' : 'afficher la liste des objets'}
            </button>
            {isOpen && (
                <div className="object-selector-dropdown">
                    

                    {showObjectUpload && <ObjectUpload onClose={() => setShowObjectUpload(false)} />}

                    {objects.length === 0 ? (
                        <p>Chargement des modèles...</p>
                    ) : (
                        <>
                            <div className="object-category">
                                <h3>OBJETS BATICHIFFRAGE</h3>
                                {(() => {
                                    const batichiffrageObjects = objects.filter(obj => obj.isBatiChiffrageObject); 
                                    return renderObjectGrid(batichiffrageObjects);
                                })()}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ObjectSelector; 