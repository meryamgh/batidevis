import { create } from 'zustand';
import { ObjectData } from '../types/ObjectData';
import { DevisLine } from '../services/DevisService';

type SetStateAction<T> = T | ((prev: T) => T);

// Type for quote objects without gltf property
type QuoteObjectData = Omit<ObjectData, 'gltf'>;

// Type étendu pour les lignes de devis avec propriétés supplémentaires
type QuoteObjectDataWithDevis = QuoteObjectData & {
    quantity?: number;
    unit?: string;
};

interface MaquetteState {
    objects: ObjectData[];
    quote: QuoteObjectDataWithDevis[];
    setObjects: (objects: SetStateAction<ObjectData[]>) => void;
    setQuote: (quote: SetStateAction<QuoteObjectDataWithDevis[]>) => void;
    addObject: (object: ObjectData) => void;
    removeObject: (id: string) => void;
    updateObject: (id: string, updates: Partial<ObjectData>) => void;
    clearMaquette: () => void;
    syncObjectsAndQuote: () => void;
    loadDevisData: (objects: ObjectData[], devisLines: DevisLine[]) => void;
    addDevisLine: (line: DevisLine) => void;
    removeDevisLine: (id: string) => void;
    updateDevisLine: (id: string, updates: Partial<DevisLine>) => void;
}

export const useMaquetteStore = create<MaquetteState>((set) => ({
    objects: [],
    quote: [],
    setObjects: (objects) => set((state) => ({
        objects: typeof objects === 'function' ? objects(state.objects) : objects
    })),
    setQuote: (quote) => set((state) => ({
        quote: typeof quote === 'function' ? quote(state.quote) : quote
    })),
    addObject: (object) => set((state) => {
        const { gltf, ...quoteObject } = object;
        return {
            objects: [...state.objects, object],
            quote: [...state.quote, quoteObject]
        };
    }),
    removeObject: (id) => set((state) => ({
        objects: state.objects.filter(obj => obj.id !== id),
        quote: state.quote.filter(obj => obj.id !== id)
    })),
    updateObject: (id, updates) => set((state) => {
        const { gltf, ...quoteUpdates } = updates;
        return {
            objects: state.objects.map(obj => 
                obj.id === id ? { ...obj, ...updates } : obj
            ),
            quote: state.quote.map(obj => 
                obj.id === id ? { ...obj, ...quoteUpdates } : obj
            )
        };
    }),
    clearMaquette: () => set({ objects: [], quote: [] }),
    syncObjectsAndQuote: () => set((state) => {
        // Créer un map des objets de maquette par ID pour une recherche rapide
        const objectsMap = new Map(state.objects.map(obj => [obj.id, obj]));
        
        // Synchroniser le quote en préservant les éléments non-maquette
        const syncedQuote: QuoteObjectDataWithDevis[] = state.quote.map(quoteItem => {
            // Si l'élément du quote correspond à un objet de maquette, le mettre à jour
            const correspondingObject = objectsMap.get(quoteItem.id);
            if (correspondingObject) {
                const { gltf, ...updatedQuoteItem } = correspondingObject;
                return updatedQuoteItem;
            }
            // Sinon, garder l'élément du quote tel quel (éléments supplémentaires du devis)
            return quoteItem;
        });
        
        // Ajouter les nouveaux objets de maquette qui ne sont pas encore dans le quote
        const existingQuoteIds = new Set(state.quote.map(item => item.id));
        const newObjects = state.objects
            .filter(obj => !existingQuoteIds.has(obj.id))
            .map(({ gltf, ...obj }) => obj);
        
        return { 
            quote: [...syncedQuote, ...newObjects]
        };
    }),
    loadDevisData: (objects: ObjectData[], devisLines: DevisLine[]) => set((state) => {
        // Convertir les lignes de devis en objets de quote compatibles
        const devisLinesAsQuoteObjects: QuoteObjectDataWithDevis[] = devisLines.map((line, index) => ({
            id: `devis_line_${index}`, // Générer un ID unique pour les lignes de devis
            details: line.details,
            price: line.price,
            quantity: line.quantity,
            unit: line.unit,
            url: '', // Propriété requise
            position: [0, 0, 0], // Position par défaut
            scale: [1, 1, 1], // Échelle par défaut
            isBatiChiffrageObject: false // Marquer comme élément de devis, pas objet de maquette
        }));

        // Séparer les objets de maquette des lignes de devis dans le quote
        const maquetteObjects = objects.map(({ gltf, ...obj }) => obj);
        
        return {
            objects: objects,
            quote: [...maquetteObjects, ...devisLinesAsQuoteObjects]
        };
    }),
    addDevisLine: (line: DevisLine) => set((state) => {
        const newDevisLine: QuoteObjectDataWithDevis = {
            id: `devis_line_${Date.now()}`, // ID unique basé sur le timestamp
            details: line.details,
            price: line.price,
            quantity: line.quantity,
            unit: line.unit,
            url: '',
            position: [0, 0, 0],
            scale: [1, 1, 1],
            isBatiChiffrageObject: false
        };
        
        return {
            quote: [...state.quote, newDevisLine]
        };
    }),
    removeDevisLine: (id: string) => set((state) => ({
        quote: state.quote.filter(item => item.id !== id)
    })),
    updateDevisLine: (id: string, updates: Partial<DevisLine>) => set((state) => ({
        quote: state.quote.map(item => 
            item.id === id ? { ...item, ...updates } : item
        )
    }))
})); 