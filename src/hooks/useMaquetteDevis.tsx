import { useEffect, useCallback } from 'react';
import { useMaquetteDevisStore } from '../store/maquetteDevisStore';
import { dataConverter, migrateExistingData } from '../utils/dataConverter';
import { ObjectData } from '../types/ObjectData';
import { DevisLine, MaquetteDevisData } from '../types/MaquetteDevisData';
import { DevisService } from '../services/DevisService';
import { MaquetteService } from '../services/MaquetteService';

export const useMaquetteDevis = () => {
  const store = useMaquetteDevisStore();

  // Initialiser les données au chargement
  useEffect(() => {
    // Essayer de charger depuis le nouveau format
    const loaded = store.loadFromLocalStorage();
    
    if (!loaded) {
      // Si pas de nouveau format, essayer de migrer les anciennes données
      const migrated = migrateExistingData();
      if (migrated) {
        store.setCurrentDocument(migrated);
      }
    }
  }, [store]);

  // Auto-sauvegarde quand les données changent
  useEffect(() => {
    if (store.isDirty && store.currentDocument) {
      const timeoutId = setTimeout(() => {
        store.saveToLocalStorage();
      }, 1000); // Sauvegarder après 1 seconde d'inactivité

      return () => clearTimeout(timeoutId);
    }
  }, [store.isDirty, store.currentDocument, store]);

  // Fonctions utilitaires
  const loadFromNavigation = useCallback((navigationData: any) => {
    console.log('📂 Chargement depuis navigation:', navigationData);
    
    if (navigationData.devisData || navigationData.maquetteData) {
      // Convertir les données de navigation
      const objects: ObjectData[] = navigationData.maquetteData?.objects || [];
      const unifiedData = dataConverter.fromLegacyFormat(objects, navigationData.devisData);
      
      store.setCurrentDocument(unifiedData);
      console.log('✅ Document chargé depuis navigation');
    }
  }, [store]);

  const createNewDocument = useCallback((name?: string) => {
    console.log('✨ Création d\'un nouveau document');
    
    // Nettoyer les anciennes données
    store.clearAll();
    
    // Créer un nouveau document vide
    const newDoc: MaquetteDevisData = {
      name: name || `Nouveau devis ${new Date().toLocaleDateString()}`,
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
        valableJusquau: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
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
    };
    
    store.setCurrentDocument(newDoc);
    console.log('✅ Nouveau document créé');
  }, [store]);

  const saveToDatabase = useCallback(async (name: string, description?: string) => {
    const document = store.currentDocument;
    if (!document) {
      throw new Error('Aucun document à sauvegarder');
    }

    console.log('💾 Sauvegarde en base de données...');

    try {
      const devisData = dataConverter.toDevisServiceFormat(document);
      const maquetteData = dataConverter.toMaquetteServiceFormat(document);

      if (document.originalDevisId && document.originalMaquetteId) {
        // Mode modification
        console.log('🔄 Mise à jour du devis existant');
        
        await DevisService.updateDevis(
          document.originalDevisId,
          name,
          devisData,
          description
        );
        
        await MaquetteService.updateMaquette(
          document.originalMaquetteId,
          name,
          maquetteData,
          description
        );
        
        console.log('✅ Devis et maquette mis à jour');
      } else {
        // Mode création
        console.log('✨ Création d\'un nouveau devis');
        
        const userId = 'current-user-id'; // À récupérer depuis useAuth
        
        const result = await DevisService.saveDevisWithMaquette(
          name,
          devisData,
          maquetteData,
          description,
          userId
        );
        
        // Mettre à jour le document avec les IDs
        const updatedDoc = {
          ...document,
          id: result.devis.id,
          name,
          description: description || '',
          originalDevisId: result.devis.id,
          originalMaquetteId: result.maquette.id
        };
        
        store.setCurrentDocument(updatedDoc);
        console.log('✅ Nouveau devis et maquette créés');
      }

      // Nettoyer les anciennes données après sauvegarde réussie
      localStorage.removeItem('devisDataToLoad');
      localStorage.removeItem('devisDataAutoSave');
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      throw error;
    }
  }, [store]);

  // Fonctions pour manipuler les objets 3D
  const addObject3D = useCallback((object: ObjectData) => {
    store.addObject3D(object);
  }, [store]);

  const updateObject3D = useCallback((id: string, updates: Partial<ObjectData>) => {
    store.updateObject3D(id, updates);
  }, [store]);

  const removeObject3D = useCallback((id: string) => {
    store.removeObject3D(id);
  }, [store]);

  // Fonctions pour manipuler les lignes de devis
  const addDevisLine = useCallback((line: Omit<DevisLine, 'id'>) => {
    const fullLine: DevisLine = {
      ...line,
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    store.addDevisLine(fullLine);
  }, [store]);

  const updateDevisLine = useCallback((id: string, updates: Partial<DevisLine>) => {
    store.updateDevisLine(id, updates);
  }, [store]);

  const removeDevisLine = useCallback((id: string) => {
    store.removeDevisLine(id);
  }, [store]);

  // Getters pour les composants
  const getObjects3D = useCallback((): ObjectData[] => {
    return store.currentDocument?.objects3D || [];
  }, [store.currentDocument]);

  const getAllDevisLines = useCallback(() => {
    if (!store.currentDocument) return [];
    return dataConverter.getAllDevisLines(store.currentDocument);
  }, [store.currentDocument]);

  const isEditingExisting = useCallback((): boolean => {
    return !!(store.currentDocument?.originalDevisId && store.currentDocument?.originalMaquetteId);
  }, [store.currentDocument]);

  return {
    // État
    currentDocument: store.currentDocument,
    isLoading: store.isLoading,
    isDirty: store.isDirty,
    
    // Actions principales
    loadFromNavigation,
    createNewDocument,
    saveToDatabase,
    
    // Actions sur les objets 3D
    addObject3D,
    updateObject3D,
    removeObject3D,
    
    // Actions sur les lignes de devis
    addDevisLine,
    updateDevisLine,
    removeDevisLine,
    
    // Actions sur les informations du devis
    updateDevisInfo: store.updateDevisInfo,
    setStatus: store.setStatus,
    
    // Getters
    getObjects3D,
    getAllDevisLines,
    isEditingExisting,
    
    // Utilitaires
    clearAll: store.clearAll,
    saveToLocalStorage: store.saveToLocalStorage
  };
};
