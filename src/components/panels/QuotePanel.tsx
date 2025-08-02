import React from 'react';
import { ObjectData } from '../../types/ObjectData';
import { useNavigate } from 'react-router-dom';

interface QuotePanelProps {
  quote: ObjectData[];
  setObjects: (objects: ObjectData[] | ((prev: ObjectData[]) => ObjectData[])) => void;
  setQuote: (quote: ObjectData[] | ((prev: ObjectData[]) => ObjectData[])) => void;
  getSerializableQuote: () => any[];
  handleRemoveObject: (id: string) => void;
}

const QuotePanel: React.FC<QuotePanelProps> = ({ 
  quote, 
  setQuote, 
  getSerializableQuote,
  handleRemoveObject
}) => {
  const navigate = useNavigate();

  const navigateToFullQuote = () => {
    const serializableQuote = getSerializableQuote();
    navigate('/full-quote', { state: { quote: serializableQuote } });
  };

  // Fonction pour supprimer uniquement du devis
  const handleQuoteRemoval = (itemId: string) => {
    console.log('handleQuoteRemoval appelé avec id:', itemId);
    setQuote(prevQuote => prevQuote.filter(q => q.id !== itemId));
  };

  // Fonction pour supprimer du devis ET de la maquette
  const handleCompleteRemoval = (itemId: string) => {
    console.log('handleCompleteRemoval appelé avec id:', itemId);
    setQuote(prevQuote => prevQuote.filter(q => q.id !== itemId));
    handleRemoveObject(itemId);
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
        <img src={"logo.png"} alt="Logo" style={{
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
                  {(item.parametricData ? item.parametricData.item_details.libtech : item.details).split('_').map((part: string, index: number) => (
                    <div key={index} style={{ marginBottom: index < (item.parametricData ? item.parametricData.item_details.libtech : item.details).split('_').length - 1 ? '4px' : '0' }}>
                      {part}
                    </div>
                  ))}
                  <div style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    marginTop: '4px'
                  }}>
                {item.price.toFixed(2)} €
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
          Total: {quote.reduce((sum, item) => sum + item.price, 0).toFixed(2)} €
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