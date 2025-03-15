import React from 'react';
import { ObjectData } from '../../types/ObjectData';
import { useNavigate } from 'react-router-dom';

interface QuotePanelProps {
  quote: ObjectData[];
  setObjects: React.Dispatch<React.SetStateAction<ObjectData[]>>;
  setQuote: React.Dispatch<React.SetStateAction<ObjectData[]>>;
  getSerializableQuote: () => any[];
}

const QuotePanel: React.FC<QuotePanelProps> = ({ 
  quote, 
  setObjects, 
  setQuote, 
  getSerializableQuote 
}) => {
  const navigate = useNavigate();

  const navigateToFullQuote = () => {
    const serializableQuote = getSerializableQuote();
    navigate('/full-quote', { state: { quote: serializableQuote } });
  };

  return (
    <div className="quote-panel">
      <img src={"logo.png"} alt="Top Right" className="top-right-image" />
      <h2 className="title">devis</h2>
      <hr className="hr" />
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {quote.map((item) => (
          <li key={item.id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            padding: '8px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px'
          }}>
            <div>
              {item.details} {item.scale[0]}m, {item.scale[1]}m, {item.scale[2]}m : {item.price} €
            </div>
            <div>
              <button 
                onClick={() => {
                  setObjects(objects => objects.filter(obj => obj.id !== item.id));
                  setQuote(quote => quote.filter(q => q.id !== item.id));
                }}
                style={{
                  marginRight: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Tout supprimer
              </button>
              <button 
                onClick={() => {
                  setQuote(quote => quote.filter(q => q.id !== item.id));
                }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#ffa500',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Supprimer du devis
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p>Total: {quote.reduce((sum, item) => sum + item.price, 0)} €</p>
      <div className="parent-container">
        <button onClick={navigateToFullQuote} className="full-quote-button">
          consulter le devis complet
        </button>
      </div>
    </div>
  );
};

export default QuotePanel; 