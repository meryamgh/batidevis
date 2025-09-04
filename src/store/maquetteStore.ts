import { create } from 'zustand';
import { ObjectData } from '../types/ObjectData';
import { generateUniqueId } from '../utils/generateUniqueId';

type SetStateAction<T> = T | ((prev: T) => T);

interface MaquetteState {
    objects: ObjectData[];
    quote: ObjectData[];
    setObjects: (objects: SetStateAction<ObjectData[]>) => void;
    setQuote: (quote: SetStateAction<ObjectData[]>) => void;
    addObject: (object: ObjectData) => void;
    removeObject: (id: string) => void;
    updateObject: (id: string, updates: Partial<ObjectData>) => void;
    clearMaquette: () => void;
    syncObjectsAndQuote: (devisData?: any[]) => void;
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
    addObject: (object) => set((state) => ({
        objects: [...state.objects, object],
        quote: [...state.quote, object]
    })),
    removeObject: (id) => set((state) => ({
        objects: state.objects.filter(obj => obj.id !== id),
        quote: state.quote.filter(obj => obj.id !== id)
    })),
    updateObject: (id, updates) => set((state) => ({
        objects: state.objects.map(obj => 
            obj.id === id ? { ...obj, ...updates } : obj
        ),
        quote: state.quote.map(obj => 
            obj.id === id ? { ...obj, ...updates } : obj
        )
    })),
    clearMaquette: () => set({ objects: [], quote: [] }),
    syncObjectsAndQuote: (devisData?: any[]) => set((state) => {
        if (devisData && devisData.length > 0) {
            // Convertir les données du devis en format compatible avec quote
            // mais SANS les ajouter aux objects (maquette 3D)
            const syncedQuote = devisData.map((item, index) => ({
                id: item.id || generateUniqueId(`devis-item-${index}`),
                url: '', // Pas d'URL pour les éléments de devis
                price: item.price || 0,
                details: item.details || 'Produit sans nom',
                position: [0, 0, 0] as [number, number, number],
                scale: [1, 1, 1] as [number, number, number],
                texture: undefined, // Utiliser undefined au lieu de null
                rotation: [0, 0, 0] as [number, number, number],
                color: '#ffffff',
                startPoint: undefined, // Utiliser undefined au lieu de null
                endPoint: undefined, // Utiliser undefined au lieu de null
                parentScale: [1, 1, 1] as [number, number, number],
                boundingBox: undefined, // Utiliser undefined au lieu de null
                faces: undefined, // Utiliser undefined au lieu de null
                type: 'devis-item' as const,
                parametricData: undefined, // Utiliser undefined au lieu de null
                isBatiChiffrageObject: false,
                gltf: undefined // Exclure gltf de quote car il ne peut pas être sérialisé
            }));
            
            // Mettre à jour UNIQUEMENT le quote, pas les objects
            return { 
                objects: state.objects, // Garder les objets 3D existants inchangés
                quote: syncedQuote 
            };
        } else {
            // Sinon, synchroniser quote avec objects comme avant
            const syncedQuote = state.objects.map(obj => ({
                ...obj,
                gltf: undefined // Exclure gltf de quote car il ne peut pas être sérialisé
            }));
            return { quote: syncedQuote };
        }
    })
})); 