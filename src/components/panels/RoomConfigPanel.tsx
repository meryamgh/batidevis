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
      padding: '32px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      zIndex: 1000,
      minWidth: '400px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px'
      }}>
        <br></br>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          color: '#2D3C54',
          fontWeight: '600'
        }}>
          <br></br>
          CONFIGURATION DE LA PIÈCE
        </h3>
        <button 
          onClick={() => setShowRoomConfig(false)}
          style={{
            background: '#f8f9fa',
            border: '1px solid #e9ecef',
            fontSize: '16px',
            cursor: 'pointer',
            color: '#6c757d',
            padding: '6px',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            marginTop: '-4px',
            marginRight: '-8px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#2D3C54';
            e.currentTarget.style.backgroundColor = '#e9ecef';
            e.currentTarget.style.borderColor = '#ced4da';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#6c757d';
            e.currentTarget.style.backgroundColor = '#f8f9fa';
            e.currentTarget.style.borderColor = '#e9ecef';
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <label style={{
            minWidth: '120px',
            fontSize: '14px',
            color: '#2D3C54',
            fontWeight: '500'
          }}>
            Largeur (m):
          </label>
        <input 
          type="number" 
          value={roomConfig.width} 
          onChange={(e) => setRoomConfig(prev => ({...prev, width: Number(e.target.value)}))}
          min="1"
          step="0.5"
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2D3C54'}
            onBlur={(e) => e.target.style.borderColor = '#ced4da'}
        />
      </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <label style={{
            minWidth: '120px',
            fontSize: '14px',
            color: '#2D3C54',
            fontWeight: '500'
          }}>
            Longueur (m):
          </label>
        <input 
          type="number" 
          value={roomConfig.length} 
          onChange={(e) => setRoomConfig(prev => ({...prev, length: Number(e.target.value)}))}
          min="1"
          step="0.5"
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2D3C54'}
            onBlur={(e) => e.target.style.borderColor = '#ced4da'}
        />
      </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <label style={{
            minWidth: '120px',
            fontSize: '14px',
            color: '#2D3C54',
            fontWeight: '500'
          }}>
            Hauteur (m):
          </label>
        <input 
          type="number" 
          value={roomConfig.height} 
          onChange={(e) => setRoomConfig(prev => ({...prev, height: Number(e.target.value)}))}
          min="1"
          step="0.5"
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2D3C54'}
            onBlur={(e) => e.target.style.borderColor = '#ced4da'}
        />
        </div>
      </div>
      
      <div style={{
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        marginBottom: '24px'
      }}>
        <div style={{
          fontSize: '16px',
          color: '#2D3C54',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          Surface totale: <span style={{ color: '#2D3C54' }}>{surfaceM2.toFixed(2)} m²</span>
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'center'
      }}>
        <button 
          onClick={() => setShowRoomConfig(false)}
          style={{
            padding: '10px 20px',
            border: '1px solid #ced4da',
            borderRadius: '6px',
            backgroundColor: 'white',
            color: '#6c757d',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f8f9fa';
            e.currentTarget.style.borderColor = '#adb5bd';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#ced4da';
          }}
        >
          Annuler
        </button>
        <button 
          onClick={generateRoom}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#2D3C54',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1e2a3a'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2D3C54'}
        >
          Créer la pièce
        </button>
      </div>
    </div>
  );
};

export default RoomConfigPanel; 