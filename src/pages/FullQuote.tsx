import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Quote.css';
import { useMaquetteStore } from '../store/maquetteStore'; 
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { BACKEND_URL } from '../config/env';
import { useAuth } from '../hooks/useAuth';
import { DevisService, DevisData } from '../services/DevisService';
import { generateUniqueId } from '../utils/generateUniqueId';
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
 

type AggregatedQuoteItem = {
    details: string;
    price: number;
    quantity: number;
    unit?: string;
    isNew?: boolean;
};

// Interface for API response
interface ApiSuggestionResponse {
    count: number;
    matches: Array<{
        id: number;
        libelle: string;
        libtech: string;
        prix: number;
        type: string;
        unite: string;
    }>;
}

// Fonction utilitaire pour formater les nombres avec des espaces tous les 3 chiffres
const formatNumber = (num: number): string => {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const FullQuote: React.FC = () => {
    const navigate = useNavigate();
    const { quote, syncObjectsAndQuote } = useMaquetteStore();
    const { user } = useAuth();
    const inputRef = useRef<HTMLInputElement>(null);
    const quoteRef = useRef<HTMLDivElement>(null);
    const [data, setData] = useState<any>(null);
    const [isEditMode, setIsEditMode] = useState<boolean>(true);
    // YouSign API integration
    const apiKey = import.meta.env.VITE_APP_YOUSIGN_API_KEY ;
    const [youSignClient] = useState<YouSignClient>(() => new YouSignClient(apiKey));
    const [signatureStatus, setSignatureStatus] = useState<'idle' | 'preparing' | 'sent' | 'error'>('idle');
    const [signatureRequestId, setSignatureRequestId] = useState<string | null>(null);
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

    // Constantes pour stocker les données des catégories
    const [categoriesData, setCategoriesData] = useState<Record<number, any>>({});
    const [loadingCategories, setLoadingCategories] = useState<Record<number, boolean>>({});
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filteredData, setFilteredData] = useState<any>(null);

    // Liste des catégories avec leurs IDs
    const categories = [
        { id: 48629, name: 'Électricité' },
        { id: 48646, name: 'Génie climatique - Plomberie - Sanitaire' },
        { id: 48659, name: 'Multiservices' },
        { id: 66719, name: 'Second oeuvre' },
        { id: 69486, name: 'Gros oeuvre' },
        { id: 141175, name: 'Aménagements extérieurs' }
    ];

    // New state for signer info
    const [signerFirstName, setSignerFirstName] = useState<string>('');
    const [signerLastName, setSignerLastName] = useState<string>('');
    const [signerEmail, setSignerEmail] = useState<string>('');
    const [signerPhone, setSignerPhone] = useState<string>('');
    const [showSignerForm, setShowSignerForm] = useState<boolean>(false);

    // Add new states for invoice email modal
    const [showInvoiceEmailModal, setShowInvoiceEmailModal] = useState<boolean>(false);
    const [invoiceEmail, setInvoiceEmail] = useState<string>('');

    // States for saving devis
    const [isSavingDevis, setIsSavingDevis] = useState<boolean>(false);
    const [showSaveDevisModal, setShowSaveDevisModal] = useState<boolean>(false);
    const [devisName, setDevisName] = useState<string>('');
    const [devisDescription, setDevisDescription] = useState<string>('');

    // Agrégation initiale des articles
    const initialAggregated: AggregatedQuoteItem[] = quote.reduce((acc, item) => {
      let details: string;
      let unit: string | undefined;
      
      // Vérification sécurisée de la structure des données
      if (item.parametricData && item.parametricData.item_details) {
        details = item.parametricData.item_details.libtech || item.details || 'Produit sans nom';
        unit = item.parametricData.item_details.unite || 'U';
      } else {
        details = item.details || 'Produit sans nom';
        unit = 'U';
      }
      
      const existingItem = acc.find(
          (i) => i.details === details && i.price === item.price
      );
      if (existingItem) {
          existingItem.quantity += 1; 
      } else {
          acc.push({ details: details, price: item.price, quantity: 1, unit: unit }); 
      }
      return acc;
    }, [] as AggregatedQuoteItem[]);

    const [aggregatedQuote, setAggregatedQuote] = useState<AggregatedQuoteItem[]>(initialAggregated);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState<boolean>(false);

    // Fonction pour supprimer une ligne
    const handleDeleteRow = (index: number) => {
        const newQuote = [...aggregatedQuote];
        newQuote.splice(index, 1);
        setAggregatedQuote(newQuote);
    };

    

    // Paramètres de TVA, Acompte
    const tvaRate = 0.20; 
    const [acompteRate, setAcompteRate] = useState<number>(0.30);

    const totalHT = aggregatedQuote.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalTVA = totalHT * tvaRate;
    const totalTTC = totalHT + totalTVA;
    const acompte = totalTTC * acompteRate;
    const resteAPayer = totalTTC - acompte;

    const handleBack = () => {
        // Sauvegarder les données du devis avant de partir
        saveDevisDataToLocalStorage(); 
        
        // Synchroniser les données du devis avec le store maquetteStore
        // Convertir aggregatedQuote en format compatible avec ObjectData
        const updatedQuote = aggregatedQuote.map((item, index) => {
            // Vérifier si c'est un élément existant de la maquette
            // Utiliser une correspondance plus robuste basée sur l'ID si disponible
            const existingItem = quote.find(q => 
                q.id && q.id.startsWith('devis-item-') && 
                q.details === item.details && 
                q.price === item.price
            );
            
            if (existingItem) {
                // Garder les propriétés originales de l'élément existant
                return {
                    ...existingItem,
                    price: item.price,
                    details: item.details
                };
            } else {
                // Créer un nouvel élément de devis
                return {
                    id: generateUniqueId(`devis-item-${index}`),
                    url: '', // Pas d'URL pour les éléments de devis
                    price: item.price,
                    details: item.details,
                    position: [0, 0, 0] as [number, number, number], // Position par défaut
                    scale: [1, 1, 1] as [number, number, number], // Échelle par défaut
                    texture: null,
                    rotation: [0, 0, 0] as [number, number, number], // Rotation par défaut
                    color: '#ffffff',
                    startPoint: null,
                    endPoint: null,
                    parentScale: [1, 1, 1] as [number, number, number],
                    boundingBox: null,
                    faces: null,
                    type: 'devis-item' as const,
                    parametricData: null,
                    isBatiChiffrageObject: false
                };
            }
        });
        
        // Mettre à jour le store avec les nouvelles données du devis
        // Passer aussi l'ordre exact des éléments
        syncObjectsAndQuote(updatedQuote);
        
        // Attendre un court instant pour s'assurer que la sauvegarde est terminée
        setTimeout(() => {
        navigate('/maquette'); 
        }, 100);
    };

    // Function to add a new empty row to the quote
    const handleAddRow = () => {
        const newItem: AggregatedQuoteItem = {
            details: "Nouveau produit",
            price: 0,
            quantity: 1,
            isNew: true
        };
        
        setAggregatedQuote(prev => {
            const newArray = [...prev, newItem];
            return newArray;
        });
        
        // Automatically start editing the new row
        const newIndex = aggregatedQuote.length;
        setEditingCell({rowIndex: newIndex, field: 'details'});
        setEditValue("Nouveau produit");
    };

    

    // Modifier le state pour stocker toutes les suggestions
    const [currentSuggestionData, setCurrentSuggestionData] = useState<ApiSuggestionResponse['matches'] | null>(null);

    // Function to fetch suggestions from API
    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            setCurrentSuggestionData(null);
            return;
        }
 
        setIsFetchingSuggestions(true); 
        try {
              const response = await fetch(`${BACKEND_URL}/api/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                mode: 'cors',
                body: JSON.stringify({ query }),
            });
 
            
            if (response.ok) {
                const data: ApiSuggestionResponse = await response.json(); 
                
                if (data.matches && data.matches.length > 0) {
                    // Stocker les données complètes de toutes les suggestions
                    const formattedSuggestions = data.matches.map(match => ({
                        display: `${match.libtech} (${formatNumber(match.prix)}€/${match.unite})`,
                        data: match
                    }));
                    
                    setSuggestions(formattedSuggestions.map(s => s.display));
                    setCurrentSuggestionData(formattedSuggestions.map(s => s.data));
                } else { 
                    setSuggestions([]);
                    setCurrentSuggestionData(null);
                }
            } else { 
                setSuggestions([]);
                setCurrentSuggestionData(null);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            setSuggestions([]);
            setCurrentSuggestionData(null);
        } finally {
            setIsFetchingSuggestions(false);
        }
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

        // Mettre à jour immédiatement la valeur dans le tableau
        if (editingCell) {
            const {rowIndex, field} = editingCell;
            const newAggregated = [...aggregatedQuote];
            if (field === 'quantity' || field === 'price') {
                const numericVal = parseFloat(value) || 0;
                newAggregated[rowIndex][field] = numericVal;
            } else {
                newAggregated[rowIndex][field] = value;
            }
            setAggregatedQuote(newAggregated);
        }
    };

    const handleBlur = () => {
        // Ne rien faire si on clique sur une suggestion

        if (isSuggestionClicking) {
            return;
        }
        
        // Attendre un court instant pour permettre le clic sur les suggestions
        setTimeout(() => {
            if (!isSuggestionClicking) {
                setEditingCell(null);
                setEditValue('');
                setSuggestions([]);
                setCurrentSuggestionData(null);
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
    const [leftLogoSrc, setLeftLogoSrc] = useState<string>("");
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
            setLeftLogoSrc(objectUrl);
        }
        // Réinitialiser l'input pour permettre le même fichier
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDeleteLogo = () => {
        setLeftLogoSrc("");
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
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

    // Fonction pour générer un numéro de devis unique
    const generateUniqueDevisNumber = (): string => {
        const timestamp = Date.now();
        const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const year = new Date().getFullYear();
        return `${year}-${timestamp}-${randomPart}`;
    };

    // Informations de devis
    const [devisNumero, setDevisNumero] = useState<string>(generateUniqueDevisNumber());
    const [enDateDu, setEnDateDu] = useState<string>('05/10/2024');
    
    // Informations complémentaires
    const [fraisDeplacement, setFraisDeplacement] = useState<string>('');
    const [tauxHoraire, setTauxHoraire] = useState<string>('');
    const [valableJusquau, setValableJusquau] = useState<string>('04/12/2024');
    const [debutTravaux, setDebutTravaux] = useState<string>('05/10/2024');
    const [dureeTravaux, setDureeTravaux] = useState<string>('1 jour');

    // Interface pour les frais divers
    interface FraisDivers {
        id: number;
        libtech: string;
        prix: number;
        unite: string;
    }

    // Interface pour les frais de déplacement et horaires
    interface FraisObligatoire {
        id: number;
        libtech: string;
        prix: number;
        unite: string;
    }

    // État pour les frais divers
    const [fraisDivers, setFraisDivers] = useState<FraisDivers[]>([]);
    const [selectedFraisDivers, setSelectedFraisDivers] = useState<number[]>([]);

    // État pour les frais obligatoires
    const [fraisDeplacementOptions, setFraisDeplacementOptions] = useState<FraisObligatoire[]>([]);
    const [selectedFraisDeplacement, setSelectedFraisDeplacement] = useState<number>(0);
    const [fraisHeureOptions, setFraisHeureOptions] = useState<FraisObligatoire[]>([]);
    const [selectedFraisHeure, setSelectedFraisHeure] = useState<number>(0);
    
         // État pour les frais de devis
     const [isDevisGratuit, setIsDevisGratuit] = useState<boolean>(true);

    // Fonction pour récupérer les frais divers depuis l'API
    const fetchFraisDivers = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/list_libtech/frais_divers`);
            if (response.ok) {
                const data = await response.json();
                setFraisDivers(data);
            } else {
                console.error('Erreur lors de la récupération des frais divers');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des frais divers:', error);
        }
    };

    // Fonction pour récupérer les frais de déplacement depuis l'API
    const fetchFraisDeplacement = async () => { 
        try {
            const response = await fetch(`${BACKEND_URL}/api/frais/deplacement`);
            if (response.ok) {
                const data = await response.json();
                setFraisDeplacementOptions(data);
            } else {
                console.error('Erreur lors de la récupération des frais de déplacement');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des frais de déplacement:', error);
        }
    };

    // Fonction pour récupérer les frais horaires depuis l'API
    const fetchFraisHeure = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/frais/heure`);
            if (response.ok) {
                const data = await response.json();
                setFraisHeureOptions(data);
            } else {
                console.error('Erreur lors de la récupération des frais horaires');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des frais horaires:', error);
        }
    };

    

         // Appel de la fonction au chargement du composant
     useEffect(() => {
         fetchFraisDivers();
         fetchFraisDeplacement();
         fetchFraisHeure();
     }, []);

    // Charger les données du devis depuis le localStorage si elles existent
    useEffect(() => {
        // Vérifier d'abord s'il y a des données à charger depuis la navigation
        const devisDataToLoad = localStorage.getItem('devisDataToLoad');
        if (devisDataToLoad) {
            try {
                const devisData = JSON.parse(devisDataToLoad); 
                
                // Charger les informations du devis
                if (devisData.info) {
                    setDevoTitle(devisData.info.devoTitle || 'BatiDevis');
                    setDevoName(devisData.info.devoName || 'Chen Emma');
                    setDevoAddress(devisData.info.devoAddress || '73 Rue Rateau');
                    setDevoCity(devisData.info.devoCity || '93120 La Courneuve, France');
                    setDevoSiren(devisData.info.devoSiren || 'SIREN : 000.000.000.000');
                    setSocieteBatiment(devisData.info.societeBatiment || 'Société Bâtiment');
                    setClientAdresse(devisData.info.clientAdresse || '20 rue le blanc');
                    setClientCodePostal(devisData.info.clientCodePostal || '75013 Paris');
                    setClientTel(devisData.info.clientTel || '0678891223');
                    setClientEmail(devisData.info.clientEmail || 'sociétébatiment@gmail.com');
                    setDevisNumero(devisData.info.devisNumero || generateUniqueDevisNumber());
                    setEnDateDu(devisData.info.enDateDu || '05/10/2024');
                    setValableJusquau(devisData.info.valableJusquau || '04/12/2024');
                    setDebutTravaux(devisData.info.debutTravaux || '05/10/2024');
                    setDureeTravaux(devisData.info.dureeTravaux || '1 jour');
                    setFraisDeplacement(devisData.info.fraisDeplacement || '');
                    setTauxHoraire(devisData.info.tauxHoraire || '');
                    setIsDevisGratuit(devisData.info.isDevisGratuit !== undefined ? devisData.info.isDevisGratuit : true);
                }
                
                // Charger les lignes du devis
                if (devisData.lines && Array.isArray(devisData.lines)) { 
                    setAggregatedQuote(devisData.lines);
                }
                
                // Charger les totaux
                if (devisData.totals) {
                    if (devisData.totals.acompteRate !== undefined) {
                        setAcompteRate(devisData.totals.acompteRate);
                    }
                }
                
                // Nettoyer le localStorage après chargement
                localStorage.removeItem('devisDataToLoad'); 
                
            } catch (error) {
                console.error('❌ Erreur lors du chargement des données du devis:', error);
                localStorage.removeItem('devisDataToLoad');
            }
        } else {
            // Si pas de données à charger, essayer de charger les données auto-sauvegardées
            const autoSavedData = localStorage.getItem('devisDataAutoSave');
            if (autoSavedData) {
                try {
                    const devisData = JSON.parse(autoSavedData); 
                    
                    // Charger les informations du devis
                    if (devisData.info) {
                        setDevoTitle(devisData.info.devoTitle || 'BatiDevis');
                        setDevoName(devisData.info.devoName || 'Chen Emma');
                        setDevoAddress(devisData.info.devoAddress || '73 Rue Rateau');
                        setDevoCity(devisData.info.devoCity || '93120 La Courneuve, France');
                        setDevoSiren(devisData.info.devoSiren || 'SIREN : 000.000.000.000');
                        setSocieteBatiment(devisData.info.societeBatiment || 'Société Bâtiment');
                        setClientAdresse(devisData.info.clientAdresse || '20 rue le blanc');
                        setClientCodePostal(devisData.info.clientCodePostal || '75013 Paris');
                        setClientTel(devisData.info.clientTel || '0678891223');
                        setClientEmail(devisData.info.clientEmail || 'sociétébatiment@gmail.com');
                        setDevisNumero(devisData.info.devisNumero || generateUniqueDevisNumber());
                        setEnDateDu(devisData.info.enDateDu || '05/10/2024');
                        setValableJusquau(devisData.info.valableJusquau || '04/12/2024');
                        setDebutTravaux(devisData.info.debutTravaux || '05/10/2024');
                        setDureeTravaux(devisData.info.dureeTravaux || '1 jour');
                        setFraisDeplacement(devisData.info.fraisDeplacement || '');
                        setTauxHoraire(devisData.info.tauxHoraire || '');
                        setIsDevisGratuit(devisData.info.isDevisGratuit !== undefined ? devisData.info.isDevisGratuit : true);
                    }
                    
                    // Charger les lignes du devis
                    if (devisData.lines && Array.isArray(devisData.lines)) { 
                        setAggregatedQuote(devisData.lines);
                    }
                    
                    // Charger les totaux
                    if (devisData.totals) {
                        if (devisData.totals.acompteRate !== undefined) {
                            setAcompteRate(devisData.totals.acompteRate);
                        }
                    }
                     
                    
                } catch (error) {
                    console.error('❌ Erreur lors du chargement des données auto-sauvegardées:', error);
                }
            }
        }
    }, []);

    // Ajouter un useEffect pour recharger les données quand le composant est monté
    useEffect(() => {
        // Vérifier s'il y a des données auto-sauvegardées récentes
        const autoSavedData = localStorage.getItem('devisDataAutoSave');
        if (autoSavedData) {
            try {
                const devisData = JSON.parse(autoSavedData); 
                
                // Mettre à jour les informations du devis seulement si elles ne sont pas déjà définies
                if (devisData.info) {
                    if (devoTitle === 'BatiDevis') setDevoTitle(devisData.info.devoTitle || 'BatiDevis');
                    if (devoName === 'Chen Emma') setDevoName(devisData.info.devoName || 'Chen Emma');
                    if (devoAddress === '73 Rue Rateau') setDevoAddress(devisData.info.devoAddress || '73 Rue Rateau');
                    if (devoCity === '93120 La Courneuve, France') setDevoCity(devisData.info.devoCity || '93120 La Courneuve, France');
                    if (devoSiren === 'SIREN : 000.000.000.000') setDevoSiren(devisData.info.devoSiren || 'SIREN : 000.000.000.000');
                    if (societeBatiment === 'Société Bâtiment') setSocieteBatiment(devisData.info.societeBatiment || 'Société Bâtiment');
                    if (clientAdresse === '20 rue le blanc') setClientAdresse(devisData.info.clientAdresse || '20 rue le blanc');
                    if (clientCodePostal === '75013 Paris') setClientCodePostal(devisData.info.clientCodePostal || '75013 Paris');
                    if (clientTel === '0678891223') setClientTel(devisData.info.clientTel || '0678891223');
                    if (clientEmail === 'sociétébatiment@gmail.com') setClientEmail(devisData.info.clientEmail || 'sociétébatiment@gmail.com');
                    if (devisNumero === generateUniqueDevisNumber()) setDevisNumero(devisData.info.devisNumero || generateUniqueDevisNumber());
                    if (enDateDu === '05/10/2024') setEnDateDu(devisData.info.enDateDu || '05/10/2024');
                    if (valableJusquau === '04/12/2024') setValableJusquau(devisData.info.valableJusquau || '04/12/2024');
                    if (debutTravaux === '05/10/2024') setDebutTravaux(devisData.info.debutTravaux || '05/10/2024');
                    if (dureeTravaux === '1 jour') setDureeTravaux(devisData.info.dureeTravaux || '1 jour');
                    if (fraisDeplacement === '') setFraisDeplacement(devisData.info.fraisDeplacement || '');
                    if (tauxHoraire === '') setTauxHoraire(devisData.info.tauxHoraire || '');
                    if (isDevisGratuit === true) setIsDevisGratuit(devisData.info.isDevisGratuit !== undefined ? devisData.info.isDevisGratuit : true);
                }
                
                // Mettre à jour les lignes du devis seulement si elles ne sont pas déjà définies
                if (devisData.lines && Array.isArray(devisData.lines) && aggregatedQuote.length === 0) { 
                    setAggregatedQuote(devisData.lines);
                }
                
                // Mettre à jour le taux d'acompte seulement s'il n'est pas déjà défini
                if (devisData.totals && devisData.totals.acompteRate !== undefined && acompteRate === 0.30) {
                    setAcompteRate(devisData.totals.acompteRate);
                }
                 
                
            } catch (error) {
                console.error('❌ Erreur lors du rechargement des données auto-sauvegardées:', error);
            }
        }
    }, [devoTitle, devoName, devoAddress, devoCity, devoSiren, societeBatiment, clientAdresse, clientCodePostal, clientTel, clientEmail, devisNumero, enDateDu, valableJusquau, debutTravaux, dureeTravaux, fraisDeplacement, tauxHoraire, isDevisGratuit, aggregatedQuote.length, acompteRate]);

    // Fonction pour sauvegarder automatiquement les données du devis
    const saveDevisDataToLocalStorage = () => {
        const devisData = {
            info: {
                devoTitle,
                devoName,
                devoAddress,
                devoCity,
                devoSiren,
                societeBatiment,
                clientAdresse,
                clientCodePostal,
                clientTel,
                clientEmail,
                devisNumero,
                enDateDu,
                valableJusquau,
                debutTravaux,
                dureeTravaux,
                fraisDeplacement,
                tauxHoraire,
                isDevisGratuit,
                logo: leftLogoSrc
            },
            lines: aggregatedQuote,
            totals: {
                totalHT,
                totalTVA,
                totalTTC,
                acompte,
                resteAPayer,
                tvaRate,
                acompteRate
            }
        };
        
        localStorage.setItem('devisDataAutoSave', JSON.stringify(devisData)); 
    };

    // Sauvegarder automatiquement les données du devis à chaque changement
    useEffect(() => {
        saveDevisDataToLocalStorage();
    }, [
        devoTitle, devoName, devoAddress, devoCity, devoSiren,
        societeBatiment, clientAdresse, clientCodePostal, clientTel, clientEmail,
        devisNumero, enDateDu, valableJusquau, debutTravaux, dureeTravaux,
        fraisDeplacement, tauxHoraire, isDevisGratuit, leftLogoSrc,
        aggregatedQuote, acompteRate
    ]);



    // Ajouter les frais obligatoires par défaut au devis
    useEffect(() => {
        if (fraisDeplacementOptions.length > 0 && selectedFraisDeplacement === 0) {
            // Sélectionner le premier frais de déplacement par défaut
            const defaultFrais = fraisDeplacementOptions[0];
            setSelectedFraisDeplacement(defaultFrais.id);
            
            // Vérifier si le frais de déplacement n'existe pas déjà dans le devis
            const existingFraisDeplacement = aggregatedQuote.find(item => 
                item.details.includes('Frais de déplacement')
            );
            
            if (!existingFraisDeplacement) {
                const newItem: AggregatedQuoteItem = {
                    details: `Frais de déplacement - ${defaultFrais.libtech} (${formatNumber(defaultFrais.prix)}€/${defaultFrais.unite})`,
                    price: defaultFrais.prix,
                    quantity: 1,
                    unit: defaultFrais.unite,
                    isNew: false
                };
                // Ajouter en première position
                setAggregatedQuote(prev => [newItem, ...prev]);
            }
        }
    }, [fraisDeplacementOptions, selectedFraisDeplacement]);

    useEffect(() => {
        if (fraisHeureOptions.length > 0 && selectedFraisHeure === 0) {
            // Sélectionner le premier frais horaire par défaut
            const defaultFrais = fraisHeureOptions[0];
            setSelectedFraisHeure(defaultFrais.id);
            
            // Vérifier si le frais horaire n'existe pas déjà dans le devis
            const existingFraisHeure = aggregatedQuote.find(item => 
                item.details.includes('Taux horaire')
            );
            
            if (!existingFraisHeure) {
                const newItem: AggregatedQuoteItem = {
                    details: `Taux horaire - ${defaultFrais.libtech} (${formatNumber(defaultFrais.prix)}€/${defaultFrais.unite})`,
                    price: defaultFrais.prix,
                    quantity: 1,
                    unit: defaultFrais.unite,
                    isNew: false
                };
                // Ajouter en deuxième position (après le frais de déplacement)
                setAggregatedQuote(prev => {
                    const fraisDeplacementIndex = prev.findIndex(item => 
                        item.details.includes('Frais de déplacement')
                    );
                    if (fraisDeplacementIndex >= 0) {
                        const newArray = [...prev];
                        newArray.splice(fraisDeplacementIndex + 1, 0, newItem);
                        return newArray;
                    } else {
                        return [newItem, ...prev];
                    }
                });
            }
        }
    }, [fraisHeureOptions, selectedFraisHeure]);

    // Fonction pour gérer la sélection des frais divers
    const handleFraisDiversChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedIds = Array.from(event.target.selectedOptions, option => parseInt(option.value));
        setSelectedFraisDivers(selectedIds);
        
        // Ajouter les frais divers sélectionnés au devis
        selectedIds.forEach(id => {
            const frais = fraisDivers.find(f => f.id === id);
            if (frais) {
                const newItem: AggregatedQuoteItem = {
                    details: `${frais.libtech} (${formatNumber(frais.prix)}€/${frais.unite})`,
                    price: frais.prix,
                    quantity: 1,
                    unit: frais.unite,
                    isNew: true
                };
                // Ajouter après les frais obligatoires
                setAggregatedQuote(prev => {
                    const fraisObligatoiresCount = prev.filter(item => 
                        item.details.includes('Frais de déplacement') || item.details.includes('Taux horaire')
                    ).length;
                    const newArray = [...prev];
                    newArray.splice(fraisObligatoiresCount, 0, newItem);
                    return newArray;
                });
            }
        });
    };

    // Fonction pour gérer la sélection des frais de déplacement
    const handleFraisDeplacementChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = parseInt(event.target.value);
        setSelectedFraisDeplacement(selectedId);
        
        // Mettre à jour le devis avec le frais de déplacement sélectionné
        if (selectedId > 0) {
            const frais = fraisDeplacementOptions.find(f => f.id === selectedId);
            if (frais) {
                // Supprimer l'ancien frais de déplacement s'il existe
                const newQuote = aggregatedQuote.filter(item => !item.details.includes('Frais de déplacement'));
                
                const newItem: AggregatedQuoteItem = {
                    details: `Frais de déplacement - ${frais.libtech} (${formatNumber(frais.prix)}€/${frais.unite})`,
                    price: frais.prix,
                    quantity: 1,
                    unit: frais.unite,
                    isNew: false
                };
                // Toujours en première position
                setAggregatedQuote([newItem, ...newQuote]);
            }
        }
    };

    // Fonction pour gérer la sélection des frais horaires
    const handleFraisHeureChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = parseInt(event.target.value);
        setSelectedFraisHeure(selectedId);
        
        // Mettre à jour le devis avec le frais horaire sélectionné
        if (selectedId > 0) {
            const frais = fraisHeureOptions.find(f => f.id === selectedId);
            if (frais) {
                // Supprimer l'ancien frais horaire s'il existe
                const newQuote = aggregatedQuote.filter(item => !item.details.includes('Taux horaire'));
                
                const newItem: AggregatedQuoteItem = {
                    details: `Taux horaire - ${frais.libtech} (${formatNumber(frais.prix)}€/${frais.unite})`,
                    price: frais.prix,
                    quantity: 1,
                    unit: frais.unite,
                    isNew: false
                };
                // Toujours en deuxième position (après le frais de déplacement)
                const fraisDeplacementIndex = newQuote.findIndex(item => 
                    item.details.includes('Frais de déplacement')
                );
                if (fraisDeplacementIndex >= 0) {
                    const newArray = [...newQuote];
                    newArray.splice(fraisDeplacementIndex + 1, 0, newItem);
                    setAggregatedQuote(newArray);
                } else {
                    // Si pas de frais de déplacement, mettre en première position
                    setAggregatedQuote([newItem, ...newQuote]);
                }
            }
        }
    };

    

         

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
            case 'fraisDeplacement':
                setFraisDeplacement(newValue);
                break;
            case 'tauxHoraire':
                setTauxHoraire(newValue);
                break;
            default:
                break;
        }

        setEditingFieldOutside(null);
        setEditValueOutside('');
    };

    const EditableText = ({fieldName, value}: {fieldName: string; value: string}) => {
        const isEditing = editingFieldOutside === fieldName;
        return isEditMode ? (
            isEditing ? (
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
            )
        ) : (
            <span>{value}</span>
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
            doc.text("UNITÉ", 150, 90);
            doc.text("PRIX U.", 170, 90);
            doc.text("TOTAL HT", 190, 90);
            
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
                doc.text(item.unit || 'U', 150, y);
                doc.text(`${formatNumber(item.price)} €`, 170, y);
                doc.text(`${formatNumber(item.price * item.quantity)} €`, 190, y);
                
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
            doc.text(`Total HT: ${formatNumber(totalHT)} €`, 140, y+10);
            doc.text(`TVA (${(tvaRate * 100).toFixed(2)}%): ${formatNumber(totalTVA)} €`, 140, y+20);
            doc.text(`Total TTC: ${formatNumber(totalTTC)} €`, 140, y+30);
            doc.text(`Acompte (${(acompteRate * 100).toFixed(2)}%): ${formatNumber(acompte)} €`, 140, y+40);
            doc.text(`Reste à payer: ${formatNumber(resteAPayer)} €`, 140, y+50);
            
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

    const fetchData = async (category_id: number) => {
      // Si les données sont déjà chargées, les afficher directement
      if (categoriesData[category_id]) {
        setData(categoriesData[category_id]);
        return;
      }

      // Si les données sont en cours de chargement, ne rien faire
      if (loadingCategories[category_id]) {
        return;
      }

      // Marquer cette catégorie comme en cours de chargement
      setLoadingCategories(prev => ({ ...prev, [category_id]: true }));

      try {
          const response = await fetch(`${BACKEND_URL}/api/categories/${category_id}`);
          if (response.ok) {
              const data = await response.json();
              // Stocker les données dans l'état des catégories
              setCategoriesData(prev => ({ ...prev, [category_id]: data }));
              // Afficher les données
              setData(data); 
          } else {
              console.error('Erreur lors de la récupération des données de la catégorie');
          }
      } catch (error) {
          console.error('Erreur lors de la récupération des données de la catégorie:', error);
      } finally {
          // Marquer cette catégorie comme chargée
          setLoadingCategories(prev => ({ ...prev, [category_id]: false }));
      }
    }

    // Fonction pour charger toutes les catégories au démarrage
    const loadAllCategories = async () => {
      // for (const category of categories) {
      //   if (!categoriesData[category.id]) {
      //     await fetchData(category.id);
      //   }
      // }
    };

    // Charger toutes les catégories au montage du composant
    useEffect(() => {
      loadAllCategories();
    }, []);

    // Component to display category data
    const CategoryDisplay = ({ category }: { category: any }) => {
      const [isOpen, setIsOpen] = useState(false);
      const [showDetails, setShowDetails] = useState(false);

      if (!category) return null;

      const title = category.libelle || category.libelle_parent || `Category ${category.category_id}`;

      return (
        <div className="category" style={{ marginLeft: '20px', marginBottom: '10px' }}>
          <div 
            style={{ 
              cursor: 'pointer', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={() => setIsOpen(!isOpen)}
          >
            <span style={{ marginRight: '10px' }}>
              {isOpen ? '▼' : '▶'}
            </span>
            {title}
          </div>
          
          {isOpen && (
            <div style={{ marginLeft: '20px' }}>
              {category.children && category.children.length > 0 ? (
                category.children.map((child: any, index: number) => (
                  <CategoryDisplay key={index} category={child} />
                ))
              ) : category.final_data && category.final_data.length > 0 ? (
                <div>
                  <div style={{ marginBottom: '10px' }}>
                    {category.final_data.map((item: any, index: number) => (
                      <div key={index} style={{ marginBottom: '5px' }}>
                        <strong>{item.libelle}</strong>: {item.libtech}
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setShowDetails(!showDetails)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {showDetails ? 'Cacher les détails' : 'Plus de détails'}
                  </button>
                  
                  {showDetails && (
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '10px', 
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px'
                    }}>
                      {category.final_data.map((item: any, index: number) => (
                        <div key={index} style={{ marginBottom: '10px' }}>
                          <p><strong>{item.libelle}</strong>: {item.libtech}</p>
                          <p>Prix: {item.prix} {item.unite}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>No data available</div>
              )}
            </div>
          )}
        </div>
      );
    };

    // Function to start the signature process
    const handleRequestSignature = async () => {
        // Vérifier si l'utilisateur est connecté
        if (!user) {
            navigate('/connexion');
            return;
        }
        setShowSignerForm(true);
    };

    // Function to submit the signature request
    const handleSubmitSignatureRequest = async () => {
        if (!signerEmail || !signerFirstName || !signerLastName || !signerPhone) {
            alert('Veuillez remplir tous les champs du signataire');
            return;
        }

        // Validation des frais obligatoires - vérifier seulement qu'il y a au moins une ligne
        if (aggregatedQuote.length < 1) {
            alert('⚠️ OBLIGATOIRE : Le devis doit contenir au moins une ligne');
            return;
        }

        // Validation du frais de devis si le devis n'est pas gratuit
        if (!isDevisGratuit && !aggregatedQuote.some(item => item.details.includes('Frais de devis'))) {
            alert('⚠️ OBLIGATOIRE : Si le devis n\'est pas gratuit, un frais de devis doit être présent');
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

            // 6. Sauvegarder automatiquement le devis avec le statut 'sent' si pas déjà sauvegardé
            try {
                const devisData = prepareDevisData();
                const devisName = `Devis ${devisNumero} - ${societeBatiment}`;
                if (user!=null) {
                  const savedDevis = await DevisService.saveDevisWithUserId(
                    devisName,
                    devisData,
                    user.id,
                    `Devis envoyé pour signature à ${signerEmail}`
                );
                      // Mettre à jour le statut du devis sauvegardé
                      await DevisService.updateDevisStatus(
                        savedDevis.id!,
                        'sent',
                        signatureRequest.id,
                        signerResponse.signature_link
                    );
                     
              }
                
           
            } catch (saveError) {
                console.error('Erreur lors de la sauvegarde automatique du devis:', saveError);
                // Ne pas bloquer le processus de signature si la sauvegarde échoue
            }
        } catch (error) {
            console.error('Error in signature process:', error);
            setSignatureStatus('error');
        }
    };

    // Function to handle close of signer form
    const handleCloseSignerForm = () => {
        setShowSignerForm(false);
    };

    // Fonction pour filtrer les données en fonction du terme de recherche
    const filterData = (data: any, term: string): any => {
      if (!data || !term) return data;
      
      // Créer une copie profonde des données pour ne pas modifier l'original
      const result = JSON.parse(JSON.stringify(data));
      
      // Fonction récursive pour filtrer les données
      const filterRecursive = (node: any): boolean => {
        // Si c'est un nœud final avec des données
        if (node.final_data) {
          // Filtrer les éléments qui correspondent au terme de recherche
          const filteredItems = node.final_data.filter((item: any) => 
            item.libelle?.toLowerCase().includes(term.toLowerCase()) ||
            item.libtech?.toLowerCase().includes(term.toLowerCase())
          );
          
          // Si aucun élément ne correspond, supprimer ce nœud
          if (filteredItems.length === 0) {
            return false;
          }
          
          // Sinon, remplacer les données par les éléments filtrés
          node.final_data = filteredItems;
          return true;
        }
        
        // Si c'est un nœud avec des enfants
        if (node.children) {
          // Filtrer les enfants récursivement
          const filteredChildren = node.children.filter((child: any) => filterRecursive(child));
          
          // Si aucun enfant ne correspond, supprimer ce nœud
          if (filteredChildren.length === 0) {
            return false;
          }
          
          // Sinon, remplacer les enfants par les enfants filtrés
          node.children = filteredChildren;
          return true;
        }
        
        // Si c'est un nœud avec un libellé qui correspond
        if (node.libelle?.toLowerCase().includes(term.toLowerCase()) || 
            node.libelle_parent?.toLowerCase().includes(term.toLowerCase())) {
          return true;
        }
        
        // Par défaut, conserver le nœud
        return true;
      };
      
      // Appliquer le filtre récursif
      filterRecursive(result);
      
      return result;
    };

    // Mettre à jour les données filtrées lorsque le terme de recherche ou les données changent
    useEffect(() => {
      if (data) {
        setFilteredData(filterData(data, searchTerm));
      }
    }, [data, searchTerm]);

    // Gérer le changement de terme de recherche
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };

    // Réinitialiser la recherche
    const resetSearch = () => {
      setSearchTerm('');
    };

    // Update the send invoice function
    const handleSendInvoiceByEmail = async (email: string) => {
      try {
        const invoiceData = {
          logo: devoTitle,
          client: {
            nom: devoName,
            adresse: `${devoAddress}, ${devoCity}`,
            siren: devoSiren
          },
          entreprise: {
            nom: societeBatiment,
            adresse: clientAdresse,
            code_postal: clientCodePostal,
            telephone: clientTel,
            email: clientEmail
          },
          devis: {
            numero: devisNumero,
            date_emission: enDateDu,
            valable_jusqu_au: valableJusquau,
            debut_travaux: debutTravaux,
            duree_estimee: dureeTravaux
          },
          lignes: aggregatedQuote.map((item, index) => ({
            numero: index + 1,
            designation: item.details,
            quantite: item.quantity,
            unite: item.unit || 'U',
            prix_unitaire: item.price,
            tva: tvaRate * 100,
            total_ht: item.price * item.quantity
          })),
          paiement: {
            conditions: `Acompte ${(acompteRate * 100).toFixed(2)}% du total TTC = ${formatNumber(acompte)} € TTC à la signature`,
            reste_a_facturer: resteAPayer,
            moyens_acceptes: ["Chèque", "Espèces"]
          },
          totaux: {
            net_ht: totalHT,
            tva: totalTVA,
            total_ttc: totalTTC,
            net_a_payer: totalTTC
          }
        };

        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Cookie", "csrftoken=hnk2LQf33iUtXrgsu2jHolsCh1FtZHXQ");

        const requestOptions = {
          method: "POST",
          headers: myHeaders,
          body: JSON.stringify(invoiceData),
          redirect: "follow" as RequestRedirect
        };

        const response = await fetch(`${BACKEND_URL}/api/send_invoice_by_email/${encodeURIComponent(email)}`, requestOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.text(); 
        alert("La facture a été envoyée avec succès par email!");
        setShowInvoiceEmailModal(false);
      } catch (error) {
        console.error("Error sending invoice by email:", error);
        alert("Erreur lors de l'envoi de la facture par email. Veuillez réessayer.");
      }
    };

    // Add handler for opening email modal
    const handleOpenInvoiceEmailModal = () => {
        // Vérifier si l'utilisateur est connecté
        if (!user) {
            navigate('/connexion');
            return;
        }
        setShowInvoiceEmailModal(true);
        setInvoiceEmail('');
    };

    // Function to prepare devis data for saving
    const prepareDevisData = (): DevisData => {
        return {
            info: {
                devoTitle,
                devoName,
                devoAddress,
                devoCity,
                devoSiren,
                societeBatiment,
                clientAdresse,
                clientCodePostal,
                clientTel,
                clientEmail,
                devisNumero,
                enDateDu,
                valableJusquau,
                debutTravaux,
                dureeTravaux,
                fraisDeplacement,
                tauxHoraire,
                isDevisGratuit,
                logo: leftLogoSrc
            },
            lines: aggregatedQuote.map(item => ({
                details: item.details,
                price: item.price,
                quantity: item.quantity,
                unit: item.unit
            })),
            totals: {
                totalHT,
                totalTVA,
                totalTTC,
                acompte,
                resteAPayer,
                tvaRate,
                acompteRate
            }
        };
    };

    // Function to handle saving devis with maquette
    const handleSaveDevis = async () => {
        if (!user) {
            navigate('/connexion');
            return;
        }

        if (!devisName.trim()) {
            alert('Veuillez entrer un nom pour le devis');
            return;
        }

        setIsSavingDevis(true);
        try { 
            syncObjectsAndQuote();
            
            const devisData = prepareDevisData();
             
            const maquetteData = {
                objects: quote.map((obj: any) => {
                  
                    
                    return {
                        id: obj.id,
                        url: obj.url,
                        price: obj.price,
                        details: obj.details,
                        position: obj.position,
                        texture: obj.texture,
                        scale: obj.scale,
                        rotation: obj.rotation,
                        color: obj.color,
                        startPoint: obj.startPoint,
                        endPoint: obj.endPoint,
                        parentScale: obj.parentScale,
                        boundingBox: obj.boundingBox,
                        faces: obj.faces,
                        type: obj.type,
                        parametricData: obj.parametricData,
                        isBatiChiffrageObject: obj.isBatiChiffrageObject || false
                    };
                })
            };

            // Sauvegarder le devis avec sa maquette associée
            const { devis, maquette } = await DevisService.saveDevisWithMaquette(
                devisName.trim(),
                devisData,
                maquetteData,
                devisDescription.trim() || undefined,
                user.id
            );
            
            console.log('Devis et maquette sauvegardés avec succès:', { devis, maquette });
            alert('Devis et maquette sauvegardés avec succès!');
            setShowSaveDevisModal(false);
            setDevisName('');
            setDevisDescription('');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du devis:', error);
            alert('Erreur lors de la sauvegarde du devis. Veuillez réessayer.');
        } finally {
            setIsSavingDevis(false);
        }
    };


    // Function to open save devis modal
    const handleOpenSaveDevisModal = () => {
        if (!user) {
            navigate('/connexion');
            return;
        }
        
        // Set default name based on client and devis number
        const defaultName = `Devis ${devisNumero} - ${societeBatiment}`;
        setDevisName(defaultName);
        setShowSaveDevisModal(true);
    };

        // Add handler for submitting email
    const handleSubmitInvoiceEmail = () => {
        if (!invoiceEmail || !invoiceEmail.includes('@')) {
            alert('Veuillez entrer une adresse email valide');
            return;
        }

        // Validation des frais obligatoires - vérifier seulement qu'il y a au moins une ligne
        if (aggregatedQuote.length < 1) {
            alert('⚠️ OBLIGATOIRE : Le devis doit contenir au moins une ligne');
            return;
        }

        // Validation du frais de devis si le devis n'est pas gratuit
        if (!isDevisGratuit && !aggregatedQuote.some(item => item.details.includes('Frais de devis'))) {
            alert('⚠️ OBLIGATOIRE : Si le devis n\'est pas gratuit, un frais de devis doit être présent');
            return;
        }

        handleSendInvoiceByEmail(invoiceEmail);
    };

    // Fonction pour basculer entre les modes
    const toggleMode = () => {
        setIsEditMode(!isEditMode);
    };

    return (
      <div style={{ 
        display: 'flex', 
        height: '100vh',
        overflow: 'hidden'
      }}>
        {/* Colonne de gauche - Devis */}
        <div style={{ 
          flex: '1',
          overflowY: 'auto',
          padding: '20px',
          borderRight: '1px solid #ddd'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <button className='full-quote-button' onClick={handleBack}>
              RETOUR
            </button>
            <button className='full-quote-button mode-toggle' onClick={toggleMode}>
              {isEditMode ? 'MODE LECTURE' : 'MODE EDITION'}
            </button>
          </div>
          
          <div className="container" ref={quoteRef} style={{ marginBottom: '30px' }}>
            <header>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ 
                  padding: '15px', 
                  borderRadius: '4px',
                  width: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  {leftLogoSrc ? (
                    <>
                      <div style={{
                        width: '200px',
                        height: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        backgroundColor: '#ffffff'
                      }}>
                        <img 
                          src={leftLogoSrc} 
                          alt="Logo" 
                          style={{ 
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain'
                          }} 
                        />
                      </div>
                      {isEditMode && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
                          <button 
                            onClick={handleLogoClick}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#f8f9fa',
                              border: '1px solid #dee2e6',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: '#6c757d',
                              fontSize: '12px',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                          >
                            Modifier le logo
                          </button>
                          <button 
                            onClick={handleDeleteLogo}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#f8f9fa',
                              border: '1px solid #dee2e6',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: '#dc3545',
                              fontSize: '12px',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                          >
                            Supprimer le logo
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    isEditMode && (
                      <div 
                        onClick={handleLogoClick}
                        style={{
                          width: '200px',
                          height: '100px',
                          backgroundColor: '#f8f9fa',
                          border: '2px dashed #2D3C54',
                          borderRadius: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          gap: '8px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      >
                        <span style={{ fontSize: '24px' }}>📁</span>
                        <span style={{ fontSize: '14px', color: '#2D3C54' }}>Upload le logo</span>
                      </div>
                    )
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{display:'none'}}
                    onChange={handleLogoChange}
                    accept="image/*"
                  />
                </div>
                                                  <div className="devis-header" style={{ border: '1px solid #2D3C54', padding: '15px', borderRadius: '4px' }}>
                   
                   <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                     <table className='info-table-devis'>
                       <tbody>
                                                   <tr>
                            <td>Devis n°</td>
                            <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <EditableText fieldName="devisNumero" value={devisNumero} />
                              
                            </td>
                          </tr>
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
                                                                                                                                 {(!isDevisGratuit && !isEditMode) ? null : (
                            <tr>
<td>Devis établi { !isEditMode ? (isDevisGratuit ? 'gratuitement' : 'payant') : '' }</td>
<td>
                                {isEditMode ? (
                                  <select
                                    value={isDevisGratuit ? 'gratuit' : 'payant'}
                                    onChange={(e) => {
                                      const isGratuit = e.target.value === 'gratuit';
                                      setIsDevisGratuit(isGratuit);
                                      
                                      if (isGratuit) {
                                        // Si le devis devient gratuit, supprimer les frais de devis
                                        const newQuote = aggregatedQuote.filter(item => !item.details.includes('Frais de devis'));
                                        setAggregatedQuote(newQuote);
                                      } else {
                                        // Si le devis devient payant, récupérer automatiquement le frais de devis depuis l'API
                                        fetch(`${BACKEND_URL}/api/frais/devis`)
                                          .then(response => response.json())
                                          .then(data => {
                                            if (data && data.length > 0) {
                                              const fraisDevis = data[0]; // Prendre le premier frais de devis
                                              
                                              // Supprimer l'ancien frais de devis s'il existe
                                              const newQuote = aggregatedQuote.filter(item => !item.details.includes('Frais de devis'));
                                              
                                              const newItem: AggregatedQuoteItem = {
                                                details: `Frais de devis - ${fraisDevis.libtech} (${formatNumber(fraisDevis.prix)}€/${fraisDevis.unite})`,
                                                price: fraisDevis.prix,
                                                quantity: 1,
                                                unit: fraisDevis.unite,
                                                isNew: false
                                              };
                                              
                                              // Ajouter après les frais obligatoires (en position 3 ou plus)
                                              const fraisObligatoiresCount = newQuote.filter(item => 
                                                item.details.includes('Frais de déplacement') || item.details.includes('Taux horaire')
                                              ).length;
                                              const newArray = [...newQuote];
                                              newArray.splice(fraisObligatoiresCount, 0, newItem);
                                              setAggregatedQuote(newArray);
                                            }
                                          })
                                          .catch(error => {
                                            console.error('Erreur lors de la récupération des frais de devis:', error);
                                          });
                                      }
                                    }}
                                    style={{
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      padding: '4px 8px',
                                      fontSize: '12px',
                                      backgroundColor: '#fff',
                                      width: '100%',
                                      maxWidth: '110px'
                                    }}
                                  >
                                    <option value="gratuit">Gratuitement</option>
                                    <option value="payant">Payant</option>
                                  </select>
                                ) : (
                                 <span></span>
                                )}
                              </td>
                            </tr>
                          )}
                       </tbody>
                     </table>
                   </div>
                 </div>
              </div>
            </header>

            <div className="infoclient-infodevis" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <section className="info-client" style={{ textAlign: 'left', width: '45%' }}>
                <h2>
                  <EditableText fieldName="devoTitle" value={devoTitle} />
                </h2><br/>
                <div>
                  <table className='info-table-client'>
                    <tbody>
                      <tr>
                        <td>Nom</td>
                        <td>
                          <EditableText fieldName="devoName" value={devoName} />
                        </td>
                      </tr>
                      <tr>
                        <td>Adresse</td>
                        <td>
                          <EditableText fieldName="devoAddress" value={devoAddress} />
                        </td>
                      </tr>
                      <tr>
                        <td>Ville</td>
                        <td>
                          <EditableText fieldName="devoCity" value={devoCity} />
                        </td>
                      </tr>
                      <tr>
                        <td>SIREN</td>
                        <td>
                          <EditableText fieldName="devoSiren" value={devoSiren} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="info-client" style={{ textAlign: 'right', width: '40%' }}>
                <div className="devis-header" style={{ 
                  border: '1px solid #2D3C54', 
                  padding: '15px', 
                  borderRadius: '4px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <h2 style={{ marginBottom: '15px', textAlign: 'center' }}>
                    <EditableText fieldName="societeBatiment" value={societeBatiment} />
                  </h2>
                  <div>
                    <table className='info-table-client' style={{ marginLeft: 'auto', width: '100%' }}>
                      <tbody>
                        <tr>
                          <td style={{ paddingRight: '5px' }}>Adresse</td>
                          <td>
                            <EditableText fieldName="clientAdresse" value={clientAdresse} />
                          </td>
                        </tr>
                        <tr>
                          <td style={{ paddingRight: '5px' }}>Code Postal</td>
                          <td>
                            <EditableText fieldName="clientCodePostal" value={clientCodePostal} />
                          </td>
                        </tr>
                        <tr>
                          <td style={{ paddingRight: '5px' }}>Tel</td>
                          <td>
                            <EditableText fieldName="clientTel" value={clientTel} />
                          </td>
                        </tr>
                        <tr>
                          <td style={{ paddingRight: '5px' }}>Email</td>
                          <td>
                            <EditableText fieldName="clientEmail" value={clientEmail} />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>

            <br></br><br></br>

            <table className='table-border'>
              <thead>
                <tr className='blue'>
                  <th>N°</th>
                  <th>DÉSIGNATION</th>
                  <th>QTÉ</th>
                  <th>UNITÉ</th>
                  <th>PRIX U.</th>
                  <th>TVA</th>
                  <th>TOTAL HT</th>
                  {isEditMode && <th>Actions</th>}
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
                         style={{ position: 'relative', cursor: isEditMode ? 'pointer' : 'default' }}
                       >
                         {isEditMode && isEditingDetails ? (
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
                                 {suggestions.map((suggestion: string, index: number) => (
                                   <div
                                       key={index}
                                       onMouseDown={(e: React.MouseEvent) => {
                                           e.preventDefault();
                                       }}
                                       onClick={(e: React.MouseEvent) => {
                                           e.preventDefault();
                                           e.stopPropagation();
                                           setIsSuggestionClicking(true);
                                           
                                           if (currentSuggestionData && currentSuggestionData[index] && editingCell) {
                                               const {rowIndex} = editingCell;
                                               const selectedData = currentSuggestionData[index];
                                               
                                               const newQuote = [...aggregatedQuote];
                                               newQuote[rowIndex] = {
                                                   ...newQuote[rowIndex],
                                                   details: selectedData.libtech,
                                                   price: selectedData.prix,
                                                   quantity: 1,
                                                   unit: selectedData.unite,
                                                   isNew: false
                                               };
                                               setAggregatedQuote(newQuote);
                                               setEditingCell(null);
                                               setEditValue('');
                                               setSuggestions([]);
                                               setCurrentSuggestionData(null);
                                               
                                               setTimeout(() => {
                                                   setIsSuggestionClicking(false);
                                               }, 300);
                                           }
                                       }}
                                       style={{
                                           padding: '8px 12px',
                                           cursor: 'pointer',
                                           backgroundColor: index === selectedSuggestionIndex ? '#e9f5ff' : 'white',
                                           color: '#333',
                                           fontWeight: index === selectedSuggestionIndex ? 'bold' : 'normal',
                                           borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none'
                                       }}
                                   >
                                       {suggestion}
                                   </div>
                                 ))}
                               </div>
                             )}
                           </>
                                                   ) : item.details.includes('Frais de déplacement') ? (
                                                                                      isEditMode ? (
                                                             <select
                                 value={selectedFraisDeplacement}
                                 onChange={handleFraisDeplacementChange}
                                 style={{
                                   border: '1px solid #ddd',
                                   borderRadius: '4px',
                                   padding: '6px 8px',
                                   fontSize: '12px',
                                   backgroundColor: '#fff',
                                   width: '100%',
                                   maxWidth: '350px',
                                   lineHeight: '1.4',
                                   minHeight: '35px'
                                 }}
                               >
                                 <option value={0}>Sélectionner un frais de déplacement</option>
                                 {fraisDeplacementOptions.map((frais) => (
                                   <option key={frais.id} value={frais.id}>
                                     {frais.libtech} | Prix: {formatNumber(frais.prix)}€/{frais.unite}
                                   </option>
                                 ))}
                               </select>
                            ) : (
                              <span>{item.details}</span>
                            )
                          ) : item.details.includes('Taux horaire') ? (
                                                        isEditMode ? (
                                                             <select
                                 value={selectedFraisHeure}
                                 onChange={handleFraisHeureChange}
                                 style={{
                                   border: '1px solid #ddd',
                                   borderRadius: '4px',
                                   padding: '6px 8px',
                                   fontSize: '12px',
                                   backgroundColor: '#fff',
                                   width: '100%',
                                   maxWidth: '350px',
                                   lineHeight: '1.4',
                                   minHeight: '35px'
                                 }}
                               >
                                 <option value={0}>Sélectionner un taux horaire</option>
                                 {fraisHeureOptions.map((frais) => (
                                   <option key={frais.id} value={frais.id}>
                                     {frais.libtech} | Prix: {formatNumber(frais.prix)}€/{frais.unite}
                                   </option>
                                 ))}
                               </select>
                            ) : (
                              <span>{item.details}</span>
                            )
                         ) : (
                           <span onClick={() => isEditMode && handleCellClick(index, 'details')}>
                             {item.details}
                           </span>
                         )}
                       </td>
                      <td
                        onClick={() => isEditMode && handleCellClick(index, 'quantity')}
                        style={{ cursor: isEditMode ? 'pointer' : 'default' }}
                      >
                        {isEditMode && isEditingQuantity ? 
                          <input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                          />
                          : `${formatNumber(item.quantity)}`}
                      </td>
                      <td>{item.unit || 'U'}</td>
                      <td
                        onClick={() => isEditMode && handleCellClick(index, 'price')}
                        style={{ cursor: isEditMode ? 'pointer' : 'default' }}
                      >
                        {isEditMode && isEditingPrice ? 
                          <input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                          />
                          : `${formatNumber(item.price)} €`}
                      </td>
                      <td>{(tvaRate * 100).toFixed(2)} %</td>
                      <td>{formatNumber(item.price * item.quantity)} €</td>
                                             {isEditMode && (
                         <td>
                           <button 
                             onClick={() => handleDeleteRow(index)}
                             style={{
                               backgroundColor: '#dc3545',
                               color: 'white',
                               border: 'none',
                               borderRadius: '4px',
                               padding: '4px 8px',
                               cursor: 'pointer',
                               fontSize: '12px'
                             }}
                             title="Supprimer cette ligne"
                           >
                             Supprimer
                           </button>
                         </td>
                       )}
                    </tr>
                  );
                })}
                {isEditMode && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '10px' }}>
                      <button 
                        onClick={handleAddRow} 
                        className="add-row-button"
                      >
                        +
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
                         </table>

            <div className="condition-total">
              <div className="payment-info">
                <p><strong>Conditions de paiement :</strong></p>
                <p>
                  Acompte {isEditMode && editingAcompte ? (
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
                    <span 
                      onClick={() => isEditMode && handleAcompteClick} 
                      style={{
                        cursor: isEditMode ? 'pointer' : 'default',
                        textDecoration: isEditMode ? 'underline' : 'none'
                      }}
                    >
                      {(acompteRate * 100).toFixed(2)}%
                    </span>
                                      )} du total TTC = {formatNumber(acompte)} € TTC à la signature
                  <br/>
                  Reste à facturer : {formatNumber(resteAPayer)} € TTC
                  <br/>
                  Méthodes de paiement acceptées : Chèque, Espèces.
                </p>
              </div>
              <div className="totals">
                <table className='table-border'>
                  <tbody>
                    <tr>
                      <td className='size_description_price'><strong>Total net HT</strong></td>
                      <td className='size_price'><strong>{formatNumber(totalHT)} €</strong></td>
                    </tr>
                    <tr>
                      <td>TVA { (tvaRate * 100).toFixed(2) } %</td>
                      <td>{formatNumber(totalTVA)} €</td>
                    </tr>
                    <tr>
                      <td><strong>Total TTC</strong></td>
                      <td><strong>{formatNumber(totalTTC)} €</strong></td>
                    </tr>
                    <tr className='blue'>
                      <td>NET À PAYER</td>
                      <td>{formatNumber(totalTTC)} €</td>
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

        {/* Colonne de droite - Contrôles et catégories */}
        <div style={{ 
          width: '400px',
          overflowY: 'auto',
          padding: '20px',
          backgroundColor: '#f8f9fa'
        }}>
          {/* Save Devis Button */}
          <div className="devis-actions" style={{ marginBottom: '20px' }}>
            <button
              onClick={handleOpenSaveDevisModal}
              style={{
                padding: '10px 20px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                width: '100%',
                marginBottom: '10px'
              }}
            >
              💾 Sauvegarder le devis
            </button>
            
            {/* Electronic Signature Button */}
            <div className="signature-actions" style={{ marginBottom: '10px' }}>
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
                    fontSize: '16px',
                    width: '100%',
                    marginBottom: '10px'
                  }}
                >
                  Demander signature électronique
                </button>
              )}
              <button
                onClick={handleOpenInvoiceEmailModal}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  width: '100%'
                }}
              >
                Envoyer la facture électronique
              </button>
            
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
                      borderRadius: '4px',
                      width: '100%',
                      textAlign: 'center'
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
          </div>
          
                     

           {/* Frais Divers Section */}
           <div style={{ 
             backgroundColor: '#ffffff',
             borderRadius: '8px',
             boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
             padding: '15px',
             marginBottom: '20px'
           }}>
             <h3 style={{ marginBottom: '10px' }}>Frais divers</h3>
             <select
               multiple
               value={selectedFraisDivers.map(String)}
               onChange={handleFraisDiversChange}
               style={{
                 width: '100%',
                 padding: '8px',
                 borderRadius: '4px',
                 border: '1px solid #ddd',
                 minHeight: '100px',
                 marginBottom: '8px'
               }}
             >
               {fraisDivers.map((frais) => (
                 <option key={frais.id} value={frais.id}>
                   {frais.libtech} - {formatNumber(frais.prix)}€/{frais.unite}
                 </option>
               ))}
             </select>
             <p style={{ 
               fontSize: '12px', 
               color: '#666', 
               margin: '0',
               fontStyle: 'italic'
             }}>
               Maintenez la touche Ctrl (ou Cmd sur Mac) pour sélectionner plusieurs frais
             </p>
           </div>
          
          {/* Categories Section */}
          <div style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '15px'
          }}>
            <h3 style={{ marginBottom: '10px' }}>Catégories d'objets</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Catégorie</th>
                  <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{category.name}</td>
                    <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>
                      <button 
                        onClick={() => fetchData(category.id)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: loadingCategories[category.id] ? '#cccccc' : '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: loadingCategories[category.id] ? 'wait' : 'pointer'
                        }}
                        disabled={loadingCategories[category.id]}
                      >
                        {loadingCategories[category.id] ? 'Chargement...' : 'Afficher'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data && (
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '15px'
                }}>
                  <input
                    type="text"
                    placeholder="Rechercher dans les données..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      marginRight: '10px'
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={resetSearch}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
                {searchTerm && (
                  <div style={{ 
                    marginBottom: '10px',
                    padding: '8px',
                    backgroundColor: '#e9f5ff',
                    borderRadius: '4px',
                    border: '1px solid #b8daff'
                  }}>
                    <strong>Recherche :</strong> "{searchTerm}" - {filteredData ? 'Résultats filtrés' : 'Aucun résultat'}
                  </div>
                )}
                {filteredData ? <CategoryDisplay category={filteredData} /> : <CategoryDisplay category={data} />}
              </div>
            )}
          </div>
        </div>

        {/* Modals remain unchanged */}
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

        {showInvoiceEmailModal && (
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
              <h3 style={{ marginTop: 0 }}>Envoyer la facture par email</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Email du destinataire</label>
                <input
                  type="email"
                  value={invoiceEmail}
                  onChange={e => setInvoiceEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  placeholder="exemple@email.com"
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => setShowInvoiceEmailModal(false)}
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
                  onClick={handleSubmitInvoiceEmail}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Devis Modal */}
        {showSaveDevisModal && (
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
              <h3 style={{ marginTop: 0 }}>Sauvegarder le devis</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Nom du devis *</label>
                <input
                  type="text"
                  value={devisName}
                  onChange={e => setDevisName(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  placeholder="Nom du devis"
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Description (optionnel)</label>
                <textarea
                  value={devisDescription}
                  onChange={e => setDevisDescription(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    boxSizing: 'border-box',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  placeholder="Description du devis..."
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => setShowSaveDevisModal(false)}
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
                  onClick={handleSaveDevis}
                  disabled={isSavingDevis}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: isSavingDevis ? '#6c757d' : '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isSavingDevis ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSavingDevis ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

export default FullQuote;
