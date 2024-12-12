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
        <div className="container">
        <header>
          <div className="logo-info">
            <h1>Devo</h1>
          </div>
          <div className="devo-info">
            <h2>Entreprise test</h2>
            <p>
              M. Test Test
              <br />
              10 Rue de la République
              <br />
              69001 Lyon, France
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
            <tr>
              <th>N°</th>
              <th>DÉSIGNATION</th>
              <th>QTÉ</th>
              <th>PRIX U.</th>
              <th>TVA</th>
              <th>TOTAL HT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Déplacement et prise de mesure</td>
              <td>1,00 mm</td>
              <td>100,00 €</td>
              <td>20,00 %</td>
              <td>100,00 €</td>
            </tr>
            <tr>
              <td>2</td>
              <td>
                Fourniture et pose d'une fenêtre oscillo-battante, grand vitrage,
                vantail droit...
              </td>
              <td>1,00 mm</td>
              <td>1 000,00 €</td>
              <td>20,00 %</td>
              <td>1 000,00 €</td>
            </tr>
            <tr>
              <td>3</td>
              <td>Fourniture et pose d'une porte de service...</td>
              <td>1,00 mm</td>
              <td>2 000,00 €</td>
              <td>20,00 %</td>
              <td>2 000,00 €</td>
            </tr>
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
            Méthodes de paiement acceptées : Chèque, Espèces.</p>
        </div>
        <div className="totals">
          <p>Total net HT : 3 100,00 €</p>
          <p>TVA 20,00 % : 620,00 €</p>
          <p>
            <strong>Total TTC : 3 720,00 €</strong>
          </p>
          <p>
            <strong>NET À PAYER : 3 720,00 €</strong>
          </p>
        </div>
        </div>
       
        <footer>
          <p>
            Mention "Reçu avant l'exécution des travaux, bon pour accord", date et
            signature :
          </p>
          <p>...... / ...... / ............</p>
        </footer>
      </div>


    )

{/* <div>
            <table>
                <tr>
                    <h1>
                        DEVO
                    </h1>
                </tr>
                <tr>
                    <table>
                        <tr>Nom de l'entreprise</tr>
                        <tr>Nom du gérant</tr>
                        <tr>Adresse</tr>
                        <tr>Code Postal et Commune</tr>
                        <tr>Ville</tr>
                        <tr>SIREN</tr>
                    </table>
                </tr>
            </table>
        </div> */}
    
    // return (
    //     <div id="conaiter">
    //         <h1>Devis Complet</h1>
    //         <div id="quote">
    //             <table>
    //                 <thead>
    //                     <tr>
    //                         <th>Description</th>
    //                         <th>Qtn</th>
    //                         <th>Price (U)</th>
    //                     </tr>
    //                 </thead>
    //                 <tbody>
    //                     {aggregatedQuote.map((item, index) => (
    //                         <tr key={index}>
    //                             <td>{item.details}</td>
    //                             <td>
    //                                 {item.quantity}
    //                             </td>
    //                             <td>
    //                                 {(item.price * item.quantity).toFixed(2)} €
    //                             </td>
    //                         </tr>
    //                     ))}
    //                 </tbody>
    //                 <tfoot>
    //                     <tr>
    //                         <td>Total</td>
    //                         <td></td>
    //                         <td>{total.toFixed(2)} €</td>
    //                     </tr>
    //                 </tfoot>
    //             </table>
    //         </div>
    //         <button
    //             onClick={handleBack}
    //         >
    //             Retour
    //         </button>
    //     </div>
    // );
};

export default FullQuote;
