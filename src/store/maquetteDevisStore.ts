import { create } from 'zustand';
import { MaquetteDevisData, MaquetteDevisState, DevisLine } from '../types/MaquetteDevisData';
import { ObjectData } from '../types/ObjectData'; 

// Fonction utilitaire pour calculer les totaux
const calculateTotals = (objects3D: ObjectData[], additionalLines: DevisLine[], tvaRate = 0.20, acompteRate = 0.30) => {
  // Calculer le total des objets 3D
  const objects3DTotal = objects3D.reduce((sum, obj) => sum + (obj.price * (obj.quantity || 1)), 0);
  
  // Calculer le total des lignes supplémentaires
  const additionalTotal = additionalLines.reduce((sum, line) => sum + (line.price * line.quantity), 0);
  
  const totalHT = objects3DTotal + additionalTotal;
  const totalTVA = totalHT * tvaRate;
  const totalTTC = totalHT + totalTVA;
  const acompte = totalTTC * acompteRate;
  const resteAPayer = totalTTC - acompte;
  
  return {
    totalHT,
    totalTVA,
    totalTTC,
    acompte,
    resteAPayer,
    tvaRate,
    acompteRate
  };
};

// Fonction pour créer un document vide
const createEmptyDocument = (): MaquetteDevisData => ({
  name: '',
  description: '',
  devisInfo: {
    devoTitle: 'BatiDevis',
    devoName: 'Chen Emma',
    devoAddress: '73 Rue Rateau',
    devoCity: '93120 La Courneuve, France',
    devoSiren: 'SIREN : 000.000.000.000',
    societeBatiment: 'Société Bâtiment',
    clientAdresse: '20 rue le blanc',
    clientCodePostal: '75013 Paris',
    clientTel: '0678891223',
    clientEmail: 'sociétébatiment@gmail.com',
    devisNumero: `DEVIS-${Date.now()}`,
    enDateDu: new Date().toLocaleDateString('fr-FR'),
    valableJusquau: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'), // +60 jours
    debutTravaux: new Date().toLocaleDateString('fr-FR'),
    dureeTravaux: '1 jour',
    isDevisGratuit: true
  },
  objects3D: [],
  additionalLines: [],
  totals: {
    totalHT: 0,
    totalTVA: 0,
    totalTTC: 0,
    acompte: 0,
    resteAPayer: 0,
    tvaRate: 0.20,
    acompteRate: 0.30
  },
  status: 'draft'
});

