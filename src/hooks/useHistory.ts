import { useState, useCallback } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

// Fonction pour comparer deux objets de manière sûre
const areObjectsEqual = (obj1: any, obj2: any): boolean => {
  // Si les objets sont des tableaux
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((item, index) => {
      // Pour les objets avec ID, on compare uniquement les IDs
      if (item && item.id && obj2[index] && obj2[index].id) {
        return item.id === obj2[index].id;
      }
      return true;
    });
  }
  // Pour les objets simples avec ID
  if (obj1 && obj2 && obj1.id && obj2.id) {
    return obj1.id === obj2.id;
  }
  return true;
};

export function useHistory<T>(initialPresent: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: []
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  // Sauvegarder un nouvel état
  const saveState = useCallback((newPresent: T) => {
    // setState(currentState => {
    //   // Si le nouvel état correspond au prochain état dans future,
    //   // c'est probablement une action redo manuelle, donc on ne vide pas future
    //   if (currentState.future.length > 0 && 
    //       areObjectsEqual(currentState.future[0], newPresent)) {
    //     return {
    //       past: [...currentState.past, currentState.present],
    //       present: newPresent,
    //       future: currentState.future.slice(1)
    //     };
    //   }
      
    //   // Sinon, c'est une nouvelle action, donc on vide future
    //   return {
    //     past: [...currentState.past, currentState.present],
    //     present: newPresent,
    //     future: []
    //   };
    // });
  }, []);

  // Annuler la dernière action
  const undo = useCallback(() => {
    setState(currentState => {
      if (currentState.past.length === 0) return currentState;

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future]
      };
    });
  }, []);

  // Rétablir la dernière action annulée
  const redo = useCallback(() => {
    setState(currentState => {
      if (currentState.future.length === 0) return currentState;

      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);

      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  return {
    state: state.present,
    saveState,
    undo,
    redo,
    canUndo,
    canRedo
  };
} 