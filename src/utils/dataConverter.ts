import { MaquetteDevisData, DevisLine, DataConverter } from '../types/MaquetteDevisData';
import { ObjectData } from '../types/ObjectData';

export const dataConverter: DataConverter = {
  // Convertir l'ancien format vers le nouveau
  fromLegacyFormat: (objects: ObjectData[], devisData: any): MaquetteDevisData => {
    console.log('🔄 Conversion depuis format legacy:', { objects: objects.length, devisData });
    
    // Séparer les objets 3D des lignes de devis
    const objects3D = objects.filter(obj => obj.type !== 'devis-item');
    const devisItems = objects.filter(obj => obj.type === 'devis-item');
    
    // Convertir les items de devis en lignes supplémentaires
    const additionalLines: DevisLine[] = devisItems.map(item => ({
      id: item.id,
      details: item.details,
      price: item.price,
      quantity: item.quantity || 1,
      unit: item.unit || 'U',
      type: 'manual' as const,
      category: 'Ligne manuelle'
    }));
    
    // Si on a des données de devis legacy, les ajouter aussi
    if (devisData?.lines && Array.isArray(devisData.lines)) {
      devisData.lines.forEach((line: any, index: number) => {
        // Éviter les doublons
        if (!additionalLines.find(al => al.details === line.details && al.price === line.price)) {
          additionalLines.push({
            id: `legacy-line-${index}-${Date.now()}`,
            details: line.details || 'Ligne importée',
            price: line.price || 0,
            quantity: line.quantity || 1,
            unit: line.unit || 'U',
            type: 'manual' as const,
            category: 'Importé'
          });
        }
      });
    }
    
    const document: MaquetteDevisData = {
      id: devisData?.originalDevisId,
      name: devisData?.originalDevisName || `Devis ${new Date().toLocaleDateString()}`,
      description: devisData?.originalDevisDescription || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      devisInfo: {
        devoTitle: devisData?.info?.devoTitle || 'BatiDevis',
        devoName: devisData?.info?.devoName || 'Chen Emma',
        devoAddress: devisData?.info?.devoAddress || '73 Rue Rateau',
        devoCity: devisData?.info?.devoCity || '93120 La Courneuve, France',
        devoSiren: devisData?.info?.devoSiren || 'SIREN : 000.000.000.000',
        societeBatiment: devisData?.info?.societeBatiment || 'Société Bâtiment',
        clientAdresse: devisData?.info?.clientAdresse || '20 rue le blanc',
        clientCodePostal: devisData?.info?.clientCodePostal || '75013 Paris',
        clientTel: devisData?.info?.clientTel || '0678891223',
        clientEmail: devisData?.info?.clientEmail || 'sociétébatiment@gmail.com',
        devisNumero: devisData?.info?.devisNumero || `DEVIS-${Date.now()}`,
        enDateDu: devisData?.info?.enDateDu || new Date().toLocaleDateString('fr-FR'),
        valableJusquau: devisData?.info?.valableJusquau || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
        debutTravaux: devisData?.info?.debutTravaux || new Date().toLocaleDateString('fr-FR'),
        dureeTravaux: devisData?.info?.dureeTravaux || '1 jour',
        isDevisGratuit: devisData?.info?.isDevisGratuit !== undefined ? devisData.info.isDevisGratuit : true,
        logo: devisData?.info?.logo
      },
      
      objects3D,
      additionalLines,
      
      totals: {
        totalHT: devisData?.totals?.totalHT || 0,
        totalTVA: devisData?.totals?.totalTVA || 0,
        totalTTC: devisData?.totals?.totalTTC || 0,
        acompte: devisData?.totals?.acompte || 0,
        resteAPayer: devisData?.totals?.resteAPayer || 0,
        tvaRate: devisData?.totals?.tvaRate || 0.20,
        acompteRate: devisData?.totals?.acompteRate || 0.30
      },
      
      status: 'draft',
      
      originalDevisId: devisData?.originalDevisId,
      originalMaquetteId: devisData?.originalMaquetteId
    };
    
    console.log('✅ Conversion terminée:', {
      objects3D: document.objects3D.length,
      additionalLines: document.additionalLines.length,
      totalTTC: document.totals.totalTTC
    });
    
    return document;
  },

  // Convertir vers le format DevisService
  toDevisServiceFormat: (data: MaquetteDevisData) => {
    // Combiner toutes les lignes pour le devis
    const allLines = [
      // Objets 3D comme lignes de devis
      ...data.objects3D.map(obj => ({
        details: obj.details,
        price: obj.price,
        quantity: obj.quantity || 1,
        unit: obj.unit || 'U'
      })),
      // Lignes supplémentaires
      ...data.additionalLines.map(line => ({
        details: line.details,
        price: line.price,
        quantity: line.quantity,
        unit: line.unit
      }))
    ];

    return {
      info: data.devisInfo,
      lines: allLines,
      totals: data.totals,
      originalDevisId: data.originalDevisId,
      originalMaquetteId: data.originalMaquetteId,
      originalDevisName: data.name,
      originalDevisDescription: data.description
    };
  },

  // Convertir vers le format MaquetteService
  toMaquetteServiceFormat: (data: MaquetteDevisData) => {
    return {
      objects: data.objects3D.map(obj => ({
        ...obj,
        // S'assurer que gltf n'est pas inclus dans la sauvegarde
        gltf: undefined
      }))
    };
  },

  // Extraire les objets 3D pour les composants
  getObjects3D: (data: MaquetteDevisData): ObjectData[] => {
    return data.objects3D;
  },

  // Obtenir toutes les lignes de devis pour l'affichage (format ObjectData unifié)
  getAllDevisLines: (data: MaquetteDevisData): ObjectData[] => {
    const result: ObjectData[] = [];
    
    // Ajouter les objets 3D
    result.push(...data.objects3D);
    
    // Ajouter les lignes supplémentaires (convertir en format ObjectData)
    data.additionalLines.forEach(line => {
      result.push({
        id: line.id,
        url: '',
        price: line.price,
        details: line.details,
        position: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        texture: undefined,
        rotation: [0, 0, 0] as [number, number, number],
        color: '#ffffff',
        startPoint: undefined,
        endPoint: undefined,
        parentScale: [1, 1, 1] as [number, number, number],
        boundingBox: undefined,
        faces: undefined,
        type: 'devis-item' as const,
        parametricData: undefined,
        isBatiChiffrageObject: false,
        gltf: undefined,
        quantity: line.quantity,
        unit: line.unit
      } as ObjectData);
    });
    
    return result;
  }
};

// Utilitaire pour migrer les données existantes
export const migrateExistingData = () => {
  console.log('🔄 Démarrage de la migration des données existantes');
  
  try {
    // Récupérer les anciennes données
    const devisDataToLoad = localStorage.getItem('devisDataToLoad');
    const devisDataAutoSave = localStorage.getItem('devisDataAutoSave');
    
    let legacyData = null;
    
    if (devisDataToLoad) {
      legacyData = JSON.parse(devisDataToLoad);
      console.log('📂 Données trouvées dans devisDataToLoad');
    } else if (devisDataAutoSave) {
      legacyData = JSON.parse(devisDataAutoSave);
      console.log('📂 Données trouvées dans devisDataAutoSave');
    }
    
    if (legacyData) {
      // Convertir vers le nouveau format
      const objects: ObjectData[] = legacyData.objects || [];
      const unifiedData = dataConverter.fromLegacyFormat(objects, legacyData);
      
      // Sauvegarder dans le nouveau format
      localStorage.setItem('maquetteDevisData', JSON.stringify(unifiedData));
      
      console.log('✅ Migration terminée avec succès');
      return unifiedData;
    } else {
      console.log('ℹ️ Aucune donnée legacy à migrer');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  }
  
  return null;
};
