import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const QuotePage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get data passed from the HomePage
  const { color, price } = location.state || { color: '#000000', price: 0 };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Generated Quote</h1>
      <div
        style={{
          padding: '20px',
          background: '#f4f4f4',
          borderRadius: '8px',
          maxWidth: '400px',
        }}
      >
        <p><strong>Color:</strong> <span style={{ color }}>{color}</span></p>
        <p><strong>Price:</strong> {price.toFixed(2)} U</p>
        <p><strong>Description:</strong> Percement d'une ouverture pour porte-fenêtre 120 x 215 ht dans mur ép. &lt; 0.25 m en agglomérés béton.</p>
      </div>
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: '#007BFF',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Back to Edit
      </button>
    </div>
  );
};

export default QuotePage;
