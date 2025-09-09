import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/Quote.css';
import { useMaquetteStore } from '../store/maquetteStore'; 
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { BACKEND_URL } from '../config/env';
import { useAuth } from '../hooks/useAuth';
import { DevisService, DevisData } from '../services/DevisService';
import { MaquetteService } from '../services/MaquetteService';
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
    tva?: number; // Taux de TVA pour cette ligne (par défaut 0.20 = 20%)
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
    const location = useLocation();
    const { quote } = useMaquetteStore();
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
    
    // États pour la modification de devis existants
    const [originalDevisId, setOriginalDevisId] = useState<string | null>(null);
    const [originalMaquetteId, setOriginalMaquetteId] = useState<string | null>(null);
    const [originalDevisName, setOriginalDevisName] = useState<string | null>(null);
    const [originalDevisDescription, setOriginalDevisDescription] = useState<string | null>(null);
    const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);
    
    // État pour les données complètes de la maquette
    const [maquetteData, setMaquetteData] = useState<any>(null);

    // Agrégation initiale des articles - utiliser useMemo pour éviter les recalculs
    const initialAggregated: AggregatedQuoteItem[] = useMemo(() => {
      console.log('🔄 FullQuote - Recalcul de initialAggregated avec', quote.length, 'objets');
      return quote.reduce((acc, item) => {
      console.log('🔍 FullQuote.initialAggregated - Traitement de l\'objet:', {
        id: item.id,
        details: item.details,
        isBatiChiffrageObject: item.isBatiChiffrageObject,
        hasParametricData: !!item.parametricData,
        parametricData: item.parametricData
      });
      
      let details: string;
      let unit: string | undefined;
      
      // Vérification sécurisée de la structure des données
      if (item.parametricData && item.parametricData.item_details) {
        details = item.parametricData.item_details.libtech || item.details || 'Produit sans nom';
        unit = item.parametricData.item_details.unite || 'U';
        console.log('✅ FullQuote.initialAggregated - Utilisation de parametricData:', {
          libtech: item.parametricData.item_details.libtech,
          unite: item.parametricData.item_details.unite,
          finalDetails: details,
          finalUnit: unit
        });
      } else {
        details = item.details || 'Produit sans nom';
        unit = 'U';
        console.log('⚠️ FullQuote.initialAggregated - Utilisation de item.details:', {
          details: details,
          unit: unit
        });
      }
      
      const existingItem = acc.find(
          (i) => i.details === details && i.price === item.price
      );
      if (existingItem) {
          // Si l'élément existe déjà, ajouter la quantité existante ou 1
          existingItem.quantity += item.quantity || 1;
          console.log('🔄 FullQuote.initialAggregated - Quantité mise à jour pour:', details, 'nouvelle quantité:', existingItem.quantity);
      } else {
          // Utiliser la quantité existante de l'item ou 1 par défaut
          const newItem = { 
              details: details, 
              price: item.price, 
              quantity: item.quantity || 1, 
              unit: unit 
          };
          acc.push(newItem);
          console.log('✅ FullQuote.initialAggregated - Nouvel item ajouté:', newItem);
      }
      return acc;
    }, [] as AggregatedQuoteItem[]);
    }, [quote]); // Dépendance sur quote

    const [aggregatedQuote, setAggregatedQuote] = useState<AggregatedQuoteItem[]>(initialAggregated);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState<boolean>(false);

    // Synchroniser aggregatedQuote avec initialAggregated quand il change
    useEffect(() => {
        console.log('🔄 FullQuote - Synchronisation de aggregatedQuote avec initialAggregated');
        console.log('🔄 FullQuote - initialAggregated:', initialAggregated);
        setAggregatedQuote(initialAggregated);
    }, [initialAggregated]);

    // Fonction pour supprimer une ligne
    const handleDeleteRow = (index: number) => {
        const newQuote = [...aggregatedQuote];
        newQuote.splice(index, 1);
        setAggregatedQuote(newQuote);
    
    };

    

    // Paramètres d'Acompte
    const [acompteRate, setAcompteRate] = useState<number>(0.30);

    const totalHT = aggregatedQuote.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalTVA = aggregatedQuote.reduce((sum, item) => {
        const itemTva = item.tva || 0.20; // Par défaut 20% si non défini
        return sum + (item.price * item.quantity * itemTva);
    }, 0);
    const totalTTC = totalHT + totalTVA;
    const acompte = totalTTC * acompteRate;
    const resteAPayer = totalTTC - acompte;

    const handleBack = () => {
        console.log('🔙 Retour vers la maquette - Démarrage...');
        console.log('📊 État actuel avant retour:', {
            aggregatedQuoteLength: aggregatedQuote.length,
            isEditingExisting,
            originalDevisId
        });
        
        // Préparer les données complètes du devis pour la navigation
        const devisData = {
            info: {
                devoTitle,
                devoName,
                devoAddress,
                devoCity,
                devoSiren,
                devoStatutJuridique,
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
                acompteRate
            },
            originalDevisId,
            originalMaquetteId,
            originalDevisName,
            originalDevisDescription,
            isEditingExisting
        };
        
        console.log('💾 Données préparées pour navigation vers maquette:', devisData); 
        
        // Synchroniser les données du devis avec le store maquetteStore
        console.log('🔄 Synchronisation avec le store maquetteStore...');
        console.log('📋 Conversion de', aggregatedQuote.length, 'lignes vers ObjectData');
        
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
                // Garder les propriétés originales de l'élément existant et ajouter la quantité
                return {
                    ...existingItem,
                    price: item.price,
                    details: item.details,
                    quantity: item.quantity // Préserver la quantité
                };
            } else {
                // Créer un nouvel élément de devis avec la quantité
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
                    isBatiChiffrageObject: false,
                    quantity: item.quantity // Ajouter la quantité
                };
            }
        });
        
        // Mettre à jour le store avec les nouvelles données du devis
        console.log('🔄 Mise à jour du store avec', updatedQuote.length, 'éléments');
        
        // Afficher les informations générales du devis qui sont synchronisées
        console.log('🏢 Informations générales du devis synchronisées:', {
            entreprise: {
                devoTitle,
                devoName,
                devoAddress,
                devoCity,
                devoSiren
            },
            client: {
                societeBatiment,
                clientAdresse,
                clientCodePostal,
                clientTel,
                clientEmail
            },
            devis: {
                devisNumero,
                enDateDu,
                valableJusquau,
                debutTravaux,
                dureeTravaux,
                isDevisGratuit
            },
            totaux: {
                totalHT: totalHT.toFixed(2),
                totalTTC: totalTTC.toFixed(2),
                acompteRate: (acompteRate * 100).toFixed(2) + '%'
            },
            logo: leftLogoSrc ? 'PRÉSENT (' + leftLogoSrc.length + ' caractères)' : 'ABSENT',
            mode: isEditingExisting ? 'MODIFICATION' : 'CRÉATION',
            originalIds: isEditingExisting ? {
                devisId: originalDevisId,
                maquetteId: originalMaquetteId,
                nom: originalDevisName
            } : 'N/A'
        });
        
        
        // ❌ SUPPRIMÉ : syncObjectsAndQuote(updatedQuote) car cela écrase les bonnes données
        // Les données sont déjà correctement préparées dans updatedQuote
        console.log('✅ Synchronisation terminée (sans syncObjectsAndQuote)');
        
        // Navigation avec les données via state au lieu du localStorage
        console.log('🚀 Navigation vers /maquette avec données...');
        navigate('/maquette', {
            state: {
                devisData: devisData,
                fromFullQuote: true
            }
        });
    };

    // Fonction pour nettoyer le localStorage lors de la sauvegarde définitive (legacy)
    const cleanupDevisDataFromLocalStorage = () => {
        localStorage.removeItem('devisDataToLoad');
        localStorage.removeItem('devisMetadataForMaquette');
        console.log('🧹 localStorage legacy nettoyé après sauvegarde');
    };

    // Function to add a new empty row to the quote
    const handleAddRow = () => {
        const newItem: AggregatedQuoteItem = {
            details: "Nouveau produit",
            price: 0,
            quantity: 1,
            isNew: true,
            tva: 0.20 // TVA par défaut à 20%
        };
        
        console.log('➕ Ajout d\'une nouvelle ligne manuelle:', newItem);
        
        setAggregatedQuote(prev => {
            const newArray = [...prev, newItem];
            console.log('📋 Nombre total de lignes après ajout:', newArray.length);
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
        console.log(isFetchingSuggestions)
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

    // Gestion de l'édition du taux de TVA par ligne
    const [editingTvaLine, setEditingTvaLine] = useState<number | null>(null);

    const handleTvaClick = (lineIndex: number) => {
        if (isEditMode) {
            setEditingTvaLine(lineIndex);
        }
    };

    const handleTvaRateSelect = (lineIndex: number, rate: number) => {
        const newAggregated = [...aggregatedQuote];
        newAggregated[lineIndex].tva = rate / 100;
        setAggregatedQuote(newAggregated);
        setEditingTvaLine(null);
    };

    // Fonctions pour gérer les champs clients supplémentaires
    const addAdditionalClientField = () => {
        const newField = {
            id: `field_${Date.now()}`,
            label: 'Nouveau champ',
            value: ''
        };
        setAdditionalClientFields(prev => [...prev, newField]);
    };

    const removeAdditionalClientField = (fieldId: string) => {
        setAdditionalClientFields(prev => prev.filter(field => field.id !== fieldId));
    };

    const updateAdditionalClientField = (fieldId: string, field: 'label' | 'value', newValue: string) => {
        setAdditionalClientFields(prev => 
            prev.map(f => f.id === fieldId ? { ...f, [field]: newValue } : f)
        );
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
            
            // Convertir l'image en base64 pour une persistance fiable
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setLeftLogoSrc(event.target.result as string);
                }
            };
            reader.readAsDataURL(newLogo);
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
    const [devoStatutJuridique, setDevoStatutJuridique] = useState<string>('SAS');

    // Informations client
    const [societeBatiment, setSocieteBatiment] = useState<string>('Société Bâtiment');
    const [clientAdresse, setClientAdresse] = useState<string>('20 rue le blanc');
    const [clientCodePostal, setClientCodePostal] = useState<string>('75013 Paris');
    const [clientTel, setClientTel] = useState<string>('0678891223');
    const [clientEmail, setClientEmail] = useState<string>('sociétébatiment@gmail.com');

    // État pour les champs clients supplémentaires
    const [additionalClientFields, setAdditionalClientFields] = useState<Array<{id: string, label: string, value: string}>>([]);

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

   
    // État pour les frais divers
    const [fraisDivers, setFraisDivers] = useState<FraisDivers[]>([]);
    const [selectedFraisDivers, setSelectedFraisDivers] = useState<number[]>([]);

    // État pour les frais obligatoires 
    
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

    


    

         // Appel de la fonction au chargement du composant
     useEffect(() => {
         fetchFraisDivers();
     }, []);

    // Charger les données du devis depuis location.state ou localStorage (fallback)
    useEffect(() => {
        console.log('🔄 FullQuote - Démarrage du chargement des données');
        console.log('📂 Vérification de location.state...', location.state);
        
        // D'abord, vérifier s'il y a des données dans location.state
        if (location.state) {
            const { quote: quoteLine, devisData, maquetteData: receivedMaquetteData, fromMaquette } = location.state;
            
            if (fromMaquette && quoteLine) {
                // Données venant de MaquettePage via QuotePanel
                console.log('📊 Données reçues depuis MaquettePage:', quoteLine.length, 'lignes');
                // ❌ SUPPRIMÉ : setAggregatedQuote(quoteLine) car cela écrase les bonnes données agrégées
                // Les données seront correctement agrégées par initialAggregated
                console.log('✅ Lignes de devis chargées depuis navigation (agrégation automatique)');
                
                // Sauvegarder les données de maquette si disponibles
                if (receivedMaquetteData) {
                    setMaquetteData(receivedMaquetteData);
                    console.log('🏗️ Données de maquette sauvegardées:', receivedMaquetteData.objects?.length || 0, 'objets');
                }
                
                // Si on a aussi des métadonnées, les charger
                if (devisData) {
                    console.log('📊 Métadonnées également reçues depuis MaquettePage');
                    // Charger les informations depuis les métadonnées
                    if (devisData.info) {
                        console.log('📝 Chargement des informations depuis métadonnées MaquettePage');
                        setDevoTitle(devisData.info.devoTitle || 'BatiDevis');
                        setDevoName(devisData.info.devoName || 'Chen Emma');
                        setDevoAddress(devisData.info.devoAddress || '73 Rue Rateau');
                        setDevoCity(devisData.info.devoCity || '93120 La Courneuve, France');
                        setDevoSiren(devisData.info.devoSiren || 'SIREN : 000.000.000.000');
                        setDevoStatutJuridique(devisData.info.devoStatutJuridique || 'SAS');
                        setSocieteBatiment(devisData.info.societeBatiment || 'Société Bâtiment');
                        setClientAdresse(devisData.info.clientAdresse || '20 rue le blanc');
                        setClientCodePostal(devisData.info.clientCodePostal || '75013 Paris');
                        setClientTel(devisData.info.clientTel || '0678891223');
                        setClientEmail(devisData.info.clientEmail || 'sociétébatiment@gmail.com');
                        setAdditionalClientFields(devisData.info.additionalClientFields || []);
                        setDevisNumero(devisData.info.devisNumero || generateUniqueDevisNumber());
                        setEnDateDu(devisData.info.enDateDu || '05/10/2024');
                        setValableJusquau(devisData.info.valableJusquau || '04/12/2024');
                        setDebutTravaux(devisData.info.debutTravaux || '05/10/2024');
                        setDureeTravaux(devisData.info.dureeTravaux || '1 jour');
                        setIsDevisGratuit(devisData.info.isDevisGratuit !== undefined ? devisData.info.isDevisGratuit : true);
                        
                        if (devisData.info.logo) {
                            console.log('🖼️ Logo récupéré depuis métadonnées MaquettePage:', devisData.info.logo.length, 'caractères');
                            setLeftLogoSrc(devisData.info.logo);
                        }
                    }
                    
                    // Charger les informations de modification
                    if (devisData.originalDevisId && devisData.originalMaquetteId) {
                        console.log('🔄 Mode modification détecté depuis métadonnées MaquettePage');
                        setOriginalDevisId(devisData.originalDevisId);
                        setOriginalMaquetteId(devisData.originalMaquetteId);
                        setOriginalDevisName(devisData.originalDevisName || null);
                        setOriginalDevisDescription(devisData.originalDevisDescription || null);
                        setIsEditingExisting(true);
                    }
                    
                    // Charger les totaux
                    if (devisData.totals && devisData.totals.acompteRate !== undefined) {
                        setAcompteRate(devisData.totals.acompteRate);
                        console.log('💰 Taux d\'acompte récupéré depuis métadonnées MaquettePage:', devisData.totals.acompteRate);
                    }
                }
            } else if (devisData) {
                // Données complètes venant d'un devis existant
                console.log('📊 Données complètes reçues depuis navigation:', devisData);
                
                // Charger les informations depuis les données de navigation
                if (devisData.info) {
                    console.log('📝 Chargement des informations depuis navigation');
                    setDevoTitle(devisData.info.devoTitle || 'BatiDevis');
                    setDevoName(devisData.info.devoName || 'Chen Emma');
                    setDevoAddress(devisData.info.devoAddress || '73 Rue Rateau');
                    setDevoCity(devisData.info.devoCity || '93120 La Courneuve, France');
                    setDevoSiren(devisData.info.devoSiren || 'SIREN : 000.000.000.000');
                    setDevoStatutJuridique(devisData.info.devoStatutJuridique || 'SAS');
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
                    setIsDevisGratuit(devisData.info.isDevisGratuit !== undefined ? devisData.info.isDevisGratuit : true);
                    
                    if (devisData.info.logo) {
                        console.log('🖼️ Logo récupéré depuis navigation:', devisData.info.logo.length, 'caractères');
                        setLeftLogoSrc(devisData.info.logo);
                    }
                }
                
                // Charger les lignes de devis
                if (devisData.lines && Array.isArray(devisData.lines)) {
                    console.log('📋 Chargement des lignes depuis navigation:', devisData.lines.length, 'lignes');
                    setAggregatedQuote(devisData.lines);
                }
                
                // Charger les informations de modification
                if (devisData.originalDevisId && devisData.originalMaquetteId) {
                    console.log('🔄 Mode modification détecté depuis navigation');
                    setOriginalDevisId(devisData.originalDevisId);
                    setOriginalMaquetteId(devisData.originalMaquetteId);
                    setOriginalDevisName(devisData.originalDevisName || null);
                    setOriginalDevisDescription(devisData.originalDevisDescription || null);
                    setIsEditingExisting(true);
                }
                
                // Charger les totaux
                if (devisData.totals && devisData.totals.acompteRate !== undefined) {
                    setAcompteRate(devisData.totals.acompteRate);
                    console.log('💰 Taux d\'acompte récupéré:', devisData.totals.acompteRate);
                }
            }
        } else {
            // Fallback: vérifier le localStorage pour compatibilité avec l'ancien système
            console.log('📂 Aucune donnée de navigation, vérification localStorage...');
            const devisMetadataFromMaquette = localStorage.getItem('devisMetadataForMaquette');
            if (devisMetadataFromMaquette) {
                try {
                    const metadata = JSON.parse(devisMetadataFromMaquette);
                    console.log('📊 Métadonnées récupérées depuis localStorage (fallback):', metadata);
                    
                    // Charger les informations depuis les métadonnées
                    if (metadata.info) {
                        console.log('📝 Chargement des informations depuis localStorage fallback');
                        setDevoTitle(metadata.info.devoTitle || 'BatiDevis');
                        setDevoName(metadata.info.devoName || 'Chen Emma');
                        setDevoAddress(metadata.info.devoAddress || '73 Rue Rateau');
                        setDevoCity(metadata.info.devoCity || '93120 La Courneuve, France');
                        setDevoSiren(metadata.info.devoSiren || 'SIREN : 000.000.000.000');
                        setDevoStatutJuridique(metadata.info.devoStatutJuridique || 'SAS');
                        setSocieteBatiment(metadata.info.societeBatiment || 'Société Bâtiment');
                        setClientAdresse(metadata.info.clientAdresse || '20 rue le blanc');
                        setClientCodePostal(metadata.info.clientCodePostal || '75013 Paris');
                        setClientTel(metadata.info.clientTel || '0678891223');
                        setClientEmail(metadata.info.clientEmail || 'sociétébatiment@gmail.com');
                        setDevisNumero(metadata.info.devisNumero || generateUniqueDevisNumber());
                        setEnDateDu(metadata.info.enDateDu || '05/10/2024');
                        setValableJusquau(metadata.info.valableJusquau || '04/12/2024');
                        setDebutTravaux(metadata.info.debutTravaux || '05/10/2024');
                        setDureeTravaux(metadata.info.dureeTravaux || '1 jour');
                        setIsDevisGratuit(metadata.info.isDevisGratuit !== undefined ? metadata.info.isDevisGratuit : true);
                        
                        if (metadata.info.logo) {
                            console.log('🖼️ Logo récupéré depuis localStorage fallback:', metadata.info.logo.length, 'caractères');
                            setLeftLogoSrc(metadata.info.logo);
                        }
                    }
                    
                    // Charger les informations de modification
                    if (metadata.isEditingExisting) {
                        console.log('🔄 Mode modification récupéré depuis localStorage fallback');
                        setOriginalDevisId(metadata.originalDevisId);
                        setOriginalMaquetteId(metadata.originalMaquetteId);
                        setOriginalDevisName(metadata.originalDevisName || null);
                        setOriginalDevisDescription(metadata.originalDevisDescription || null);
                        setIsEditingExisting(true);
                    }
                    
                    // Charger les totaux
                    if (metadata.totals && metadata.totals.acompteRate !== undefined) {
                        setAcompteRate(metadata.totals.acompteRate);
                        console.log('💰 Taux d\'acompte récupéré:', metadata.totals.acompteRate);
                    }
                    
                } catch (error) {
                    console.error('❌ Erreur lors du chargement des métadonnées localStorage:', error);
                    localStorage.removeItem('devisMetadataForMaquette');
                }
            }
        }
        
        // Vérifier d'abord s'il y a des données à charger depuis la navigation
        // const devisDataToLoad = localStorage.getItem('devisDataToLoad');
        // console.log('📥 devisDataToLoad depuis localStorage:', devisDataToLoad ? 'TROUVÉ' : 'ABSENT');
        
        // if (devisDataToLoad) {
        //     console.log('📋 Données brutes devisDataToLoad:', devisDataToLoad.substring(0, 200) + '...');
        //     try {
        //         const devisData = JSON.parse(devisDataToLoad);
        //         console.log('✅ Données parsées avec succès');
        //         console.log('📊 Structure des données:', {
        //             hasInfo: !!devisData.info,
        //             hasLines: !!devisData.lines,
        //             linesCount: devisData.lines ? devisData.lines.length : 0,
        //             hasTotals: !!devisData.totals,
        //             hasOriginalIds: !!(devisData.originalDevisId && devisData.originalMaquetteId)
        //         }); 
                
        //         // Charger les informations du devis
        //         if (devisData.info) {
        //             console.log('📝 Chargement des informations du devis:', {
        //                 devoTitle: devisData.info.devoTitle,
        //                 societeBatiment: devisData.info.societeBatiment,
        //                 devisNumero: devisData.info.devisNumero,
        //                 isDevisGratuit: devisData.info.isDevisGratuit,
        //                 hasLogo: !!devisData.info.logo
        //             });
                    
        //             setDevoTitle(devisData.info.devoTitle || 'BatiDevis');
        //             setDevoName(devisData.info.devoName || 'Chen Emma');
        //             setDevoAddress(devisData.info.devoAddress || '73 Rue Rateau');
        //             setDevoCity(devisData.info.devoCity || '93120 La Courneuve, France');
        //             setDevoSiren(devisData.info.devoSiren || 'SIREN : 000.000.000.000');
        //             setSocieteBatiment(devisData.info.societeBatiment || 'Société Bâtiment');
        //             setClientAdresse(devisData.info.clientAdresse || '20 rue le blanc');
        //             setClientCodePostal(devisData.info.clientCodePostal || '75013 Paris');
        //             setClientTel(devisData.info.clientTel || '0678891223');
        //             setClientEmail(devisData.info.clientEmail || 'sociétébatiment@gmail.com');
        //             setDevisNumero(devisData.info.devisNumero || generateUniqueDevisNumber());
        //             setEnDateDu(devisData.info.enDateDu || '05/10/2024');
        //             setValableJusquau(devisData.info.valableJusquau || '04/12/2024');
        //             setDebutTravaux(devisData.info.debutTravaux || '05/10/2024');
        //             setDureeTravaux(devisData.info.dureeTravaux || '1 jour');
        //             setIsDevisGratuit(devisData.info.isDevisGratuit !== undefined ? devisData.info.isDevisGratuit : true);
        //             // Restaurer le logo s'il existe
        //             if (devisData.info.logo) {
        //                 console.log('🖼️ Logo trouvé, taille:', devisData.info.logo.length, 'caractères');
        //                 setLeftLogoSrc(devisData.info.logo);
        //             }
                    
        //             console.log('✅ Informations du devis chargées');
        //         } else {
        //             console.log('⚠️ Aucune information de devis trouvée');
        //         }
                
        //         // Vérifier s'il s'agit d'une modification d'un devis existant
        //         console.log('🔍 Vérification du mode modification...');
        //         console.log('🔍 originalDevisId:', devisData.originalDevisId);
        //         console.log('🔍 originalMaquetteId:', devisData.originalMaquetteId);
        //         console.log('🔍 originalDevisName:', devisData.originalDevisName);
        //         console.log('🔍 originalDevisDescription:', devisData.originalDevisDescription);
                
        //         if (devisData.originalDevisId && devisData.originalMaquetteId) {
        //             console.log('✅ Mode modification détecté');
        //             setOriginalDevisId(devisData.originalDevisId);
        //             setOriginalMaquetteId(devisData.originalMaquetteId);
        //             setOriginalDevisName(devisData.originalDevisName || null);
        //             setOriginalDevisDescription(devisData.originalDevisDescription || null);
        //             setIsEditingExisting(true);
        //             console.log('🔄 Configuration mode modification:', {
        //                 devisId: devisData.originalDevisId,
        //                 maquetteId: devisData.originalMaquetteId,
        //                 nom: devisData.originalDevisName,
        //                 description: devisData.originalDevisDescription
        //             });
        //         } else {
        //             console.log('✨ Mode création détecté - Aucun ID original');
        //             // S'assurer que le mode modification est désactivé
        //             setIsEditingExisting(false);
        //             setOriginalDevisId(null);
        //             setOriginalMaquetteId(null);
        //             setOriginalDevisName(null);
        //             setOriginalDevisDescription(null);
        //         }
                
        //         // Charger les lignes du devis
        //         if (devisData.lines && Array.isArray(devisData.lines)) { 
        //             console.log('📋 Chargement des lignes du devis depuis localStorage');
        //             console.log('📊 Nombre de lignes à charger:', devisData.lines.length);
                    
        //             setAggregatedQuote(devisData.lines);
        //             console.log('✅ Lignes de devis chargées avec succès');
        //         } else {
        //             console.log('⚠️ Aucune ligne de devis trouvée ou format invalide');
        //         }
                
        //         // Charger les totaux
        //         if (devisData.totals) {
        //             console.log('💰 Chargement des totaux:', {
        //                 totalHT: devisData.totals.totalHT,
        //                 totalTTC: devisData.totals.totalTTC,
        //                 acompteRate: devisData.totals.acompteRate,
        //                 tvaRate: devisData.totals.tvaRate
        //             });
        //             if (devisData.totals.acompteRate !== undefined) {
        //                 setAcompteRate(devisData.totals.acompteRate);
        //                 console.log('✅ Taux d\'acompte mis à jour:', devisData.totals.acompteRate);
        //             }
        //         } else {
        //             console.log('⚠️ Aucun total trouvé, utilisation des valeurs par défaut');
        //         }
                
        //         // NE PAS nettoyer le localStorage immédiatement pour permettre les navigations
        //         // Il sera nettoyé lors de la sauvegarde ou quand on quitte définitivement le flux
        //         // localStorage.removeItem('devisDataToLoad'); 
        //         console.log('🎯 Chargement depuis devisDataToLoad terminé avec succès');
                
        //     } catch (error) {
        //         console.error('❌ Erreur lors du chargement des données du devis:', error);
     
        //         localStorage.removeItem('devisDataToLoad');
        //         console.log('🧹 devisDataToLoad supprimé après erreur');
        //     }
        // } else {
        //     console.log('📂 Aucune donnée devisDataToLoad trouvée, vérification de devisDataAutoSave...');
        //     // Si pas de données à charger, essayer de charger les données auto-sauvegardées
        //     const autoSavedData = localStorage.getItem('devisDataAutoSave');
        //     console.log('💾 devisDataAutoSave depuis localStorage:', autoSavedData ? 'TROUVÉ' : 'ABSENT');
            
        //     if (autoSavedData) {
        //         console.log('📋 Données brutes devisDataAutoSave:', autoSavedData.substring(0, 200) + '...');
        //         try {
        //             const devisData = JSON.parse(autoSavedData);
        //             console.log('✅ Données auto-sauvegardées parsées avec succès');
        //             console.log('📊 Structure des données auto-sauvegardées:', {
        //                 hasInfo: !!devisData.info,
        //                 hasLines: !!devisData.lines,
        //                 linesCount: devisData.lines ? devisData.lines.length : 0,
        //                 hasTotals: !!devisData.totals,
        //                 hasOriginalIds: !!(devisData.originalDevisId && devisData.originalMaquetteId)
        //             }); 
                    
        //             // Charger les informations du devis
        //             if (devisData.info) {
        //                 setDevoTitle(devisData.info.devoTitle || 'BatiDevis');
        //                 setDevoName(devisData.info.devoName || 'Chen Emma');
        //                 setDevoAddress(devisData.info.devoAddress || '73 Rue Rateau');
        //                 setDevoCity(devisData.info.devoCity || '93120 La Courneuve, France');
        //                 setDevoSiren(devisData.info.devoSiren || 'SIREN : 000.000.000.000');
        //                 setSocieteBatiment(devisData.info.societeBatiment || 'Société Bâtiment');
        //                 setClientAdresse(devisData.info.clientAdresse || '20 rue le blanc');
        //                 setClientCodePostal(devisData.info.clientCodePostal || '75013 Paris');
        //                 setClientTel(devisData.info.clientTel || '0678891223');
        //                 setClientEmail(devisData.info.clientEmail || 'sociétébatiment@gmail.com');
        //                 setDevisNumero(devisData.info.devisNumero || generateUniqueDevisNumber());
        //                 setEnDateDu(devisData.info.enDateDu || '05/10/2024');
        //                 setValableJusquau(devisData.info.valableJusquau || '04/12/2024');
        //                 setDebutTravaux(devisData.info.debutTravaux || '05/10/2024');
        //                 setDureeTravaux(devisData.info.dureeTravaux || '1 jour');
        //                 setIsDevisGratuit(devisData.info.isDevisGratuit !== undefined ? devisData.info.isDevisGratuit : true);
        //                 // Restaurer le logo s'il existe
        //                 console.log("exiiiisssttteee")
        //                 if (devisData.info.logo) {
        //                     setLeftLogoSrc(devisData.info.logo);
        //                 }
        //             }
                    
        //                             // Vérifier s'il s'agit d'une modification d'un devis existant
        //         if (devisData.originalDevisId && devisData.originalMaquetteId) {
        //             setOriginalDevisId(devisData.originalDevisId);
        //             setOriginalMaquetteId(devisData.originalMaquetteId);
        //             setOriginalDevisName(devisData.originalDevisName || null);
        //             setOriginalDevisDescription(devisData.originalDevisDescription || null);
        //             setIsEditingExisting(true);
        //             console.log('🔄 Mode modification restauré depuis auto-sauvegarde - Devis ID:', devisData.originalDevisId);
        //         } else {
        //             console.log('⚠️ Mode création - Auto-sauvegarde sans ID de modification');
        //             // S'assurer que le mode modification est désactivé
        //             setIsEditingExisting(false);
        //             setOriginalDevisId(null);
        //             setOriginalMaquetteId(null);
        //             setOriginalDevisName(null);
        //             setOriginalDevisDescription(null);
        //         }
                    
        //             // Charger les lignes du devis
        //             if (devisData.lines && Array.isArray(devisData.lines)) { 
        //                 console.log('📋 Chargement des lignes auto-sauvegardées:', devisData.lines.length, 'lignes');
        //                 setAggregatedQuote(devisData.lines);
        //                 console.log('✅ Lignes auto-sauvegardées chargées');
        //             } else {
        //                 console.log('⚠️ Aucune ligne auto-sauvegardée trouvée');
        //             }
                    
        //             // Charger les totaux
        //             if (devisData.totals) {
        //                 console.log('💰 Chargement des totaux auto-sauvegardés:', devisData.totals);
        //                 if (devisData.totals.acompteRate !== undefined) {
        //                     setAcompteRate(devisData.totals.acompteRate);
        //                     console.log('✅ Taux d\'acompte auto-sauvegardé restauré:', devisData.totals.acompteRate);
        //                 }
        //             }
                    
        //             console.log('🎯 Chargement depuis devisDataAutoSave terminé avec succès');
                    
        //         } catch (error) {
        //             console.error('❌ Erreur lors du chargement des données auto-sauvegardées:', error);
                    
        //         }
        //     } else {
        //         // Aucune donnée sauvegardée - nouveau devis
        //         console.log('✨ Nouveau devis - Aucune donnée sauvegardée');
        //         console.log('🔧 Initialisation des valeurs par défaut');
        //         setIsEditingExisting(false);
        //         setOriginalDevisId(null);
        //         setOriginalMaquetteId(null);
        //         setOriginalDevisName(null);
        //         setOriginalDevisDescription(null);
        //     }
        // }
        
        // // Log final de l'état du chargement
        // console.log('🏁 Fin du useEffect principal de chargement');
        // console.log('📊 État final après chargement:');
        // console.log('🏢 Informations générales chargées:', {
        //     entreprise: {
        //         devoTitle,
        //         devoName,
        //         devoSiren
        //     },
        //     client: {
        //         societeBatiment,
        //         clientEmail
        //     },
        //     devis: {
        //         devisNumero,
        //         isDevisGratuit
        //     },
        //     mode: isEditingExisting ? 'MODIFICATION' : 'CRÉATION',
        //     originalIds: isEditingExisting ? {
        //         devisId: originalDevisId,
        //         maquetteId: originalMaquetteId
        //     } : 'N/A'
        // });
        console.log('📋 Lignes chargées:', aggregatedQuote.length, 'lignes');
        console.log('🖼️ Logo:', leftLogoSrc ? 'PRÉSENT' : 'ABSENT');
    }, [location.state]);
 
    // Fonction pour sauvegarder automatiquement les données du devis (legacy - supprimée)
    // Cette fonction n'est plus nécessaire car les données sont passées via React Router state

    // Sauvegarder automatiquement les données du devis à chaque changement (legacy - optionnel)
    useEffect(() => {
        // Sauvegarde legacy pour compatibilité - peut être désactivée
        // saveDevisDataToLocalStorage();
    }, [
        devoTitle, devoName, devoAddress, devoCity, devoSiren,
        societeBatiment, clientAdresse, clientCodePostal, clientTel, clientEmail,
        devisNumero, enDateDu, valableJusquau, debutTravaux, dureeTravaux,
         isDevisGratuit, leftLogoSrc,
        aggregatedQuote, acompteRate, additionalClientFields
    ]);


    // Fonction pour gérer la sélection des frais divers
    const handleFraisDiversChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedIds = Array.from(event.target.selectedOptions, option => parseInt(option.value));
        setSelectedFraisDivers(selectedIds);
        
        console.log('💰 Ajout de frais divers, IDs sélectionnés:', selectedIds);
        
        // Ajouter les frais divers sélectionnés au devis
        selectedIds.forEach(id => {
            const frais = fraisDivers.find(f => f.id === id);
            if (frais) {
                const newItem: AggregatedQuoteItem = {
                    details: `${frais.libtech} (${formatNumber(frais.prix)}€/${frais.unite})`,
                    price: frais.prix,
                    quantity: 1,
                    unit: frais.unite,
                    isNew: true,
                    tva: 0.20 // TVA par défaut à 20%
                };
                
                console.log('💰 Ajout d\'un frais divers:', newItem);
                
                // Ajouter après les frais obligatoires
                setAggregatedQuote(prev => {
                    const fraisObligatoiresCount = prev.filter(item => 
                        item.details.includes('Frais de déplacement') || item.details.includes('Taux horaire')
                    ).length;
                    const newArray = [...prev];
                    newArray.splice(fraisObligatoiresCount, 0, newItem);
                    console.log('📋 Nombre total de lignes après ajout frais divers:', newArray.length);
                    return newArray;
                });
            }
        });
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
            case 'devoStatutJuridique':
                setDevoStatutJuridique(newValue);
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
        return new Promise(async (resolve) => {
            // Create a PDF document in A4 format
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            
            // Colors matching the website
            const primaryColor = { r: 45, g: 60, b: 84 }; // #2D3C54
            const lightGray = { r: 248, g: 249, b: 250 }; // #f8f9fa
            
            // Helper function to add logo if available
            const addLogoIfAvailable = async () => {
                if (leftLogoSrc) {
                    try {
                        // Create an image element to load the logo
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        
                        return new Promise<void>((logoResolve) => {
                            img.onload = () => {
                                try {
                                    // Calculate proper logo dimensions to avoid deformation
                                    const maxLogoWidth = 50;
                                    const maxLogoHeight = 25;
                                    
                                    // Calculate aspect ratio
                                    const aspectRatio = img.width / img.height;
                                    
                                    let logoWidth = maxLogoWidth;
                                    let logoHeight = maxLogoWidth / aspectRatio;
                                    
                                    // If height is too big, scale by height instead
                                    if (logoHeight > maxLogoHeight) {
                                        logoHeight = maxLogoHeight;
                                        logoWidth = maxLogoHeight * aspectRatio;
                                    }
                                    
                                    // Add logo in top left with correct proportions
                                    doc.addImage(img, 'JPEG', 20, 15, logoWidth, logoHeight);
                                } catch (error) {
                                    console.warn('Error adding logo to PDF:', error);
                                }
                                logoResolve();
                            };
                            img.onerror = () => logoResolve();
                            img.src = leftLogoSrc;
                        });
                    } catch (error) {
                        console.warn('Error loading logo for PDF:', error);
                    }
                }
            };
            
            // Add logo if available
            await addLogoIfAvailable();
            
            // Header section with devis information (matching website layout)
            // Make the box wider to accommodate longer devis numbers
            const devisBoxX = 120;
            const devisBoxWidth = 75;
            const devisBoxHeight = 40;
            
            doc.setFillColor(255, 255, 255);
            doc.rect(devisBoxX, 15, devisBoxWidth, devisBoxHeight, 'F'); // White background for devis info
            doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b); // Primary color border
            doc.setLineWidth(0.5);
            doc.rect(devisBoxX, 15, devisBoxWidth, devisBoxHeight, 'S'); // Border around devis info
            
            // Devis information table (right side, matching website)
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9); // Slightly smaller font to fit better
            doc.setTextColor(0, 0, 0);
            
            const devisInfo = [
                ['Devis n°', devisNumero],
                ['En date du', enDateDu],
                ['Valable jusqu\'au', valableJusquau],
                ['Début des travaux', debutTravaux],
                ['Durée estimée à', dureeTravaux]
            ];
            
            let yPos = 22;
            devisInfo.forEach(([label, value]) => {
                doc.setFont("helvetica", "normal");
                doc.text(label + ':', devisBoxX + 2, yPos);
                doc.setFont("helvetica", "bold");
                
                // Handle long devis numbers by wrapping text if needed
                const maxValueWidth = devisBoxWidth - 35;
                const splitValue = doc.splitTextToSize(value, maxValueWidth);
                doc.text(splitValue, devisBoxX + 30, yPos);
                
                // Adjust yPos based on wrapped text
                yPos += splitValue.length > 1 ? splitValue.length * 4 : 7;
            });
            
            // Company information (left side, matching website)
            yPos = 55;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
            
            
            yPos += 8;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            
            const companyInfo = [
                devoName,
                devoAddress,
                devoCity,
                devoSiren,
                devoStatutJuridique
            ].filter(info => info && info.trim());
            
            companyInfo.forEach(info => {
                doc.text(info, 20, yPos);
                yPos += 5;
            });
            
            // Client information (right side) - adjust position to align with new devis box
            yPos = 55;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
            
            
            yPos += 8;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            
            const clientInfo = [
                societeBatiment,
                clientAdresse,
                clientCodePostal,
                'Tél: ' + clientTel,
                'Email: ' + clientEmail,
                // Ajouter les champs supplémentaires
                ...additionalClientFields
                    .filter(field => field.label && field.value && field.label.trim() && field.value.trim())
                    .map(field => `${field.label}: ${field.value}`)
            ].filter(info => info && info.trim());
            
            clientInfo.forEach(info => {
                // Wrap long client info if needed
                const maxClientWidth = devisBoxWidth;
                const splitClientInfo = doc.splitTextToSize(info, maxClientWidth);
                doc.text(splitClientInfo, devisBoxX, yPos);
                yPos += splitClientInfo.length > 1 ? splitClientInfo.length * 4 : 5;
            });
            
            // Items table (matching website design) - reduce spacing
            yPos = Math.max(yPos, 110) -18;
            
            // Table header with primary color background
            doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
            doc.rect(20, yPos - 5, pageWidth - 40, 8, 'F');
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            
            // Header columns (tighter spacing for better use of space)
            doc.text('N°', 22, yPos);
            doc.text('DÉSIGNATION', 30, yPos);
            doc.text('QTÉ', 110, yPos);
            doc.text('UNITÉ', 125, yPos);
            doc.text('PRIX U.', 140, yPos);
            doc.text('TVA', 155, yPos);
            doc.text('TOTAL HT', 170, yPos);
            
            yPos += 5;
            
            // Table items
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);
            
            let itemNumber = 1;
            aggregatedQuote.forEach((item) => {
                // Check if we need a new page
                if (yPos > pageHeight - 50) {
                    doc.addPage();
                    yPos = 25;
                    
                    // Repeat header on new page
                    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
                    doc.rect(20, yPos - 5, pageWidth - 40, 8, 'F');
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(9);
                    doc.setTextColor(255, 255, 255);
                    doc.text('N°', 22, yPos);
                    doc.text('DÉSIGNATION', 30, yPos);
                    doc.text('QTÉ', 110, yPos);
                    doc.text('UNITÉ', 125, yPos);
                    doc.text('PRIX U.', 140, yPos);
                    doc.text('TVA', 155, yPos);
                    doc.text('TOTAL HT', 170, yPos);
                    yPos += 5;
                    
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.setTextColor(0, 0, 0);
                }
                
                // Calculate description height first to determine row height (adaptive)
                const maxDescrWidth = 80; // Adjust width to fit tighter column layout
                const splitDetails = doc.splitTextToSize(item.details, maxDescrWidth);
                const rowHeight = Math.max(10, splitDetails.length * 4 + 3); // Better adaptation to text length
                
                // Alternate row background (light gray) with proper height
                if (itemNumber % 2 === 0) {
                    doc.setFillColor(lightGray.r, lightGray.g, lightGray.b);
                    doc.rect(20, yPos - 2, pageWidth - 40, rowHeight, 'F');
                }
                
                // Item number (centered vertically)
                const textYOffset = rowHeight / 2 + 1;
                doc.text(itemNumber.toString(), 22, yPos + textYOffset);
                
                // Description (with text wrapping, centered vertically)
                const descrYStart = yPos + (rowHeight - splitDetails.length * 3) / 2 + 2;
                doc.text(splitDetails, 30, descrYStart);
                
                // Quantity (centered)
                doc.text(item.quantity.toString(), 110, yPos + textYOffset, { align: 'center' });
                
                // Unit (centered)
                doc.text(item.unit || '', 125, yPos + textYOffset, { align: 'center' });
                
                // Unit price (centered)
                doc.text(formatNumber(item.price) + ' €', 140, yPos + textYOffset, { align: 'center' });
                
                // TVA rate (centered)
                const tvaRate = (item.tva || 0.20) * 100;
                doc.text(tvaRate.toFixed(1) + '%', 155, yPos + textYOffset, { align: 'center' });
                
                // Total price (centered and bold)
                doc.setFont("helvetica", "bold");
                doc.text(formatNumber(item.price * item.quantity) + ' €', 170, yPos + textYOffset, { align: 'center' });
                doc.setFont("helvetica", "normal");
                
                // Move to next row
                yPos += rowHeight;
                itemNumber++;
            });
            
            // Totals section (matching website design)
            yPos += 10;
            
            // Use the same width as the devis box for consistency
            const totalsBoxX = devisBoxX;
            const totalsBoxWidth = devisBoxWidth;
            
            // Background for totals (make it taller to include more lines)
            const totalsHeight = 35; // Increased height for more lines
            doc.setFillColor(lightGray.r, lightGray.g, lightGray.b);
            doc.rect(totalsBoxX, yPos - 5, totalsBoxWidth, totalsHeight, 'F');
            doc.setDrawColor(220, 220, 220);
            doc.rect(totalsBoxX, yPos - 5, totalsBoxWidth, totalsHeight, 'S');
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9); // Slightly smaller to fit more content
            doc.setTextColor(0, 0, 0);
            
            // Total HT
            doc.text('Total HT:', totalsBoxX + 5, yPos);
            doc.text(formatNumber(totalHT) + ' €', totalsBoxX + totalsBoxWidth - 5, yPos, { align: 'right' });
            yPos += 6;
            
            // TVA with clearer formatting
            doc.text('TVA (taux variables):', totalsBoxX + 5, yPos);
            doc.text(formatNumber(totalTVA) + ' €', totalsBoxX + totalsBoxWidth - 5, yPos, { align: 'right' });
            yPos += 6;
            
            // Total TTC (bold and highlighted)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text('Total TTC:', totalsBoxX + 5, yPos);
            doc.text(formatNumber(totalTTC) + ' €', totalsBoxX + totalsBoxWidth - 5, yPos, { align: 'right' });
            yPos += 8;
            
            // Add acompte and reste à payer if they exist
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            if (acompte > 0) {
                doc.text(`Acompte (${(acompteRate * 100).toFixed(1)}%):`, totalsBoxX + 5, yPos);
                doc.text(formatNumber(acompte) + ' €', totalsBoxX + totalsBoxWidth - 5, yPos, { align: 'right' });
                yPos += 6;
                
                doc.text('Reste à payer:', totalsBoxX + 5, yPos);
                doc.text(formatNumber(resteAPayer) + ' €', totalsBoxX + totalsBoxWidth - 5, yPos, { align: 'right' });
            }
            
            // Signature area (matching website layout)
            yPos += -15;
            if (yPos > pageHeight - 40) {
                    doc.addPage();
                yPos = 30;
            }
            
            // Signature box
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            
            const sigBoxWidth = 80;
            const sigBoxHeight = 30;
            const sigBoxX = pageWidth - sigBoxWidth - 110;
            
            // Draw the signature box
            doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
            doc.setLineWidth(0.5);
            doc.rect(sigBoxX, yPos, sigBoxWidth, sigBoxHeight, 'S');
            
            // All content inside the box with proper alignment
            doc.text('Signature :', sigBoxX + 5, yPos + 8);
            doc.text('Bon pour accord', sigBoxX + 5, yPos + 18);
            doc.text('Date:', sigBoxX + 5, yPos + 28);
            
            // Footer
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('Les marchandises vendues restent notre propriété, jusqu\'au paiement complet de la facture (loi°80.335 du 2 mai 1980)', pageWidth / 2, pageHeight - 15, { align: 'center' });
            
            // Convert to File
            const pdfBlob = doc.output('blob');
            const file = new File([pdfBlob], `devis_${devisNumero}_${societeBatiment.replace(/\s+/g, '_')}.pdf`, { 
                type: 'application/pdf' 
            });
            resolve(file);
        });
    };

    // Function to download the PDF document directly
    const handleDownloadPDF = async () => {
        try {
            // Vérifier que le devis a du contenu
            if (aggregatedQuote.length === 0) {
                alert('⚠️ Le devis doit contenir au moins une ligne pour être téléchargé');
                return;
            }

            console.log('📄 Génération du PDF pour téléchargement...');
            
            // Générer le PDF en utilisant la même fonction que pour YouSign
            const file = await prepareDocumentForSignature();
            
            // Créer un lien de téléchargement
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name; // Utilise le nom intelligent généré par prepareDocumentForSignature
            
            // Déclencher le téléchargement
            document.body.appendChild(link);
            link.click();
            
            // Nettoyer
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('✅ PDF téléchargé avec succès');
        } catch (error) {
            console.error('❌ Erreur lors du téléchargement du PDF:', error);
            alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
        }
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

        try {
            // Vérifier d'abord que le devis a du contenu
            if (aggregatedQuote.length === 0) {
                alert('⚠️ Le devis doit contenir au moins une ligne avant d\'être envoyé pour signature');
                return;
            }

            // Sauvegarder le devis avant de demander la signature
            console.log('Sauvegarde du devis avant signature...');
            
            // Préparer les données du devis
            const devisData = prepareDevisData();
            const maquetteDataToSave = maquetteData || { objects: [] };
            
            if (originalDevisId && originalMaquetteId) {
                // Mode modification : mettre à jour le devis existant
                console.log('🔄 Mise à jour du devis existant pour signature:', originalDevisId);
                
                const updatedDevis = await DevisService.updateDevis(
                    originalDevisId,
                    `Devis ${devisNumero} - ${societeBatiment}`,
                    devisData,
                    `Devis pour ${societeBatiment}`,
                    'brouillon' // Garder en brouillon pour l'instant
                );
                
                console.log('✅ Devis mis à jour pour signature:', updatedDevis);
            } else {
                // Mode création : créer un nouveau devis
                console.log('✨ Création d\'un nouveau devis pour signature');
                
                const { devis } = await DevisService.saveDevisWithMaquette(
                    `Devis ${devisNumero} - ${societeBatiment}`,
                    devisData,
                    maquetteDataToSave,
                    `Devis pour ${societeBatiment}`,
                    user.id
                );
                
                console.log('✅ Nouveau devis créé pour signature:', devis);
                setOriginalDevisId(devis.id || null);
            }
            
            // Maintenant ouvrir le formulaire de signature
        setShowSignerForm(true);
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde du devis avant signature:', error);
            alert('Erreur lors de la sauvegarde du devis. Veuillez réessayer.');
        }
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
            console.log(signatureRequestId)
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
            
            // Nettoyer le localStorage après signature réussie
            cleanupDevisDataFromLocalStorage();

            // 6. Mettre à jour le statut du devis existant à 'envoyé'
            try {
                if (originalDevisId) {
                    console.log('📧 Mise à jour du statut du devis à "envoyé":', originalDevisId);
                    
                      await DevisService.updateDevisStatus(
                        originalDevisId,
                        'envoyé', // Utiliser 'envoyé' au lieu de 'sent' pour correspondre à l'interface
                        signatureRequest.id,
                        signerResponse.signature_link
                    );
                     
                    console.log('✅ Statut du devis mis à jour avec succès');
                } else {
                    console.error('❌ Aucun ID de devis disponible pour mettre à jour le statut');
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
          logo: leftLogoSrc,
          client: {
            entreprise : devoTitle,
            nom: devoName,
            adresse: `${devoAddress}, ${devoCity}`,
            siren: devoSiren,
            statut_juridique: devoStatutJuridique
          },
          entreprise: {
            nom: societeBatiment,
            adresse: clientAdresse,
            code_postal: clientCodePostal,
            telephone: clientTel,
            email: clientEmail,
            // Ajouter les champs supplémentaires
            champs_supplementaires: additionalClientFields
              .filter(field => field.label && field.value && field.label.trim() && field.value.trim())
              .reduce((acc, field) => {
                acc[field.label] = field.value;
                return acc;
              }, {} as Record<string, string>)
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
            tva: (item.tva || 0.20) * 100,
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
        console.log(result)
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
        console.log('🔍 Préparation des données de devis pour sauvegarde:');
        console.log('📋 Nombre total de lignes dans aggregatedQuote:', aggregatedQuote.length);
        console.log('📋 Détail des lignes:', aggregatedQuote);
        
        const devisLines = aggregatedQuote.map(item => {
            console.log('🔍 FullQuote.prepareDevisData - Préparation de la ligne:', {
                itemDetails: item.details,
                itemPrice: item.price,
                itemQuantity: item.quantity
            });
            
            // Pour les objets batichiffrage, inclure les informations nécessaires pour la correspondance
            const originalQuoteItem = quote.find(q => {
                // Si c'est un objet batichiffrage, comparer avec libtech
                if (q.isBatiChiffrageObject && q.parametricData?.item_details?.libtech) {
                    return q.parametricData.item_details.libtech === item.details;
                }
                // Sinon, comparer avec details normal
                return q.details === item.details;
            });
            
            console.log('🔍 FullQuote.prepareDevisData - Objet original trouvé:', {
                found: !!originalQuoteItem,
                originalId: originalQuoteItem?.id,
                isBatiChiffrageObject: originalQuoteItem?.isBatiChiffrageObject,
                hasParametricData: !!originalQuoteItem?.parametricData
            });
            
            const devisLine = {
                details: item.details,
                price: item.price,
                quantity: item.quantity,
                unit: item.unit,
                isBatiChiffrageObject: originalQuoteItem?.isBatiChiffrageObject || false,
                originalId: originalQuoteItem?.id,
                parametricData: originalQuoteItem?.parametricData
            };
            
            console.log('✅ FullQuote.prepareDevisData - Ligne de devis créée:', devisLine);
            
            return devisLine;
        });
        
        console.log('💾 Lignes qui seront sauvegardées:', devisLines);
        
        // Log détaillé des objets batichiffrage dans les lignes à sauvegarder
        const batichiffrageLines = devisLines.filter(line => line.isBatiChiffrageObject);
        console.log('🔧 Lignes batichiffrage à sauvegarder:', batichiffrageLines.length);
        batichiffrageLines.forEach((line, index) => {
            console.log(`🔧 Ligne batichiffrage ${index + 1} à sauvegarder:`, {
                details: line.details,
                isBatiChiffrageObject: line.isBatiChiffrageObject,
                originalId: line.originalId,
                hasParametricData: !!line.parametricData
            });
        });
        
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
                additionalClientFields,
                devisNumero,
                enDateDu,
                valableJusquau,
                debutTravaux,
                dureeTravaux, 
                isDevisGratuit,
                logo: leftLogoSrc
            },
            lines: devisLines,
            totals: {
                totalHT,
                totalTVA,
                totalTTC,
                acompte,
                resteAPayer,
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
            // ❌ SUPPRIMÉ : syncObjectsAndQuote() car cela écrase aggregatedQuote avec seulement les objets 3D
            // On veut sauvegarder TOUTES les lignes de aggregatedQuote (objets + lignes manuelles + frais divers)
            
            console.log('💾 Sauvegarde en cours - aggregatedQuote avant préparation:', aggregatedQuote);
            const devisData = prepareDevisData();
            
            // Utiliser les données de maquette reçues depuis MaquettePage ou fallback sur quote
            let maquetteDataToSave;
            if (maquetteData && maquetteData.objects) {
                console.log('🏗️ Utilisation des données de maquette complètes:', maquetteData.objects.length, 'objets');
                maquetteDataToSave = maquetteData;
            } else {
                console.log('⚠️ Fallback: reconstruction des données de maquette depuis quote');
                maquetteDataToSave = {
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
            }

            if (isEditingExisting && originalDevisId && originalMaquetteId) {
                // Mode modification : mettre à jour les enregistrements existants
                console.log('🔄 Mise à jour du devis existant:', originalDevisId, 'et maquette:', originalMaquetteId);
                
                try {
                    // Mettre à jour le devis
                    const updatedDevis = await DevisService.updateDevis(
                        originalDevisId,
                        devisName.trim(),
                        devisData,
                        devisDescription.trim() || undefined
                    );
                    console.log('✅ Devis mis à jour:', updatedDevis);
                    
                    // Mettre à jour la maquette
                    const updatedMaquette = await MaquetteService.updateMaquette(
                        originalMaquetteId,
                        devisName.trim(), // Utiliser le même nom que le devis
                        maquetteDataToSave,
                        devisDescription.trim() || undefined
                    );
                    console.log('✅ Maquette mise à jour:', updatedMaquette);
                    
                    console.log('✅ Devis et maquette mis à jour avec succès:', { 
                        devis: updatedDevis, 
                        maquette: updatedMaquette 
                    });
                    alert('Devis et maquette mis à jour avec succès!');
                } catch (updateError) {
                    console.error('❌ Erreur lors de la mise à jour:', updateError);
                    throw updateError;
                }
            } else {
                // Mode création : créer de nouveaux enregistrements
                console.log('✨ Création d\'un nouveau devis');
                
                const { devis, maquette } = await DevisService.saveDevisWithMaquette(
                    devisName.trim(),
                    devisData,
                    maquetteDataToSave,
                    devisDescription.trim() || undefined,
                    user.id
                );
                
                console.log('✅ Devis et maquette créés avec succès:', { devis, maquette });
                alert('Devis et maquette sauvegardés avec succès!');
            }
            
            setShowSaveDevisModal(false);
            setDevisName('');
            setDevisDescription('');
            
            // Nettoyer le localStorage après sauvegarde réussie
            cleanupDevisDataFromLocalStorage();
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde du devis:', error);
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
        
        // En mode modification, utiliser le nom existant, sinon créer un nom par défaut
        if (isEditingExisting && originalDevisName) {
            setDevisName(originalDevisName);
            setDevisDescription(originalDevisDescription || '');
            console.log('📝 Mode modification - Nom existant utilisé:', originalDevisName);
        } else {
            // Set default name based on client and devis number pour les nouveaux devis
            const defaultName = `Devis ${devisNumero} - ${societeBatiment}`;
            setDevisName(defaultName);
            setDevisDescription('');
            console.log('✨ Mode création - Nom par défaut:', defaultName);
        }
        
        // Debug pour vérifier l'état de modification
        console.log('🔍 État lors de l\'ouverture du modal:');
        console.log('- isEditingExisting:', isEditingExisting);
        console.log('- originalDevisId:', originalDevisId);
        console.log('- originalMaquetteId:', originalMaquetteId);
        console.log('- originalDevisName:', originalDevisName);
        
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
                                                tva: 0.20, // TVA par défaut à 20%
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
                      <tr>
                        <td>Statut juridique</td>
                        <td>
                          <EditableText fieldName="devoStatutJuridique" value={devoStatutJuridique} />
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
                        {/* Champs clients supplémentaires */}
                        {additionalClientFields.map((field) => (
                          <tr key={field.id}>
                            <td style={{ paddingRight: '5px' }}>
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => updateAdditionalClientField(field.id, 'label', e.target.value)}
                                  style={{ 
                                    width: '100px', 
                                    border: '1px solid #ccc', 
                                    padding: '2px',
                                    fontSize: '12px'
                                  }}
                                />
                              ) : (
                                field.label
                              )}
                            </td>
                            <td>
                              {isEditMode ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <input
                                    type="text"
                                    value={field.value}
                                    onChange={(e) => updateAdditionalClientField(field.id, 'value', e.target.value)}
                                    style={{ 
                                      flex: 1, 
                                      border: '1px solid #ccc', 
                                      padding: '2px',
                                      fontSize: '12px'
                                    }}
                                    placeholder="Valeur du champ"
                                  />
                                  <button
                                    onClick={() => removeAdditionalClientField(field.id)}
                                    style={{
                                      background: '#dc3545',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '3px',
                                      padding: '2px 6px',
                                      cursor: 'pointer',
                                      fontSize: '10px'
                                    }}
                                    title="Supprimer ce champ"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                field.value
                              )}
                            </td>
                          </tr>
                        ))}
                        {/* Bouton pour ajouter un nouveau champ */}
                        {isEditMode && (
                          <tr>
                            <td colSpan={2} style={{ textAlign: 'center', padding: '10px' }}>
                              <button
                                onClick={addAdditionalClientField}
                                style={{
                                  background: '#3A4D6E',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '5px',
                                  padding: '8px 16px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  margin: '0 auto'
                                }}
                                title="Ajouter un nouveau champ client"
                              >
                                +
                              </button>
                            </td>
                          </tr>
                        )}
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
                {/* Commenté pour masquer les 2 premières lignes de devis */}
                {aggregatedQuote.map((item, index) => {
                  // Log pour voir ce qui est affiché dans le tableau
                  if (item.details.includes('Chassis_') || item.details.includes('Fourniture et pose')) {
                    console.log(`🔍 FullQuote Table - Ligne ${index + 1} affichée:`, {
                      details: item.details,
                      price: item.price,
                      quantity: item.quantity
                    });
                  }
                  
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
                      <td>
                        {isEditMode && editingTvaLine === index ? (
                          <div style={{ display: 'inline-block' }}>
                            <button 
                              onClick={() => handleTvaRateSelect(index, 20)}
                              style={{ 
                                margin: '0 1px', 
                                padding: '1px 4px', 
                                fontSize: '10px',
                                backgroundColor: (item.tva || 0.20) === 0.20 ? '#007bff' : '#f8f9fa',
                                color: (item.tva || 0.20) === 0.20 ? 'white' : 'black',
                                border: '1px solid #ccc',
                                borderRadius: '2px',
                                cursor: 'pointer'
                              }}
                            >
                              20%
                            </button>
                            <button 
                              onClick={() => handleTvaRateSelect(index, 10)}
                              style={{ 
                                margin: '0 1px', 
                                padding: '1px 4px', 
                                fontSize: '10px',
                                backgroundColor: (item.tva || 0.20) === 0.10 ? '#007bff' : '#f8f9fa',
                                color: (item.tva || 0.20) === 0.10 ? 'white' : 'black',
                                border: '1px solid #ccc',
                                borderRadius: '2px',
                                cursor: 'pointer'
                              }}
                            >
                              10%
                            </button>
                            <button 
                              onClick={() => handleTvaRateSelect(index, 5.5)}
                              style={{ 
                                margin: '0 1px', 
                                padding: '1px 4px', 
                                fontSize: '10px',
                                backgroundColor: (item.tva || 0.20) === 0.055 ? '#007bff' : '#f8f9fa',
                                color: (item.tva || 0.20) === 0.055 ? 'white' : 'black',
                                border: '1px solid #ccc',
                                borderRadius: '2px',
                                cursor: 'pointer'
                              }}
                            >
                              5,5%
                            </button>
                          </div>
                        ) : (
                          <span 
                            onClick={() => handleTvaClick(index)} 
                            style={{
                              cursor: isEditMode ? 'pointer' : 'default',
                              textDecoration: isEditMode ? 'underline' : 'none'
                            }}
                          >
                            {((item.tva || 0.20) * 100).toFixed(2)}
                          </span>
                        )} %
                      </td>
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
                      <td><strong>TVA (taux variables)</strong></td>
                      <td><strong>{formatNumber(totalTVA)} €</strong></td>
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
                             {isEditingExisting ? '💾 Mettre à jour le devis' : '💾 Sauvegarder le devis'}
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
                  width: '100%',
                  marginBottom: '10px'
                }}
              >
                Envoyer la facture électronique
              </button>
              
              {/* Download PDF Button */}
              <button
                onClick={handleDownloadPDF}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6f42c1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  width: '100%',
                  marginBottom: '10px',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#5a2d91';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(111, 66, 193, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#6f42c1';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                 Télécharger le PDF
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
            <button 
              onClick={() => window.open('https://devo-app.fly.dev/', '_blank')}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0056b3';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#007bff';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.3)';
              }}
            >
              📊 Consulter le chiffrage de travaux complet
            </button>
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
                             <h3 style={{ marginTop: 0 }}>{isEditingExisting ? 'Mettre à jour le devis' : 'Sauvegarder le devis'}</h3>
              
              {isEditingExisting && (
                <div style={{ 
                  marginBottom: '15px', 
                  padding: '10px', 
                  backgroundColor: '#e3f2fd', 
                  borderRadius: '4px',
                  border: '1px solid #2196f3'
                }}>
                  <small style={{ color: '#1976d2', fontWeight: 'bold' }}>
                    ℹ️ Mode modification : Les modifications seront appliquées au devis existant
                  </small>
                </div>
              )}
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  Nom du devis *
                  {isEditingExisting && <small style={{ color: '#666', fontWeight: 'normal' }}> (nom actuel)</small>}
                </label>
                <input
                  type="text"
                  value={devisName}
                  onChange={e => setDevisName(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  placeholder={isEditingExisting ? "Nom du devis existant" : "Nom du devis"}
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
                  {isSavingDevis ? (isEditingExisting ? 'Mise à jour...' : 'Sauvegarde...') : (isEditingExisting ? 'Mettre à jour' : 'Sauvegarder')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

export default FullQuote;
