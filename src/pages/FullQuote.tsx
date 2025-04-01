import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Quote.css';
import { useMaquetteStore } from '../store/maquetteStore';
import { ObjectData } from '../types/ObjectData';

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
    const navigate = useNavigate();
    const { quote } = useMaquetteStore();

    // Agrégation initiale des articles
    const initialAggregated: AggregatedQuoteItem[] = quote.reduce((acc, item) => {
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

    const [aggregatedQuote, setAggregatedQuote] = useState<AggregatedQuoteItem[]>(initialAggregated);

    // Paramètres de TVA, Acompte
    const tvaRate = 0.20; 
    const [acompteRate, setAcompteRate] = useState<number>(0.30);

    const totalHT = aggregatedQuote.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalTVA = totalHT * tvaRate;
    const totalTTC = totalHT + totalTVA;
    const acompte = totalTTC * acompteRate;
    const resteAPayer = totalTTC - acompte;

    const handleBack = () => {
        navigate('/maquette'); 
    };

    // Gestion de l'édition des cellules du tableau de produits
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
        saveCellChanges();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            saveCellChanges();
        }
    };

    const saveCellChanges = () => {
        if (!editingCell) return;
        const {rowIndex, field} = editingCell;
        let newValue: string | number = editValue.trim();

        // Pour les champs numériques
        if (field === 'quantity' || field === 'price') {
            let numericVal = parseFloat(newValue);
            if (isNaN(numericVal) || numericVal < 0) {
                numericVal = 0; 
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

    // Gestion du logo modifiable
    const [logoSrc, setLogoSrc] = useState<string>("logo.png");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogoClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const newLogo = e.target.files[0];
            const objectUrl = URL.createObjectURL(newLogo);
            setLogoSrc(objectUrl);
        }
    };

    // Liste des champs textuels à rendre modifiables
    // Informations BatiDevis
    const [devoTitle, setDevoTitle] = useState<string>('BatiDevis');
    const [devoName, setDevoName] = useState<string>('Chen Emma');
    const [devoAddress, setDevoAddress] = useState<string>('73 Rue Rateau');
    const [devoCity, setDevoCity] = useState<string>('93120 La Courneuve, France');
    const [devoSiren, setDevoSiren] = useState<string>('SIREN : 000.000.000.000');

    // Informations client
    const [societeBatiment, setSocieteBatiment] = useState<string>('Société Bâtiment');
    const [clientAdresse, setClientAdresse] = useState<string>('20 rue le blanc');
    const [clientCodePostal, setClientCodePostal] = useState<string>('75013 Paris');
    const [clientTel, setClientTel] = useState<string>('0678891223');
    const [clientEmail, setClientEmail] = useState<string>('sociétébatiment@gmail.com');

    // Informations de devis
    const [devisNumero, setDevisNumero] = useState<string>('123');
    const [enDateDu, setEnDateDu] = useState<string>('05/10/2024');
    const [valableJusquau, setValableJusquau] = useState<string>('04/12/2024');
    const [debutTravaux, setDebutTravaux] = useState<string>('05/10/2024');
    const [dureeTravaux, setDureeTravaux] = useState<string>('1 jour');

    // Pour tous ces champs, on va réutiliser un état "editingField" distinct
    const [editingFieldOutside, setEditingFieldOutside] = useState<string | null>(null);
    const [editValueOutside, setEditValueOutside] = useState<string>('');

    const handleFieldClick = (fieldName: string, currentValue: string) => {
        setEditingFieldOutside(fieldName);
        setEditValueOutside(currentValue);
    };

    const handleOutsideInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditValueOutside(e.target.value);
    };

    const handleOutsideBlur = () => {
        saveOutsideChanges();
    };

    const handleOutsideKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            saveOutsideChanges();
        }
    };

    const saveOutsideChanges = () => {
        if (!editingFieldOutside) return;
        const newValue = editValueOutside.trim();
        switch (editingFieldOutside) {
            case 'devoTitle':
                setDevoTitle(newValue);
                break;
            case 'devoName':
                setDevoName(newValue);
                break;
            case 'devoAddress':
                setDevoAddress(newValue);
                break;
            case 'devoCity':
                setDevoCity(newValue);
                break;
            case 'devoSiren':
                setDevoSiren(newValue);
                break;
            case 'societeBatiment':
                setSocieteBatiment(newValue);
                break;
            case 'clientAdresse':
                setClientAdresse(newValue);
                break;
            case 'clientCodePostal':
                setClientCodePostal(newValue);
                break;
            case 'clientTel':
                setClientTel(newValue);
                break;
            case 'clientEmail':
                setClientEmail(newValue);
                break;
            case 'devisNumero':
                setDevisNumero(newValue);
                break;
            case 'enDateDu':
                setEnDateDu(newValue);
                break;
            case 'valableJusquau':
                setValableJusquau(newValue);
                break;
            case 'debutTravaux':
                setDebutTravaux(newValue);
                break;
            case 'dureeTravaux':
                setDureeTravaux(newValue);
                break;
            default:
                break;
        }

        setEditingFieldOutside(null);
        setEditValueOutside('');
    };

    const EditableText = ({fieldName, value}: {fieldName: string; value: string}) => {
        const isEditing = editingFieldOutside === fieldName;
        return isEditing ? (
            <input
                type="text"
                value={editValueOutside}
                onChange={handleOutsideInputChange}
                onBlur={handleOutsideBlur}
                onKeyDown={handleOutsideKeyDown}
                autoFocus
            />
        ) : (
            <span onClick={() => handleFieldClick(fieldName, value)} style={{cursor:'pointer', textDecoration:'underline'}}>
                {value}
            </span>
        );
    };

    return (
      <div>
        <button className='full-quote-button' onClick={handleBack}>
          retour maquette
        </button>
        <div className="container">
          <header>
            <div className="logo-info" style={{cursor: 'pointer'}} onClick={handleLogoClick}>
              <img src={logoSrc} alt="Logo" />
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{display:'none'}}
                onChange={handleLogoChange}
                accept="image/*"
              />
            </div>
            <div className="devo-info">
              <h2>
                <EditableText fieldName="devoTitle" value={devoTitle} />
              </h2>
              <p>
                <EditableText fieldName="devoName" value={devoName} /><br />
                <EditableText fieldName="devoAddress" value={devoAddress} /><br />
                <EditableText fieldName="devoCity" value={devoCity} /><br />
                <EditableText fieldName="devoSiren" value={devoSiren} />
              </p>
            </div>
          </header>
          <div className="infoclient-infodevis">
            <section className="info-client">
              <h2>
                <EditableText fieldName="societeBatiment" value={societeBatiment} />
              </h2><br/>
              <div>
                <table className='info-table-client'>
                  <tbody>
                  <tr>
                    <td>Adresse</td>
                    <td>
                      <EditableText fieldName="clientAdresse" value={clientAdresse} />
                    </td>
                  </tr>
                  <tr>
                    <td>Code Postal</td>
                    <td>
                      <EditableText fieldName="clientCodePostal" value={clientCodePostal} />
                    </td>
                  </tr>
                  <tr>
                    <td>Tel</td>
                    <td>
                      <EditableText fieldName="clientTel" value={clientTel} />
                    </td>
                  </tr>
                  <tr>
                    <td>Email</td>
                    <td>
                      <EditableText fieldName="clientEmail" value={clientEmail} />
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </section>
            <section className="devis-header">
              <h2>
                Devis n° : <EditableText fieldName="devisNumero" value={devisNumero} />
              </h2><br/>
              <div>
                <table className='info-table-devis'>
                  <tbody>
                  <tr>
                    <td>En date du</td>
                    <td><EditableText fieldName="enDateDu" value={enDateDu} /></td>
                  </tr>
                  <tr>
                    <td>Valable jusqu'au</td>
                    <td><EditableText fieldName="valableJusquau" value={valableJusquau} /></td>
                  </tr>
                  <tr>
                    <td>Début des travaux</td>
                    <td><EditableText fieldName="debutTravaux" value={debutTravaux} /></td>
                  </tr>
                  <tr>
                    <td>Durée estimée à</td>
                    <td><EditableText fieldName="dureeTravaux" value={dureeTravaux} /></td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <table className='table-border'>
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
                        : `${item.quantity.toFixed(2)}`}
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
                Acompte {editingAcompte ? (
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
                )} du total TTC = {acompte.toFixed(2)} € TTC à la signature
                <br/>
                Reste à facturer : {resteAPayer.toFixed(2)} € TTC
                <br/>
                Méthodes de paiement acceptées : Chèque, Espèces.
              </p>
            </div>
            <div className="totals">
              <table className='table-border'>
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
            <p>Les marchandises vendues restent notre propriété, jusqu'au paiement complet de la facture (loi°80.335 du 2 mai 1980)</p>
          </footer>
        </div>
      </div>
    );
};

export default FullQuote;
