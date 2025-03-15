import React from 'react';
import ObjectSelector from './ObjectSelectorPanel';
import TextureUpload from './TextureUploadPanel';
import ObjectUpload from './ObjectUploadPanel';

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
  objects: any[];
  creatingWallMode: boolean;
  setCreatingWallMode: React.Dispatch<React.SetStateAction<boolean>>;
  is2DView: boolean;
  handleAddObject: (url: string) => Promise<void>;
  showQuotePanel: boolean;
  toggleQuotePanel: () => void;
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
  toggleQuotePanel
}) => {
  return (
    <div className="banner">
      {is2DView && (
        <button onClick={() => setCreatingWallMode(!creatingWallMode)}>
          {creatingWallMode ? 'terminer l\'ajout de mur' : 'ajouter un mur en 2D'}
        </button>
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
    </div>
  );
};

export default Toolbar; 