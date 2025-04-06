import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Quote.css';
import { useMaquetteStore } from '../store/maquetteStore'; 
import axios from 'axios';
import { jsPDF } from 'jspdf';

// YouSign API client
class YouSignClient {
  private BASE_URL = 'https://api-sandbox.yousign.app/v3';
  private API_KEY: string;

  constructor(apiKey: string) {
    this.API_KEY = apiKey;
  }

  async request(endpoint = '', options = {}, headers = {}) {
    const url = `${this.BASE_URL}/${endpoint}`;
    const config = {
      url,
      headers: {
        Authorization: `Bearer ${this.API_KEY}`,
        ...headers
      },
      ...options
    }

    try {
      const res = await axios(config);
      return res.data;
    } catch (e) {
      console.error('YouSign API error:', e);
      throw new Error(`Error on API call`);
    }
  }

  // Initiate Signature Request
  async initiateSignatureRequest(name: string) {
    const body = {
      name,
      delivery_mode: 'email',
      timezone: 'Europe/Paris',
    };
    const options = {
      method: 'POST',
      data: JSON.stringify(body),
    };
    const headers = {
      'Content-type': 'application/json',
    };
    return this.request('signature_requests', options, headers);
  }

  // Upload Document
  async uploadDocument(signatureRequestId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file, 'devis.pdf');
    formData.append('nature', 'signable_document');
    formData.append('parse_anchors', 'true');

    const options = {
      method: 'POST',
      data: formData,
    };
    
