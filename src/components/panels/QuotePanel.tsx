import React from 'react';
import { ObjectData } from '../../types/ObjectData';
import { useNavigate } from 'react-router-dom';
import { useMaquetteStore } from '../../store/maquetteStore';

// Fonction utilitaire pour formater les nombres avec des espaces tous les 3 chiffres
const formatNumber = (num: number): string => {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

interface QuotePanelProps {
  quote: ObjectData[];
  setObjects: (objects: ObjectData[] | ((prev: ObjectData[]) => ObjectData[])) => void;
  setQuote: (quote: ObjectData[] | ((prev: ObjectData[]) => ObjectData[])) => void;
  getSerializableQuote: () => any[];
  handleRemoveObject: (id: string) => void;
  devisMetadata?: any; // Métadonnées du devis (info, totals, etc.)
  maquetteObjects?: ObjectData[]; // Tous les objets de la maquette (pour sauvegarde complète)
}

const QuotePanel: React.FC<QuotePanelProps> = ({ 
  quote, 
  setQuote, 
  getSerializableQuote,
  handleRemoveObject,
  devisMetadata,
  maquetteObjects
}) => {
  const navigate = useNavigate();
  const clearMaquette = useMaquetteStore(state => state.clearMaquette);

  const navigateToFullQuote = () => {
    const serializableQuote = getSerializableQuote();
    console.log('🚀 Navigation vers FullQuote avec', serializableQuote.length, 'lignes de devis');
    console.log('📊 Métadonnées à transmettre:', devisMetadata ? 'PRÉSENTES' : 'ABSENTES');
    console.log('🏗️ Objets maquette à transmettre:', maquetteObjects ? maquetteObjects.length : 0, 'objets');
    
    // Préparer les données de maquette pour la sauvegarde
    const maquetteData = maquetteObjects ? {
      objects: maquetteObjects.map((obj: any) => ({
        id: obj.id,
        url: obj.url,
        price: obj.price,
        details: obj.details,
        position: obj.position,
        texture: obj.texture,
        scale: obj.scale,
        rotation: obj.rotation,
        color: obj.color,
        startPoint: obj.startPoint,
        endPoint: obj.endPoint,
        parentScale: obj.parentScale,
        boundingBox: obj.boundingBox,
        faces: obj.faces,
        type: obj.type,
        parametricData: obj.parametricData,
        isBatiChiffrageObject: obj.isBatiChiffrageObject || false,
        quantity: obj.quantity,
        unit: obj.unit
      }))
    } : null;
    
    // Passer les données directement via state au lieu de localStorage
    navigate('/full-quote', { 
      state: { 
        quote: serializableQuote,
        devisData: devisMetadata, // Inclure les métadonnées si disponibles
        maquetteData: maquetteData, // Inclure les données complètes de la maquette
        fromMaquette: true
      } 
    });
  };

  // Fonction pour supprimer uniquement du devis
  const handleQuoteRemoval = (itemId: string) => { 
    setQuote(prevQuote => prevQuote.filter(q => q.id !== itemId));
  };

  // Fonction pour supprimer du devis ET de la maquette
  const handleCompleteRemoval = (itemId: string) => { 
    console.log('🎯 QuotePanel.handleCompleteRemoval appelé pour:', itemId);
    console.log('🔗 handleRemoveObject disponible:', typeof handleRemoveObject);
    
    // Déléguer complètement à handleRemoveObject qui gère intelligemment les deux cas
    if (handleRemoveObject) {
      handleRemoveObject(itemId);
    } else {
      console.error('❌ handleRemoveObject n\'est pas défini!');
    }
  };

  // Fonction pour nettoyer complètement la maquette et le devis
  const handleClearAll = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer tous les éléments de la maquette et du devis ?')) {
      clearMaquette();
    }
  };

  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#dc3545',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '500',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const itemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    transition: 'all 0.3s ease'
  };

  const itemContentStyle = {
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
    width: '100%',
    gap: '8px'
  };

  const buttonsContainerStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  };

  const itemTextStyle = {
    flex: 1,
    fontSize: '14px',
    color: '#2D3C54',
    fontWeight: '500',
    lineHeight: '1.4'
  };

  const totalStyle = {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2D3C54',
    textAlign: 'center' as const
  };

  return (
    <div className="quote-panel" style={{
      padding: '20px',
      backgroundColor: '#f8f9fa',
      height: '100%',
      overflowY: 'auto'
          }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: '20px'
      }}>
        <img src={"logo-batidevis-removebg.png"} alt="Logo" style={{
          width: '60px',
          height: 'auto'
        }} />
      </div>
      
      <h2 className="title" style={{
        textAlign: 'center',
        marginBottom: '20px',
        color: '#2D3C54',
        fontSize: '24px',
        fontWeight: 'bold',
        marginTop: '40px'
      }}>
        devis
      </h2>
      
      <hr className="hr" style={{
        border: 'none',
        height: '2px',
        backgroundColor: '#2D3C54',
        marginBottom: '20px'
      }} />

      {/* Bouton de nettoyage complet */}
      {quote.length > 0 && (
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'center'
        }}>
          <button 
            onClick={handleClearAll}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#dc3545',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: '500',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#c82333';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#dc3545';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            Nettoyer la maquette
          </button>
          <button 
          onClick={navigateToFullQuote} 
          className="full-quote-button"
          style={{
            
            width: '100%',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          CONSULTER LE DEVIS COMPLET
        </button>
        </div>
      )}

      {quote.length > 0 && (
        <div style={totalStyle}>
          Total: {formatNumber(quote.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0))} €
        </div>
      )}
      
      {quote.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6c757d',
          fontSize: '14px'
        }}>
          Aucun élément dans le devis
        </div>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          {quote.map((item) => (
            <div key={item.id} style={itemStyle}>
              <div style={itemContentStyle}>
                <div style={itemTextStyle}>
                  {(item.parametricData && item.parametricData.item_details && item.parametricData.item_details.libtech ? item.parametricData.item_details.libtech : item.details).split('_').map((part: string, index: number) => (
                    <div key={index} style={{ marginBottom: index < (item.parametricData && item.parametricData.item_details && item.parametricData.item_details.libtech ? item.parametricData.item_details.libtech : item.details).split('_').length - 1 ? '4px' : '0' }}>
                      {part}
                    </div>
                  ))}
                  <div style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    marginTop: '4px'
                  }}>
                {item.quantity && item.quantity > 1 ? `${item.quantity} x ` : ''}{formatNumber(item.price)} €{item.unit ? `/${item.unit}` : ''} {item.quantity && item.quantity > 1 ? `= ${formatNumber(item.price * item.quantity)} €` : ''}
                  </div>
                </div>
                <div style={buttonsContainerStyle}>
                <button 
                  onClick={() => handleCompleteRemoval(item.id)}
                    style={buttonStyle}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#c82333';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#dc3545';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                    Supprimer du devis et de la maquette
                </button>
                <button 
                  onClick={() => handleQuoteRemoval(item.id)}
                  style={{
                      ...buttonStyle,
                      backgroundColor: '#6c757d'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#5a6268';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#6c757d';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  Supprimer du devis
                </button>
              </div>
            </div>
            </div>
        ))}
        </div>
      )}
      
      {quote.length > 0 && (
        <div style={totalStyle}>
          Total: {formatNumber(quote.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0))} €
        </div>
      )}
      
      <div className="parent-container" style={{
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button 
          onClick={navigateToFullQuote} 
          className="full-quote-button"
          style={{
            width: '100%',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          CONSULTER LE DEVIS COMPLET
        </button>
      </div>
    </div>
  );
};

export default QuotePanel; 