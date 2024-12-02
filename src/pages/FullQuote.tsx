import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

type QuoteItem = {
    id: number;
    price: number;
    details: string;
};

type AggregatedQuoteItem = {
    details: string;
    price: number;
    quantity: number;
};

const FullQuote: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const quote: QuoteItem[] = location.state?.quote || []; 

    const aggregatedQuote: AggregatedQuoteItem[] = quote.reduce((acc, item) => {
        const existingItem = acc.find(
            (i) => i.details === item.details && i.price === item.price
        );

        if (existingItem) {
            existingItem.quantity += 1; 
        } else {
            acc.push({ details: item.details, price: item.price, quantity: 1 }); 
        }

        return acc;
    }, [] as AggregatedQuoteItem[]);

    const total = aggregatedQuote.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleBack = () => {
        navigate('/', { state: { quote } }); 
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Devis Complet</h1>
            <div
                style={{
                    background: '#f4f4f4',
                    padding: '20px',
                    borderRadius: '8px',
                    maxWidth: '800px',
                    marginBottom: '20px',
                }}
            >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'left' }}>Description</th>
                            <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'center' }}>Qtn</th>
                            <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'right' }}>Price (U)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {aggregatedQuote.map((item, index) => (
                            <tr key={index}>
                                <td style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>{item.details}</td>
                                <td style={{ borderBottom: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                    {item.quantity}
                                </td>
                                <td style={{ borderBottom: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                                    {(item.price * item.quantity).toFixed(2)} €
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>Total</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}></td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{total.toFixed(2)} €</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <button
                onClick={handleBack}
                style={{
                    padding: '10px 20px',
                    background: '#007BFF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                }}
            >
                Retour
            </button>
        </div>
    );
};

export default FullQuote;