    return this.request(`signature_requests/${signatureRequestId}/documents`, options);
  }

  // Add Signer
  async addSigner(signatureRequestId: string, documentId: string, signerInfo: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  }) {
    const body = {
      info: {
        ...signerInfo,
        locale: 'fr',
      },
      signature_level: 'electronic_signature',
      signature_authentication_mode: 'no_otp',
      fields: [
        {
          document_id: documentId,
          type: 'signature',
          page: 1,
          x: 77,
          y: 581,
        }
      ]
    };
    
    const options = {
      method: 'POST',
      data: JSON.stringify(body),
    };
    
    const headers = {
      'Content-type': 'application/json',
    };
    
    return this.request(`signature_requests/${signatureRequestId}/signers`, options, headers);
  }

  // Activate Signature Request
  async activateSignatureRequest(signatureRequestId: string) {
    const options = {
      method: 'POST',
    }
    return this.request(`signature_requests/${signatureRequestId}/activate`, options);
  }
}

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
    const quoteRef = useRef<HTMLDivElement>(null);

    // YouSign API integration
    const apiKey = import.meta.env.VITE_APP_YOUSIGN_API_KEY ;
    const [youSignClient] = useState<YouSignClient>(() => new YouSignClient(apiKey));
    const [signatureStatus, setSignatureStatus] = useState<'idle' | 'preparing' | 'sent' | 'error'>('idle');
    const [signatureRequestId, setSignatureRequestId] = useState<string | null>(null);
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

    // New state for signer info
    const [signerFirstName, setSignerFirstName] = useState<string>('');
    const [signerLastName, setSignerLastName] = useState<string>('');
    const [signerEmail, setSignerEmail] = useState<string>('');
    const [signerPhone, setSignerPhone] = useState<string>('');
    const [showSignerForm, setShowSignerForm] = useState<boolean>(false);

    // Agrégation initiale des articles
    const initialAggregated: AggregatedQuoteItem[] = quote.reduce((acc, item) => {
        const existingItem = acc.find(
            (i) => i.details === item.parametricData.item_details.libtech && i.price === item.price
        );
        if (existingItem) {
            existingItem.quantity += 1; 
        } else {
            acc.push({ details: item.parametricData.item_details.libtech, price: item.price, quantity: 1 }); 
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

    // Function to prepare a proper PDF document for signature
    const prepareDocumentForSignature = (): Promise<File> => {
        return new Promise((resolve) => {
            // Create a PDF document
            const doc = new jsPDF();
            
            // Set font
            doc.setFont("helvetica", "normal");
            
            // Add title
            doc.setFontSize(18);
            doc.text(`DEVIS N° ${devisNumero}`, 105, 20, { align: 'center' });
            
            // Client information
            doc.setFontSize(12);
            doc.text(`Client: ${societeBatiment}`, 20, 40);
            doc.text(`Adresse: ${clientAdresse}, ${clientCodePostal}`, 20, 50);
            doc.text(`Tel: ${clientTel}`, 20, 60);
            doc.text(`Email: ${clientEmail}`, 20, 70);
            
            // Devis information
            doc.text(`Date: ${enDateDu}`, 140, 40);
            doc.text(`Valable jusqu'au: ${valableJusquau}`, 140, 50);
            
            // Headers for items table
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("N°", 20, 90);
            doc.text("DÉSIGNATION", 40, 90);
            doc.text("QTÉ", 130, 90);
            doc.text("PRIX U.", 150, 90);
            doc.text("TOTAL HT", 180, 90);
            
            // Draw a line under headers
            doc.setLineWidth(0.5);
            doc.line(20, 95, 190, 95);
            
            // Items
            doc.setFont("helvetica", "normal");
            let y = 105;
            
            aggregatedQuote.forEach((item, idx) => {
                doc.text((idx + 1).toString(), 20, y);
                
                // Handle long descriptions - wrap text
                const lines = doc.splitTextToSize(item.details, 80);
                doc.text(lines, 40, y);
                
                // Calculate correct Y position after multiline text
                y += (lines.length - 1) * 10;
                
                doc.text(item.quantity.toString(), 130, y);
                doc.text(`${item.price.toFixed(2)} €`, 150, y);
                doc.text(`${(item.price * item.quantity).toFixed(2)} €`, 180, y);
                
                y += 15;
                
                // Add a new page if we're running out of space
                if (y > 260) {
                    doc.addPage();
                    y = 20;
                }
            });
            
            // Draw a line under items
            doc.line(20, y, 190, y);
            y += 10;
            
            // Totals
            doc.text(`Total HT: ${totalHT.toFixed(2)} €`, 140, y+10);
            doc.text(`TVA (${(tvaRate * 100).toFixed(2)}%): ${totalTVA.toFixed(2)} €`, 140, y+20);
            doc.text(`Total TTC: ${totalTTC.toFixed(2)} €`, 140, y+30);
            doc.text(`Acompte (${(acompteRate * 100).toFixed(2)}%): ${acompte.toFixed(2)} €`, 140, y+40);
            doc.text(`Reste à payer: ${resteAPayer.toFixed(2)} €`, 140, y+50);
            
            // Signature area
            y += 70;
            doc.text("Signature du client:", 20, y);
            doc.rect(20, y+5, 80, 40);
            
            // Convert to blob
            const pdfBlob = doc.output('blob');
            const file = new File([pdfBlob], 'devis.pdf', { type: 'application/pdf' });
            
            resolve(file);
        });
    };

    // Function to start the signature process
    const handleRequestSignature = async () => {
        setShowSignerForm(true);
    };

    // Function to submit the signature request
    const handleSubmitSignatureRequest = async () => {
        if (!signerEmail || !signerFirstName || !signerLastName || !signerPhone) {
            alert('Veuillez remplir tous les champs du signataire');
            return;
        }

        setSignatureStatus('preparing');
        try {
            // 1. Prepare proper PDF document
            const file = await prepareDocumentForSignature();
            
            // 2. Initiate the signature request
            const signatureRequest = await youSignClient.initiateSignatureRequest(`Devis n° ${devisNumero} - ${societeBatiment}`);
            setSignatureRequestId(signatureRequest.id);

            // 3. Upload the document
            const documentResponse = await youSignClient.uploadDocument(signatureRequest.id, file);

            // 4. Add the signer
            const signerInfo = {
                first_name: signerFirstName,
                last_name: signerLastName,
                email: signerEmail,
                phone_number: signerPhone
            };
            const signerResponse = await youSignClient.addSigner(signatureRequest.id, documentResponse.id, signerInfo);

            // 5. Activate the signature request
            await youSignClient.activateSignatureRequest(signatureRequest.id);

            setSignatureStatus('sent');
            setSignatureUrl(signerResponse.signature_link);
            setShowSignerForm(false);
        } catch (error) {
            console.error('Error in signature process:', error);
            setSignatureStatus('error');
        }
    };

    // Function to handle close of signer form
    const handleCloseSignerForm = () => {
        setShowSignerForm(false);
    };

    return (
      <div>
        <button className='full-quote-button' onClick={handleBack}>
          retour maquette
        </button>
         
        <div className="container" ref={quoteRef}>
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
        
        {/* Electronic Signature Button */}
        <div className="signature-actions" style={{ textAlign: 'center', margin: '20px 0' }}>
          {signatureStatus === 'idle' && (
            <button 
              onClick={handleRequestSignature}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Demander signature électronique
            </button>
          )}
          
          {signatureStatus === 'preparing' && (
            <div>Préparation de la demande de signature...</div>
          )}
          
          {signatureStatus === 'sent' && (
            <div>
              <p style={{ color: 'green', fontWeight: 'bold' }}>
                Demande de signature envoyée avec succès!
              </p>
              {signatureUrl && (
                <a 
                  href={signatureUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    display: 'inline-block',
                    margin: '10px 0',
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px'
                  }}
                >
                  Voir la demande de signature
                </a>
              )}
            </div>
          )}
          
          {signatureStatus === 'error' && (
            <div style={{ color: 'red' }}>
              Une erreur est survenue lors de la demande de signature. Veuillez réessayer.
            </div>
          )}
        </div>
        
        {/* Signer Information Modal */}
        {showSignerForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              width: '400px',
              maxWidth: '90%'
            }}>
              <h3 style={{ marginTop: 0 }}>Informations du signataire</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Prénom</label>
                <input
                  type="text"
                  value={signerFirstName}
                  onChange={e => setSignerFirstName(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Nom</label>
                <input
                  type="text"
                  value={signerLastName}
                  onChange={e => setSignerLastName(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
                <input
                  type="email"
                  value={signerEmail}
                  onChange={e => setSignerEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Téléphone (format international: +33...)</label>
                <input
                  type="tel"
                  value={signerPhone}
                  onChange={e => setSignerPhone(e.target.value)}
                  placeholder="+33601020304"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={handleCloseSignerForm}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                
                <button
                  onClick={handleSubmitSignatureRequest}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Envoyer la demande
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

export default FullQuote;
