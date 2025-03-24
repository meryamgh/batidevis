import React from 'react';
import ObjectSelector from './ObjectSelectorPanel';
import TextureUpload from './TextureUploadPanel';
import ObjectUpload from './ObjectUploadPanel';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import * as THREE from 'three';
import { FacesData, ObjectData } from '../../types/ObjectData';

interface ToolbarProps {
  viewMode: '3D' | '2D' | 'Blueprint' | 'ObjectOnly';
  setViewMode: React.Dispatch<React.SetStateAction<'3D' | '2D' | 'Blueprint' | 'ObjectOnly'>>;
  setShowNavigationHelp: React.Dispatch<React.SetStateAction<boolean>>;
  setShowUpload: React.Dispatch<React.SetStateAction<boolean>>;
  setShowObjectUpload: React.Dispatch<React.SetStateAction<boolean>>;
  showUpload: boolean;
  showObjectUpload: boolean;
  setShowRoomConfig: React.Dispatch<React.SetStateAction<boolean>>;
  addNewFloor: () => void;
  currentFloor: number;
  objects: ObjectData[];
  creatingWallMode: boolean;
  setCreatingWallMode: React.Dispatch<React.SetStateAction<boolean>>;
  is2DView: boolean;
  handleAddObject: (url: string) => Promise<void>;
  showQuotePanel: boolean;
  toggleQuotePanel: () => void;
  isCreatingSurface: boolean;
  setIsCreatingSurface: React.Dispatch<React.SetStateAction<boolean>>;
  reconstructMaquette: () => Promise<void>;
}

interface ExportedObjectData {
    id: string;
    url: string;
    position: [number, number, number];
    scale: [number, number, number];
    rotation: [number, number, number];
    texture?: string;
    faces?: FacesData;
    type?: 'wall' | 'floor' | 'object';
    color?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  setViewMode,
  setShowNavigationHelp,
  setShowUpload,
  setShowObjectUpload,
  showUpload,
  showObjectUpload,
  setShowRoomConfig,
  addNewFloor,
  currentFloor,
  objects,
  creatingWallMode,
  setCreatingWallMode,
  is2DView,
  handleAddObject,
  showQuotePanel,
  toggleQuotePanel,
  isCreatingSurface,
  setIsCreatingSurface,
  reconstructMaquette
}) => {
  const handleExport = async () => {
    const exportData = {
        objects: objects.map(obj => ({
            id: obj.id,
            url: obj.url,
            position: [
                obj.position[0] * 2,
                obj.position[1] * 2,
                obj.position[2] * 2
            ],
            scale: obj.scale,
            rotation: obj.rotation || [0, 0, 0],
            texture: obj.texture,
            faces: obj.faces,
            type: obj.type,
            color: obj.color
        }))
    };

    // Envoyer au backend
    try {
        const response = await fetch('http://127.0.0.1:5000/save-maquette', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(exportData)
        });
        
        if (!response.ok) throw new Error('Erreur lors de la sauvegarde');
        
        const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'maquette.json';
        link.click();
    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
    }
  };

  return (
    <div className="banner">
      {is2DView && (
        <>
          <button onClick={() => setCreatingWallMode(!creatingWallMode)}>
            {creatingWallMode ? 'terminer l\'ajout de mur' : 'ajouter un mur en 2D'}
          </button>
          <button 
            onClick={() => setIsCreatingSurface(!isCreatingSurface)}
            className={`bouton ${isCreatingSurface ? 'active' : ''}`}
          >
            {isCreatingSurface ? 'Terminer la surface' : 'Créer une surface'}
          </button>
        </>
      )}

      <select 
        value={viewMode}
        onChange={(e) => {
          const newViewMode = e.target.value as "3D" | "2D" | "Blueprint" | "ObjectOnly";
          setViewMode(newViewMode);
        }}
      >
        <option value="ObjectOnly">Object Only</option>
        <option value="3D">Vue 3D</option>
        <option value="2D">Vue 2D</option>
        <option value="Blueprint">Mode Blueprint</option>
      </select>

      <button 
        onClick={() => setShowNavigationHelp(true)} 
        className="bouton help-button"
        title="Aide à la navigation"
      >
        ?
      </button> 
      <button
        onClick={() => setShowUpload(true)}
        className="bouton"
      >
        Upload Texture
      </button>

      {showUpload && <TextureUpload onClose={() => setShowUpload(false)} />}

      <button
        onClick={() => setShowObjectUpload(true)}
        className="bouton"
      >
        Upload 3D Object
      </button>

      {showObjectUpload && <ObjectUpload onClose={() => setShowObjectUpload(false)} />}

      <button onClick={() => setShowRoomConfig(true)} className="bouton">
        Générer une pièce
      </button>
      
      {(currentFloor > 0 || objects.length > 0) && (
        <button 
          onClick={addNewFloor} 
          className="bouton"
        >
          Ajouter un étage
        </button>
      )}
      
      <button
        onClick={toggleQuotePanel}
        className="bouton"
        title={showQuotePanel ? "Masquer le panneau de devis" : "Afficher le panneau de devis"}
      >
        {showQuotePanel ? "Masquer devis" : "Afficher devis"}
      </button>
      <ObjectSelector handleAddObject={handleAddObject} />

      <button
        onClick={handleExport}
        className="bouton"
        title="Exporter la maquette au format GLTF"
      >
        Exporter la maquette
      </button>

      <button 
        onClick={reconstructMaquette}
        className="toolbar-button"
        title="Charger la maquette"
      >
        Charger la maquette
      </button>
    </div>
  );
};

export default Toolbar; 