export const useMaquetteDevisStore = create<MaquetteDevisState>((set, get) => ({
  currentDocument: null,
  isLoading: false,
  isDirty: false,

  setCurrentDocument: (document: MaquetteDevisData | null) => {
    set({ 
      currentDocument: document,
      isDirty: false 
    });
  },

  updateDevisInfo: (info: Partial<MaquetteDevisData['devisInfo']>) => {
    const current = get().currentDocument;
    if (!current) {
      // Si pas de document, créer un nouveau
      const newDoc = createEmptyDocument();
      newDoc.devisInfo = { ...newDoc.devisInfo, ...info };
      set({ 
        currentDocument: newDoc,
        isDirty: true 
      });
    } else {
      const updated = {
        ...current,
        devisInfo: { ...current.devisInfo, ...info },
        updatedAt: new Date().toISOString()
      };
      updated.totals = calculateTotals(updated.objects3D, updated.additionalLines, updated.totals.tvaRate, updated.totals.acompteRate);
      
      set({ 
        currentDocument: updated,
        isDirty: true 
      });
    }
  },

  addObject3D: (object: ObjectData) => {
    const current = get().currentDocument;
    const doc = current || createEmptyDocument();
    
    const updated = {
      ...doc,
      objects3D: [...doc.objects3D, object],
      updatedAt: new Date().toISOString()
    };
    updated.totals = calculateTotals(updated.objects3D, updated.additionalLines, updated.totals.tvaRate, updated.totals.acompteRate);
    
    set({ 
      currentDocument: updated,
      isDirty: true 
    });
  },

  updateObject3D: (id: string, updates: Partial<ObjectData>) => {
    const current = get().currentDocument;
    if (!current) return;
    
    const updated = {
      ...current,
      objects3D: current.objects3D.map(obj => 
        obj.id === id ? { ...obj, ...updates } : obj
      ),
      updatedAt: new Date().toISOString()
    };
    updated.totals = calculateTotals(updated.objects3D, updated.additionalLines, updated.totals.tvaRate, updated.totals.acompteRate);
    
    set({ 
      currentDocument: updated,
      isDirty: true 
    });
  },

  removeObject3D: (id: string) => {
    const current = get().currentDocument;
    if (!current) return;
    
    const updated = {
      ...current,
      objects3D: current.objects3D.filter(obj => obj.id !== id),
      updatedAt: new Date().toISOString()
    };
    updated.totals = calculateTotals(updated.objects3D, updated.additionalLines, updated.totals.tvaRate, updated.totals.acompteRate);
    
    set({ 
      currentDocument: updated,
      isDirty: true 
    });
  },

  addDevisLine: (line: DevisLine) => {
    const current = get().currentDocument;
    const doc = current || createEmptyDocument();
    
    const updated = {
      ...doc,
      additionalLines: [...doc.additionalLines, line],
      updatedAt: new Date().toISOString()
    };
    updated.totals = calculateTotals(updated.objects3D, updated.additionalLines, updated.totals.tvaRate, updated.totals.acompteRate);
    
    set({ 
      currentDocument: updated,
      isDirty: true 
    });
  },

  updateDevisLine: (id: string, updates: Partial<DevisLine>) => {
    const current = get().currentDocument;
    if (!current) return;
    
    const updated = {
      ...current,
      additionalLines: current.additionalLines.map(line => 
        line.id === id ? { ...line, ...updates } : line
      ),
      updatedAt: new Date().toISOString()
    };
    updated.totals = calculateTotals(updated.objects3D, updated.additionalLines, updated.totals.tvaRate, updated.totals.acompteRate);
    
    set({ 
      currentDocument: updated,
      isDirty: true 
    });
  },

  removeDevisLine: (id: string) => {
    const current = get().currentDocument;
    if (!current) return;
    
    const updated = {
      ...current,
      additionalLines: current.additionalLines.filter(line => line.id !== id),
      updatedAt: new Date().toISOString()
    };
    updated.totals = calculateTotals(updated.objects3D, updated.additionalLines, updated.totals.tvaRate, updated.totals.acompteRate);
    
    set({ 
      currentDocument: updated,
      isDirty: true 
    });
  },

  updateTotals: () => {
    const current = get().currentDocument;
    if (!current) return;
    
    const updated = {
      ...current,
      totals: calculateTotals(current.objects3D, current.additionalLines, current.totals.tvaRate, current.totals.acompteRate),
      updatedAt: new Date().toISOString()
    };
    
    set({ 
      currentDocument: updated,
      isDirty: true 
    });
  },

  setStatus: (status: MaquetteDevisData['status']) => {
    const current = get().currentDocument;
    if (!current) return;
    
    set({ 
      currentDocument: {
        ...current,
        status,
        updatedAt: new Date().toISOString()
      },
      isDirty: true 
    });
  },

  saveToLocalStorage: () => {
    const current = get().currentDocument;
    if (!current) return;
    
    try {
      localStorage.setItem('maquetteDevisData', JSON.stringify(current));
      set({ isDirty: false });
      console.log('💾 Document sauvegardé dans localStorage');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde localStorage:', error);
    }
  },

  loadFromLocalStorage: () => {
    try {
      const saved = localStorage.getItem('maquetteDevisData');
      if (saved) {
        const document = JSON.parse(saved) as MaquetteDevisData;
        set({ 
          currentDocument: document,
          isDirty: false 
        });
        console.log('📂 Document chargé depuis localStorage');
        return true;
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement localStorage:', error);
    }
    return false;
  },

  clearAll: () => {
    localStorage.removeItem('maquetteDevisData');
    localStorage.removeItem('devisDataToLoad');
    localStorage.removeItem('devisDataAutoSave');
    set({ 
      currentDocument: null,
      isDirty: false 
    });
    console.log('🧹 Toutes les données ont été effacées');
  }
}));
