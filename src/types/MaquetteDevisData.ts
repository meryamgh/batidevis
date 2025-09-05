import { ObjectData } from './ObjectData';

// Structure unifiée pour les données de maquette et devis
export interface MaquetteDevisData {
  // Métadonnées
  id?: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Informations du devis
  devisInfo: {
    // Informations entreprise
    devoTitle: string;
    devoName: string;
    devoAddress: string;
    devoCity: string;
    devoSiren: string;
    
    // Informations client
    societeBatiment: string;
    clientAdresse: string;
    clientCodePostal: string;
    clientTel: string;
    clientEmail: string;
    
    // Informations devis
    devisNumero: string;
    enDateDu: string;
    valableJusquau: string;
    debutTravaux: string;
    dureeTravaux: string;
    isDevisGratuit: boolean;
    logo?: string;
  };
  
  // Objets 3D de la maquette (avec leurs prix pour le devis)
  objects3D: ObjectData[];
  
  // Lignes de devis supplémentaires (frais divers, lignes manuelles, etc.)
  additionalLines: DevisLine[];
  
  // Totaux calculés automatiquement
  totals: {
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
    acompte: number;
    resteAPayer: number;
    tvaRate: number;
    acompteRate: number;
  };
  
  // État du document
  status: 'draft' | 'sent' | 'signed' | 'cancelled';
  
  // Informations de modification (pour les devis existants)
  originalDevisId?: string;
  originalMaquetteId?: string;
}

// Ligne de devis supplémentaire (non liée à un objet 3D)
export interface DevisLine {
  id: string;
  details: string;
  price: number;
  quantity: number;
  unit: string;
  type: 'manual' | 'frais_divers' | 'frais_devis' | 'other';
  category?: string;
}

// État du store unifié
export interface MaquetteDevisState {
  // Document actuel
  currentDocument: MaquetteDevisData | null;
  
  // État de l'interface
  isLoading: boolean;
  isDirty: boolean; // Indique si des modifications non sauvegardées existent
  
  // Actions
  setCurrentDocument: (document: MaquetteDevisData | null) => void;
  updateDevisInfo: (info: Partial<MaquetteDevisData['devisInfo']>) => void;
  addObject3D: (object: ObjectData) => void;
  updateObject3D: (id: string, updates: Partial<ObjectData>) => void;
  removeObject3D: (id: string) => void;
  addDevisLine: (line: DevisLine) => void;
  updateDevisLine: (id: string, updates: Partial<DevisLine>) => void;
  removeDevisLine: (id: string) => void;
  updateTotals: () => void;
  setStatus: (status: MaquetteDevisData['status']) => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  clearAll: () => void;
}

// Utilitaires pour la conversion des données
export interface DataConverter {
  // Convertir l'ancien format vers le nouveau
  fromLegacyFormat: (objects: ObjectData[], devisData: any) => MaquetteDevisData;
  
  // Convertir vers les formats de sauvegarde
  toDevisServiceFormat: (data: MaquetteDevisData) => any;
  toMaquetteServiceFormat: (data: MaquetteDevisData) => any;
  
  // Extraire les données pour les composants
  getObjects3D: (data: MaquetteDevisData) => ObjectData[];
  getAllDevisLines: (data: MaquetteDevisData) => ObjectData[];
}
