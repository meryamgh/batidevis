-- Script pour ajouter la relation entre devis et maquettes
-- Ce script doit être exécuté dans l'éditeur SQL de Supabase

-- 1. Ajouter la colonne maquette_id à la table devis
ALTER TABLE devis ADD COLUMN IF NOT EXISTS maquette_id UUID REFERENCES maquettes(id) ON DELETE SET NULL;

-- 2. Créer un index sur maquette_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_devis_maquette_id ON devis(maquette_id);

-- 3. Ajouter un commentaire sur la nouvelle colonne
COMMENT ON COLUMN devis.maquette_id IS 'Référence vers la maquette associée au devis';

-- 4. Mettre à jour la contrainte CHECK pour les statuts en français (si pas déjà fait)
ALTER TABLE devis DROP CONSTRAINT IF EXISTS devis_status_check;
ALTER TABLE devis ADD CONSTRAINT devis_status_check 
CHECK (status IN ('brouillon', 'envoyé', 'accepté', 'annulé', 'signé'));

-- 5. Mettre à jour la valeur par défaut du statut
ALTER TABLE devis ALTER COLUMN status SET DEFAULT 'brouillon';

-- 6. Vérification de la structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'devis' 
ORDER BY ordinal_position;
