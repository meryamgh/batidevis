import React from 'react';

interface RoomConfigPanelProps {
  roomConfig: {
    width: number;
    length: number;
    height: number;
  };
  setRoomConfig: React.Dispatch<React.SetStateAction<{
    width: number;
    length: number;
    height: number;
  }>>;
  generateRoom: () => void;
  setShowRoomConfig: React.Dispatch<React.SetStateAction<boolean>>;
}

const RoomConfigPanel: React.FC<RoomConfigPanelProps> = ({
  roomConfig,
  setRoomConfig,
  generateRoom,
  setShowRoomConfig
}) => {
  const surfaceM2 = roomConfig.width * roomConfig.length;
  
  return (
    <div className="room-config-panel" style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 0 10px rgba(0,0,0,0.2)',
      zIndex: 1000
    }}>
      <h3>Configuration de la pièce</h3>
      <div>
        <label>Largeur (m): </label>
        <input 
          type="number" 
          value={roomConfig.width} 
          onChange={(e) => setRoomConfig(prev => ({...prev, width: Number(e.target.value)}))}
          min="1"
          step="0.5"
        />
      </div>
      <div>
        <label>Longueur (m): </label>
        <input 
          type="number" 
          value={roomConfig.length} 
          onChange={(e) => setRoomConfig(prev => ({...prev, length: Number(e.target.value)}))}
          min="1"
          step="0.5"
        />
      </div>
      <div>
        <label>Hauteur (m): </label>
        <input 
          type="number" 
          value={roomConfig.height} 
          onChange={(e) => setRoomConfig(prev => ({...prev, height: Number(e.target.value)}))}
          min="1"
          step="0.5"
        />
      </div>
      <div style={{
        marginTop: '15px',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px'
      }}>
        <strong>Surface totale:</strong> {surfaceM2.toFixed(2)} m²
      </div>
      <div style={{marginTop: '20px'}}>
        <button onClick={generateRoom}>Créer la pièce</button>
        <button onClick={() => setShowRoomConfig(false)}>Annuler</button>
      </div>
    </div>
  );
};

export default RoomConfigPanel; 