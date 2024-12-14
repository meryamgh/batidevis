import React from 'react';
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
    const quote: QuoteItem[] = location.state?.quote || []; 

    // Agrégation des articles
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

    // Calcul du total HT (somme des prix * quantités)
    const totalHT = aggregatedQuote.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Définissez ici votre taux de TVA
    const tvaRate = 0.20; 
    const totalTVA = totalHT * tvaRate;

    // Total TTC
    const totalTTC = totalHT + totalTVA;

    // Net à payer (ici on le considère identique au Total TTC, 
    // mais vous pouvez prévoir une logique différente en cas d'acompte, etc.)
    const netAPayer = totalTTC;

    const handleBack = () => {
        navigate('/', { state: { quote } }); 
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
              {aggregatedQuote.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className='size_description'>{item.details}</td>
                  <td>{item.quantity.toFixed(2)} mm</td>
                  <td>{item.price.toFixed(2)} €</td>
                  <td>{(tvaRate * 100).toFixed(2)} %</td>
                  <td>{(item.price * item.quantity).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="condition-total">
            <div className="payment-info">
              <p><strong>Conditions de paiement :</strong></p>
              <p>
                Acompte de XX.XX€ TTC à la signature
                <br/>
                Reste à facturer : XX € TTC
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
                    <td>{netAPayer.toFixed(2)} €</td>
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
