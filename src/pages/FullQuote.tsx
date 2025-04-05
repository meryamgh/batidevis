import React, { useRef, useState, useEffect } from 'react';
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
    isNew?: boolean; // Add this flag to track new items
};

// Interface for API response
interface ApiSuggestionResponse {
    suggestions?: string[];
    status?: number;
}

const FullQuote: React.FC = () => {
    const navigate = useNavigate();
    const { quote } = useMaquetteStore();
    const inputRef = useRef<HTMLInputElement>(null);

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
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState<boolean>(false);

    // Monitor suggestions changes
    useEffect(() => {
        console.log("Suggestions state updated:", suggestions);
    }, [suggestions]);

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

    // Function to add a new empty row to the quote
    const handleAddRow = () => {
        const newItem: AggregatedQuoteItem = {
            details: "Nouveau produit",
            price: 0,
            quantity: 1,
            isNew: true
        };
        setAggregatedQuote([...aggregatedQuote, newItem]);
        
        // Automatically start editing the new row
        const newIndex = aggregatedQuote.length;
        setEditingCell({rowIndex: newIndex, field: 'details'});
        setEditValue("Nouveau produit");
    };

    // Debug utility to display current state (for development)
    const debugState = () => {
        console.group("Current State Debug");
        console.log("Editing Cell:", editingCell);
        console.log("Edit Value:", editValue);
        console.log("Suggestions:", suggestions);
        console.log("Selected Index:", selectedSuggestionIndex);
        console.log("Aggregated Quote:", aggregatedQuote);
        console.groupEnd();
    };


    // Function to fetch suggestions from API
    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            return;
        }

        console.log("Fetching suggestions for:", query);
        setIsFetchingSuggestions(true);
        try {
            const response = await fetch('http://localhost:5000/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                mode: 'cors',
                body: JSON.stringify({ query }),
            });

            console.log("API response status:", response.status);
            
            if (response.ok) {
                const data: ApiSuggestionResponse = await response.json();
                console.log("API response data:", data);
                
                if (data.suggestions && data.suggestions.length > 0) {
                    console.log("Setting suggestions:", data.suggestions);
                    setSuggestions(data.suggestions);
                } else {
                    console.log("No suggestions found in response");
                    // Fallback to mock suggestions for testing
                    provideMockSuggestions(query);
                }
            } else {
                console.log('No suggestions found - response not OK');
                // Fallback to mock suggestions for testing
                provideMockSuggestions(query);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            // Fallback to mock suggestions for testing
            provideMockSuggestions(query);
        } finally {
            setIsFetchingSuggestions(false);
        }
    };

    // Provide mock suggestions for testing if API is not available
    const provideMockSuggestions = (query: string) => {
        console.log("Providing mock suggestions for:", query);
        const mockSuggestions = [
            `${query} d'une fenêtre PVC`,
            `${query} d'une porte d'entrée`,
            `${query} d'un volet roulant`,
            `${query} et installation complète`,
            `${query} sur mesure`
        ];
        setSuggestions(mockSuggestions);
    };

    // Gestion de l'édition des cellules du tableau de produits
    const [editingCell, setEditingCell] = useState<{rowIndex: number; field: 'details' | 'quantity' | 'price'} | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
    const [isSuggestionClicking, setIsSuggestionClicking] = useState<boolean>(false);

    const handleCellClick = (rowIndex: number, field: 'details' | 'quantity' | 'price') => {
        setEditingCell({rowIndex, field});
        const currentValue = aggregatedQuote[rowIndex][field].toString();
        setEditValue(currentValue);
        
        // If editing details field, fetch suggestions
        if (field === 'details' && currentValue.length >= 3) {
            fetchSuggestions(currentValue);
        } else {
            setSuggestions([]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEditValue(value);
        
        // If editing details field, fetch suggestions
        if (editingCell?.field === 'details' && value.length >= 3) {
            fetchSuggestions(value);
        } else {
            setSuggestions([]);
        }
        
        // Reset suggestion selection
        setSelectedSuggestionIndex(-1);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        // Give time for suggestion clicks to process
        setTimeout(() => {
            // Don't save if a suggestion is being clicked
            if (editingCell && !isSuggestionClicking) {
                saveCellChanges();
                setSuggestions([]);
            }
        }, 200);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (selectedSuggestionIndex >= 0 && suggestions.length > 0) {
                // If a suggestion is selected, use it
                setEditValue(suggestions[selectedSuggestionIndex]);
                setSuggestions([]);
                setSelectedSuggestionIndex(-1);
            } else {
                // Otherwise, save as normal
                saveCellChanges();
                setSuggestions([]);
            }
        } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
            // Navigate down through suggestions
            e.preventDefault();
            setSelectedSuggestionIndex(prev => 
                prev < suggestions.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
            // Navigate up through suggestions
            e.preventDefault();
            setSelectedSuggestionIndex(prev => 
                prev > 0 ? prev - 1 : suggestions.length - 1
            );
        } else if (e.key === 'Escape') {
            // Close suggestions without selecting
            setSuggestions([]);
            setSelectedSuggestionIndex(-1);
        } else if (e.key === 'Tab') {
            // Using tab to accept suggestion
            if (selectedSuggestionIndex >= 0 && suggestions.length > 0) {
                e.preventDefault();
                setEditValue(suggestions[selectedSuggestionIndex]);
                setSuggestions([]);
                setSelectedSuggestionIndex(-1);
            }
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        // Log that a suggestion was clicked
        console.log("Suggestion clicked:", suggestion);
        
        if (!editingCell) {
            console.error("No cell is being edited");
            return;
        }
        
        // Get row and field being edited
        const {rowIndex, field} = editingCell;
        
        console.log(`Applying suggestion "${suggestion}" to row ${rowIndex}`);
        
        // Set flag to prevent blur handler from saving
        setIsSuggestionClicking(true);
        
        // Create a new copy of the quote with direct application of the suggestion
        const newItems = aggregatedQuote.map((item, index) => {
            if (index === rowIndex) {
                return { 
                    ...item, 
                    details: field === 'details' ? suggestion : item.details 
                };
            }
            return item;
        });
        
        // Update the state
        setAggregatedQuote(newItems);
        
        // Clear the edit state immediately
        setEditingCell(null);
        setEditValue('');
        setSuggestions([]);
        
        console.log("Updated quote:", newItems);
        
        // Reset the flag after a short delay
        setTimeout(() => {
            setIsSuggestionClicking(false);
        }, 300);
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
        
        // Remove the isNew flag if it was set
        if (newAggregated[rowIndex].isNew && field === 'details') {
            newAggregated[rowIndex].isNew = false;
        }
        
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
                      style={{ position: 'relative' }}
                    >
                      {isEditingDetails ? (
                        <>
                          <input
                            type="text"
                            value={editValue}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            ref={inputRef}
                            autoFocus
                            style={{ width: '100%' }}
                          />
                          {suggestions.length > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              backgroundColor: 'white',
                              border: '2px solid #007bff',
                              borderRadius: '4px',
                              zIndex: 1000,
                              width: '100%',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                            }}>
                              {suggestions.map((suggestion, i) => {
                                // Function to handle click within this closure
                                const handleClick = (e: React.MouseEvent) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  // Set flag to prevent blur handler from saving
                                  setIsSuggestionClicking(true);
                                  
                                  if (editingCell) {
                                    const {rowIndex, field} = editingCell;
                                    
                                    // Create updated copy with suggestion applied
                                    const newQuote = [...aggregatedQuote];
                                    newQuote[rowIndex].details = suggestion;
                                    
                                    // Update state directly
                                    setAggregatedQuote(newQuote);
                                    setSuggestions([]);
                                    setEditingCell(null);
                                    
                                    console.log(`Applied suggestion "${suggestion}" to row ${rowIndex}`);
                                    
                                    // Reset the flag after a short delay
                                    setTimeout(() => {
                                      setIsSuggestionClicking(false);
                                    }, 300);
                                  }
                                };
                                
                                return (
                                  <div
                                    key={i}
                                    onClick={handleClick}
                                    style={{
                                      padding: '8px 12px',
                                      cursor: 'pointer',
                                      backgroundColor: i === selectedSuggestionIndex ? '#e9f5ff' : 'white',
                                      color: '#333',
                                      fontWeight: i === selectedSuggestionIndex ? 'bold' : 'normal',
                                      borderBottom: i < suggestions.length - 1 ? '1px solid #eee' : 'none'
                                    }}
                                  >
                                    {suggestion}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        item.details
                      )}
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
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '10px' }}>
                  <button 
                    onClick={handleAddRow} 
                    style={{ 
                      fontSize: '18px', 
                      backgroundColor: '#007bff', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '50%', 
                      width: '30px', 
                      height: '30px', 
                      cursor: 'pointer' 
                    }}
                  >
                    +
                  </button>
                </td>
              </tr>
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
