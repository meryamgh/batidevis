import React, { useState, useEffect } from 'react';
import { ObjectData, ObjectGroup } from '../../types/ObjectData';
import { v4 as uuidv4 } from 'uuid';
import '../../styles/MultiSelectionPanel.css';

interface MultiSelectionPanelProps {
    selectedObjects: ObjectData[];
    onCopyObjects: (objectGroup: ObjectGroup) => void;
    onPasteObjects: (objectGroup: ObjectGroup, targetPosition: [number, number, number]) => void;
    onClearSelection: () => void;
    onRemoveSelectedObjects: () => void;
    onMoveSelectedObjects: () => void;
    onRotateSelectedObjects: (rotation: [number, number, number]) => void;
    onUpdateSelectedObjectsScale: (scale: [number, number, number]) => void;
    clipboard: ObjectGroup | null;
}

const MultiSelectionPanel: React.FC<MultiSelectionPanelProps> = ({
    selectedObjects,
    onCopyObjects,
    onPasteObjects,
    onClearSelection,
    onRemoveSelectedObjects,
    onMoveSelectedObjects,
    onRotateSelectedObjects,
    onUpdateSelectedObjectsScale,
    clipboard
}) => {
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionBox, setSelectionBox] = useState<{
        start: [number, number] | null;
        end: [number, number] | null;
    }>({ start: null, end: null });

    // Calculer la position centrale des objets sélectionnés
    const centerPosition: [number, number, number] = React.useMemo(() => {
        if (selectedObjects.length === 0) return [0, 0, 0];
        
        const sumX = selectedObjects.reduce((sum, obj) => sum + obj.position[0], 0);
        const sumY = selectedObjects.reduce((sum, obj) => sum + obj.position[1], 0);
        const sumZ = selectedObjects.reduce((sum, obj) => sum + obj.position[2], 0);
        
        return [
            sumX / selectedObjects.length,
            sumY / selectedObjects.length,
            sumZ / selectedObjects.length
        ];
    }, [selectedObjects]);

    // Créer un groupe d'objets avec leurs positions relatives
    const createObjectGroup = (): ObjectGroup => {
        const relativePositions = new Map<string, [number, number, number]>();
        
        selectedObjects.forEach(obj => {
            const relativePos: [number, number, number] = [
                obj.position[0] - centerPosition[0],
                obj.position[1] - centerPosition[1],
                obj.position[2] - centerPosition[2]
            ];
            relativePositions.set(obj.id, relativePos);
        });

        return {
            id: uuidv4(),
            objects: selectedObjects,
            centerPosition,
            relativePositions
        };
    };

    // Fonction pour copier les objets sélectionnés
    const handleCopy = () => {
        if (selectedObjects.length === 0) return;
        
        const objectGroup = createObjectGroup();
        onCopyObjects(objectGroup);
    };

    // Fonction pour coller les objets du presse-papiers
    const handlePaste = () => {
        if (!clipboard) return;
        
        // Calculer une nouvelle position pour le groupe (légèrement décalée)
        const newCenterPosition: [number, number, number] = [
            centerPosition[0] + 2,
            centerPosition[1],
            centerPosition[2] + 2
        ];
        
        onPasteObjects(clipboard, newCenterPosition);
    };

    // Fonction pour supprimer tous les objets sélectionnés
    const handleRemoveAll = () => {
        onRemoveSelectedObjects();
    };

    // Fonction pour déplacer tous les objets sélectionnés
    const handleMoveAll = () => {
        onMoveSelectedObjects();
    };

    // Fonction pour faire pivoter tous les objets sélectionnés
    const handleRotateAll = () => {
        const currentRotation = selectedObjects[0]?.rotation || [0, 0, 0];
        const newRotation: [number, number, number] = [
            currentRotation[0],
            (currentRotation[1] + Math.PI / 2) % (Math.PI * 2),
            currentRotation[2]
        ];
        onRotateSelectedObjects(newRotation);
    };

    // Fonction pour redimensionner tous les objets sélectionnés
    const handleScaleAll = (factor: number) => {
        if (selectedObjects.length === 0) return;
        
        const currentScale = selectedObjects[0].scale;
        const newScale: [number, number, number] = [
            currentScale[0] * factor,
            currentScale[1] * factor,
            currentScale[2] * factor
        ];
        onUpdateSelectedObjectsScale(newScale);
    };

    return (
        <div className="multi-selection-panel">
            <div className="panel-header">
                <h3>Sélection multiple ({selectedObjects.length} objets)</h3>
                <button 
                    className="close-button"
                    onClick={onClearSelection}
                    title="Fermer la sélection"
                >
                    ×
                </button>
            </div>

            <div className="selection-info">
                <p>Objets sélectionnés :</p>
                <ul className="selected-objects-list">
                    {selectedObjects.map(obj => (
                        <li key={obj.id} className="selected-object-item">
                            <span className="object-name">{obj.details}</span>
                            <span className="object-position">
                                ({obj.position[0].toFixed(1)}, {obj.position[1].toFixed(1)}, {obj.position[2].toFixed(1)})
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="action-buttons">
                <div className="button-group">
                    <button 
                        className="action-button copy-button"
                        onClick={handleCopy}
                        disabled={selectedObjects.length === 0}
                        title="Copier les objets sélectionnés"
                    >
                        📋 Copier
                    </button>
                    <button 
                        className="action-button paste-button"
                        onClick={handlePaste}
                        disabled={!clipboard}
                        title="Coller les objets du presse-papiers"
                    >
                        📄 Coller
                    </button>
                </div>

                <div className="button-group">
                    <button 
                        className="action-button move-button"
                        onClick={handleMoveAll}
                        disabled={selectedObjects.length === 0}
                        title="Déplacer tous les objets sélectionnés"
                    >
                        🚚 Déplacer
                    </button>
                    <button 
                        className="action-button rotate-button"
                        onClick={handleRotateAll}
                        disabled={selectedObjects.length === 0}
                        title="Faire pivoter tous les objets de 90°"
                    >
                        🔄 Pivoter
                    </button>
                </div>

                <div className="button-group">
                    <button 
                        className="action-button scale-button"
                        onClick={() => handleScaleAll(1.2)}
                        disabled={selectedObjects.length === 0}
                        title="Agrandir tous les objets de 20%"
                    >
                        ⬆️ Agrandir
                    </button>
                    <button 
                        className="action-button scale-button"
                        onClick={() => handleScaleAll(0.8)}
                        disabled={selectedObjects.length === 0}
                        title="Rétrécir tous les objets de 20%"
                    >
                        ⬇️ Rétrécir
                    </button>
                </div>

                <div className="button-group">
                    <button 
                        className="action-button delete-button"
                        onClick={handleRemoveAll}
                        disabled={selectedObjects.length === 0}
                        title="Supprimer tous les objets sélectionnés"
                    >
                        🗑️ Supprimer
                    </button>
                </div>
            </div>

            <div className="clipboard-info">
                {clipboard ? (
                    <div className="clipboard-content">
                        <p>📋 Presse-papiers : {clipboard.objects.length} objets</p>
                        <p>Centre : ({clipboard.centerPosition[0].toFixed(1)}, {clipboard.centerPosition[1].toFixed(1)}, {clipboard.centerPosition[2].toFixed(1)})</p>
                    </div>
                ) : (
                    <p className="clipboard-empty">📋 Presse-papiers vide</p>
                )}
            </div>

            <div className="selection-tips">
                <h4>Conseils :</h4>
                <ul>
                    <li>Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs objets</li>
                    <li>Utilisez "Copier" pour sauvegarder la disposition actuelle</li>
                    <li>Utilisez "Coller" pour dupliquer le groupe à un nouvel endroit</li>
                    <li>Les objets conservent leurs positions relatives lors du collage</li>
                </ul>
            </div>
        </div>
    );
};

export default MultiSelectionPanel; 