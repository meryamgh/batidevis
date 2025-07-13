import ObjectSelector from './ObjectSelectorPanel';
import {  ObjectData } from '../../types/ObjectData';
import '../../styles/AIGenerationPanel.css';
import { BACKEND_URL } from '../../config/env';
import DecorativeObjectSelector from './DecorativeObjectSelector';
import AIGenerationPanel from './AIGenerationPanel';
interface ToolbarProps {
  viewMode: '3D' | '2D' | 'ObjectOnly';
  setViewMode: React.Dispatch<React.SetStateAction<'3D' | '2D' | 'ObjectOnly'>>;
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
  showAIGeneration: boolean;
  setShowAIGeneration: React.Dispatch<React.SetStateAction<boolean>>;
  isOrbitMode: boolean;
  toggleOrbitMode: () => void;
  isCharacterMode: boolean;
  toggleCharacterMode: () => void;
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
  reconstructMaquette,
  showAIGeneration,
  setShowAIGeneration,
  isOrbitMode,
  toggleOrbitMode,
  isCharacterMode,
  toggleCharacterMode
}) => {
  const handleExport = async () => {
    const exportData = {
        objects: objects.map(obj => ({
            id: obj.id,
            url: obj.url,
            price: obj.price,
            details: obj.details,
            position: [
                obj.position[0] * 2,
                obj.position[1] * 2,
                obj.position[2] * 2
            ],
            scale: obj.scale,
            rotation: obj.rotation || [0, 0, 0],
            texture: obj.texture,
            color: obj.color,
            startPoint: obj.startPoint,
            endPoint: obj.endPoint,
            parentScale: obj.parentScale,
            boundingBox: obj.boundingBox,
            faces: obj.faces,
            type: obj.type,
            parametricData: obj.parametricData,
            isBatiChiffrageObject: obj.isBatiChiffrageObject
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
      alert("objectUrl");
      await handleAddObject(objectUrl);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'objet généré:', error);
    }
  };

  const buttonStyle = {
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid #ced4da',
    backgroundColor: 'white',
    fontSize: '14px',
    height: '32px',
    color: '#2D3C54',
    textShadow: 'none'
  };

  const iconButtonStyle = {
    ...buttonStyle,
    minWidth: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  return (
    <div className="banner" style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '8px 16px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #e9ecef'
    }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <select 
          value={viewMode}
          onChange={(e) => {
            const newViewMode = e.target.value as "3D" | "2D" |  "ObjectOnly";
            setViewMode(newViewMode);
          }}
          style={{
            ...buttonStyle,
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232D3C54' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            backgroundSize: '16px',
            paddingRight: '32px'
          }}
        >
          <option value="ObjectOnly">Object Only</option>
          <option value="3D">Vue 3D</option>
          <option value="2D">Vue 2D</option>
        </select>

        <button 
          onClick={() => setShowNavigationHelp(true)} 
          className="bouton help-button"
          title="Aide à la navigation"
          style={iconButtonStyle}
        >
          ?
        </button>

        {/* Boutons de navigation */}
        <button 
          onClick={toggleOrbitMode}
          className={`bouton ${isOrbitMode ? 'active' : ''}`}
          title="Basculer entre mode Orbite et Vol libre (N)"
          style={{
            ...iconButtonStyle,
            backgroundColor: isOrbitMode ? '#e9ecef' : 'white'
          }}
        >
          🎯
        </button>

        <button 
          onClick={toggleCharacterMode}
          className={`bouton ${isCharacterMode ? 'active' : ''}`}
          title="Activer/désactiver le mode Personnage (V)"
          style={{
            ...iconButtonStyle,
            backgroundColor: isCharacterMode ? '#e9ecef' : 'white'
          }}
        >
          👤
        </button> 

        {is2DView && (
          <>
            <button 
              onClick={() => setCreatingWallMode(!creatingWallMode)}
              style={buttonStyle}
            >
              {creatingWallMode ? 'Terminer' : 'Ajouter un mur'}
            </button>
            <button 
              onClick={() => setIsCreatingSurface(!isCreatingSurface)}
              className={`bouton ${isCreatingSurface ? 'active' : ''}`}
              style={{
                ...buttonStyle,
                backgroundColor: isCreatingSurface ? '#e9ecef' : 'white'
              }}
            >
              {isCreatingSurface ? 'Terminer' : 'Créer une surface'}
            </button>
          </>
        )}

        <button 
          onClick={() => setShowRoomConfig(true)} 
          className="bouton"
          style={buttonStyle}
        >
          Générer une pièce
        </button>
        
        {(currentFloor > 0 || objects.length > 0) && (
          <button 
            onClick={addNewFloor} 
            className="bouton"
            style={buttonStyle}
          >
            Ajouter un étage
          </button>
        )}
        <ObjectSelector showObjectUpload={showObjectUpload} 
        setShowObjectUpload={setShowObjectUpload} 
        handleObjectGenerated={handleObjectGenerated} />
        <DecorativeObjectSelector showObjectUpload={showObjectUpload} 
        setShowObjectUpload={setShowObjectUpload} 
        handleObjectGenerated={handleObjectGenerated} />
      </div>

      <button 
          onClick={() => setShowAIGeneration(true)} 
          className="bouton"
          style={buttonStyle}
        >
          Générer un objet 3D avec l'IA
        </button>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={handleExport}
          className="bouton icon-button"
          title="Exporter la maquette au format JSON"
          style={iconButtonStyle}
        >
          💾
        </button>

        <button 
          onClick={reconstructMaquette}
          className="toolbar-button icon-button"
          title="Charger la maquette"
          style={iconButtonStyle}
        >
          📂
        </button>
      </div>
      
      {showAIGeneration && (
        <AIGenerationPanel
          onClose={() => setShowAIGeneration(false)}
          onObjectGenerated={handleObjectGenerated}
        />
      )}
    </div>
  );
};

export default Toolbar; 