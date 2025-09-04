// Fonction utilitaire pour générer des IDs uniques
export const generateUniqueId = (prefix: string = 'item'): string => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
