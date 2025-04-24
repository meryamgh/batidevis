import React, { useState, useEffect } from 'react';
import '../../styles/ObjectControls.css';

interface ObjectControlsProps {
    selectedObjectId: string | null;
    onRemoveObject: (id: string) => void;
    onMoveObject: () => void;
    onRotateObject: (id: string, rotation: [number, number, number]) => void;
    onToggleDimensions: (id: string) => void;
    selectedObject?: any; // Ajout de l'objet sélectionné
}

const ObjectControls: React.FC<ObjectControlsProps> = ({
    selectedObjectId,
    onRemoveObject,
    onMoveObject,
    onRotateObject,
    onToggleDimensions,
    selectedObject
}) => {
    const [currentRotation, setCurrentRotation] = useState<[number, number, number]>([0, 0, 0]);

    // Mettre à jour la rotation quand l'objet sélectionné change
    useEffect(() => {
        if (selectedObject && selectedObject.rotation) {
            setCurrentRotation(selectedObject.rotation);
        }
    }, [selectedObject]);

    const handleRotate90 = () => {
        if (selectedObjectId) {
            const newRotation: [number, number, number] = [
                currentRotation[0],
                (currentRotation[1] + Math.PI / 2) % (Math.PI * 2),
                currentRotation[2]
            ];
            setCurrentRotation(newRotation);
            onRotateObject(selectedObjectId, newRotation);
        }
    };

    return (
        <div className="object-controls">
            <h3>Contrôles d'objet</h3>
            <div className="button-container">
                <button
                    onClick={() => selectedObjectId && onRemoveObject(selectedObjectId)}
                    disabled={!selectedObjectId}
                >
                    Supprimer
                </button>
                <button
                    onClick={onMoveObject}
                    disabled={!selectedObjectId}
                >
                    Déplacer
                </button>
                <button
                    onClick={handleRotate90}
                    disabled={!selectedObjectId}
                >
                    Faire pivoter de 90°
                </button>
                <button
                    onClick={() => selectedObjectId && onToggleDimensions(selectedObjectId)}
                    disabled={!selectedObjectId}
                >
                    Afficher/Masquer dimensions
                </button>
            </div>
        </div>
    );
};

export default ObjectControls; 