import { create } from 'zustand';
import { ObjectData } from '../types/ObjectData';

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
    syncObjectsAndQuote: () => void;
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
    syncObjectsAndQuote: () => set((state) => {
        // Synchroniser quote avec objects
        const syncedQuote = state.objects.map(obj => ({
            ...obj,
            gltf: undefined // Exclure gltf de quote car il ne peut pas être sérialisé
        }));
        return { quote: syncedQuote };
    })
})); 