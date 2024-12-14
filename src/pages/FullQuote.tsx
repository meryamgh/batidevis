import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/Quote.css';

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
    const initialQuote: QuoteItem[] = location.state?.quote || []; 

    // Agrégation initiale des articles
    const initialAggregated: AggregatedQuoteItem[] = initialQuote.reduce((acc, item) => {
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

    // On stocke la liste agrégée dans un état local pour permettre l'édition
    const [aggregatedQuote, setAggregatedQuote] = useState<AggregatedQuoteItem[]>(initialAggregated);

    // Paramètres de TVA, Acompte (on passe l'acompte en état pour qu'il soit éditable)
    const tvaRate = 0.20; 
    const [acompteRate, setAcompteRate] = useState<number>(0.30);

    // Calculs dérivés
    const totalHT = aggregatedQuote.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalTVA = totalHT * tvaRate;
    const totalTTC = totalHT + totalTVA;
    const acompte = totalTTC * acompteRate;
    const resteAPayer = totalTTC - acompte;

    const handleBack = () => {
        navigate('/', { state: { quote: initialQuote } }); 
    };

    // Gestion de l'édition des cellules du tableau
    const [editingCell, setEditingCell] = useState<{rowIndex: number; field: 'details' | 'quantity' | 'price'} | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const handleCellClick = (rowIndex: number, field: 'details' | 'quantity' | 'price') => {
        setEditingCell({rowIndex, field});
        const currentValue = aggregatedQuote[rowIndex][field].toString();
        setEditValue(currentValue);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditValue(e.target.value);
    };

    const handleBlur = () => {
        saveChanges();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            saveChanges();
        }
    };

    const saveChanges = () => {
        if (!editingCell) return;
        const {rowIndex, field} = editingCell;
        let newValue: string | number = editValue.trim();

        // Pour les champs numériques (price, quantity), on s'assure que ce soit un nombre non négatif
        if (field === 'quantity' || field === 'price') {
            let numericVal = parseFloat(newValue);
            if (isNaN(numericVal) || numericVal < 0) {
                numericVal = 0; // On force à 0 si valeur invalide ou négative
            }
            newValue = numericVal;
        }

        const newAggregated = [...aggregatedQuote];
        // @ts-ignore
        newAggregated[rowIndex][field] = newValue;
        setAggregatedQuote(newAggregated);
        setEditingCell(null);
        setEditValue('');
    };

    // Gestion de l'édition du taux d'acompte
    const [editingAcompte, setEditingAcompte] = useState<boolean>(false);
    const [acompteEditValue, setAcompteEditValue] = useState<string>('');

    const handleAcompteClick = () => {
        setAcompteEditValue((acompteRate * 100).toString());
        setEditingAcompte(true);
    };

    const handleAcompteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAcompteEditValue(e.target.value);
    };

    const handleAcompteBlurOrEnter = () => {
        let val = parseFloat(acompteEditValue);
        if (isNaN(val) || val < 0) {
            val = 0;
        } else if (val > 100) {
            val = 100;
        }
        setAcompteRate(val / 100);
        setEditingAcompte(false);
    };

    const handleAcompteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleAcompteBlurOrEnter();
        }
    };

    return (
      <div>
        <button  className='full-quote-button' onClick={handleBack}>
          retour maquette
        </button>
        <div className="container">
          <header>
            <div className="logo-info">
              <img src={"img/logo.png"} alt="Logo" />
            </div>
            <div className="devo-info">
              <h2>Axe Metal</h2>
              <p>
                Chen Emma
                <br />
                73 Rue Rateau
                <br />
                93120 La Courneuve, France
                <br />
                SIREN : 000.000.000.000
              </p>
            </div>
          </header>
          <div className="infoclient-infodevis">
            <section className="info-client">
              <p>
                20 Rue Leblanc
                <br />
                75015 Paris, France
                <br />
                Tél : 07 68 01 26 95
                <br />
                Email : Devo@gmail.com
              </p>
            </section>
            <section className="devis-header">
              <h2>Devis</h2>
              <p>
                N° D202400001
                <br />
                En date du : 05/10/2024
                <br />
                Valable jusqu'au : 04/12/2024
                <br />
                Début des travaux : 05/10/2024
                <br />
                Durée estimée à : 1 jour
              </p>
            </section>
          </div>

          <table>
            <thead>
              <tr className='blue'>
                <th>N°</th>
                <th>DÉSIGNATION</th>
                <th>QTÉ</th>
                <th>PRIX U.</th>
                <th>TVA</th>
                <th>TOTAL HT</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedQuote.map((item, index) => {
                const isEditingDetails = editingCell?.rowIndex === index && editingCell?.field === 'details';
                const isEditingQuantity = editingCell?.rowIndex === index && editingCell?.field === 'quantity';
                const isEditingPrice = editingCell?.rowIndex === index && editingCell?.field === 'price';

                return (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td 
                      className='size_description' 
                      onClick={() => handleCellClick(index, 'details')}
                    >
                      {isEditingDetails ? 
                        <input
                          type="text"
                          value={editValue}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          onKeyDown={handleKeyDown}
                          autoFocus
                        /> 
                        : item.details}
                    </td>
                    <td
                      onClick={() => handleCellClick(index, 'quantity')}
                    >
                      {isEditingQuantity ? 
                        <input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          onKeyDown={handleKeyDown}
                          autoFocus
                        />
                        : `${item.quantity.toFixed(2)} mm`}
                    </td>
                    <td
                      onClick={() => handleCellClick(index, 'price')}
                    >
                      {isEditingPrice ? 
                        <input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          onKeyDown={handleKeyDown}
                          autoFocus
                        />
                        : `${item.price.toFixed(2)} €`}
                    </td>
                    <td>{(tvaRate * 100).toFixed(2)} %</td>
                    <td>{(item.price * item.quantity).toFixed(2)} €</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="condition-total">
            <div className="payment-info">
              <p><strong>Conditions de paiement :</strong></p>
              <p>
                Acompte = {editingAcompte ? (
                  <input
                    type="number"
                    value={acompteEditValue}
                    onChange={handleAcompteChange}
                    onBlur={handleAcompteBlurOrEnter}
                    onKeyDown={handleAcompteKeyDown}
                    style={{ width: '50px' }}
                    autoFocus
                  />
                ) : (
                  <span onClick={handleAcompteClick} style={{cursor:'pointer',textDecoration:'underline'}}>
                    {(acompteRate * 100).toFixed(2)}%
                  </span>
                )} du total TTC il est de {acompte.toFixed(2)} € TTC à la signature
                <br/>
                Reste à facturer : {resteAPayer.toFixed(2)} € TTC
                <br/>
                Méthodes de paiement acceptées : Chèque, Espèces.
              </p>
            </div>
            <div className="totals">
              <table>
                <tbody>
                  <tr>
                    <td className='size_description_price'><strong>Total net HT</strong></td>
                    <td className='size_price'><strong>{totalHT.toFixed(2)} €</strong></td>
                  </tr>
                  <tr>
                    <td>TVA { (tvaRate * 100).toFixed(2) } %</td>
                    <td>{totalTVA.toFixed(2)} €</td>
                  </tr>
                  <tr>
                    <td><strong>Total TTC</strong></td>
                    <td><strong>{totalTTC.toFixed(2)} €</strong></td>
                  </tr>
                  <tr className='blue'>
                    <td>NET À PAYER</td>
                    <td>{totalTTC.toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <br/>
          <div className='container-signature'>
            <div className='signature'>
              <p>
                Mention "Reçu avant l'exécution des travaux, bon pour accord", date et
                signature :
              </p><br/>
              <p>...... / ...... / ............</p>
            </div>
          </div>
          <br/>
          <footer>
            <p>Les marchandises vendues restent notre propriété, jusqu’au paiement complet de la facture (loi°80.335 du 2 mai 1980)</p>
          </footer>
        </div>
      </div>
    );
};

export default FullQuote;
