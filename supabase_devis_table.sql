-- Création de la table devis pour Supabase
-- Ce script doit être exécuté dans l'éditeur SQL de Supabase

-- Créer la table devis
CREATE TABLE IF NOT EXISTS devis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'cancelled')),
    signature_request_id TEXT,
    signature_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer un index sur user_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_devis_user_id ON devis(user_id);

-- Créer un index sur status pour filtrer facilement
CREATE INDEX IF NOT EXISTS idx_devis_status ON devis(status);

-- Créer un index sur created_at pour trier par date
CREATE INDEX IF NOT EXISTS idx_devis_created_at ON devis(created_at);

-- Créer un index sur updated_at pour trier par date de modification
CREATE INDEX IF NOT EXISTS idx_devis_updated_at ON devis(updated_at);

-- Activer Row Level Security (RLS)
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour que les utilisateurs ne voient que leurs propres devis
CREATE POLICY "Users can view their own devis" ON devis
    FOR SELECT USING (auth.uid() = user_id);

-- Créer une politique pour que les utilisateurs puissent insérer leurs propres devis
CREATE POLICY "Users can insert their own devis" ON devis
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Créer une politique pour que les utilisateurs puissent mettre à jour leurs propres devis
CREATE POLICY "Users can update their own devis" ON devis
    FOR UPDATE USING (auth.uid() = user_id);

-- Créer une politique pour que les utilisateurs puissent supprimer leurs propres devis
CREATE POLICY "Users can delete their own devis" ON devis
    FOR DELETE USING (auth.uid() = user_id);

-- Créer une fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Créer un trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_devis_updated_at 
    BEFORE UPDATE ON devis 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires sur la structure de la table
COMMENT ON TABLE devis IS 'Table pour stocker les devis des utilisateurs';
COMMENT ON COLUMN devis.id IS 'Identifiant unique du devis';
COMMENT ON COLUMN devis.user_id IS 'Identifiant de l''utilisateur propriétaire du devis';
COMMENT ON COLUMN devis.name IS 'Nom du devis';
COMMENT ON COLUMN devis.description IS 'Description optionnelle du devis';
COMMENT ON COLUMN devis.data IS 'Données JSON du devis (informations, lignes, totaux)';
COMMENT ON COLUMN devis.status IS 'Statut du devis: draft, sent, signed, cancelled';
COMMENT ON COLUMN devis.signature_request_id IS 'ID de la demande de signature YouSign';
COMMENT ON COLUMN devis.signature_url IS 'URL de la demande de signature';
COMMENT ON COLUMN devis.created_at IS 'Date de création du devis';
COMMENT ON COLUMN devis.updated_at IS 'Date de dernière modification du devis';
