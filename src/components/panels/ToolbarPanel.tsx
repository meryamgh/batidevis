import ObjectSelector from './ObjectSelectorPanel';
import {  ObjectData } from '../../types/ObjectData';
import '../../styles/AIGenerationPanel.css';
import { BACKEND_URL } from '../../config/env';
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
 

const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  setViewMode,
  setShowNavigationHelp,
  setShowUpload,
  setShowObjectUpload,
  showObjectUpload,
  setShowRoomConfig,
  addNewFloor,
  currentFloor,
  objects,
  creatingWallMode,
  setCreatingWallMode,
  is2DView,
  handleAddObject,
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
        console.log('🔄 Exportation de la maquette en cours...');
          const response = await fetch(`${BACKEND_URL}/save-maquette`, {
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
        console.log('✅ Maquette exportée avec succès !');
        alert('Maquette exportée avec succès !');
    } catch (error) {
        console.error('❌ Erreur lors de l\'export:', error);
        alert('Erreur lors de l\'exportation de la maquette. Veuillez réessayer.');
    }
  };

  const handleObjectGenerated = async (objectUrl: string) => {
    try {
      await handleAddObject(objectUrl);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'objet généré:', error);
    }
  };

  return (
    <div className="banner">
      

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
        {/* <option value="Blueprint">Mode Blueprint</option> */}
      </select>

      <button 
        onClick={() => setShowNavigationHelp(true)} 
        className="bouton help-button"
        title="Aide à la navigation"
      >
        ?
      </button> 
      {/* <button
        onClick={() => setShowUpload(true)}
        className="bouton"
      >
        Upload Texture
      </button> */}
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

      {/* <button
        onClick={() => setShowObjectUpload(true)}
        className="bouton"
      >
        Upload 3D Object
      </button>

      {showObjectUpload && <ObjectUpload onClose={() => setShowObjectUpload(false)} />}

      <button 
        onClick={() => setShowAIGeneration(true)}
        className="bouton ai-button"
        title="Générer un objet 3D avec l'IA"
      >
        Générer votre objet 3D avec l'IA
      </button>

      {showAIGeneration && (
        <AIGenerationPanel 
          onClose={() => setShowAIGeneration(false)} 
          onObjectGenerated={handleObjectGenerated}
        />
      )} */}

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
      <ObjectSelector showObjectUpload={showObjectUpload} 
      setShowObjectUpload={setShowObjectUpload} 
      handleObjectGenerated={handleObjectGenerated} />
      <button
        onClick={handleExport}
        className="bouton icon-button"
        title="Exporter la maquette au format JSON"
      >
        💾
      </button>

      <button 
        onClick={reconstructMaquette}
        className="toolbar-button icon-button"
        title="Charger la maquette"
      >
        📂
      </button>
    </div>
  );
};

export default Toolbar; 