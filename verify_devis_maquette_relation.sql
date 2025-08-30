-- Script de vérification pour la relation devis-maquette
-- Exécuter ce script après avoir appliqué add_maquette_relation_to_devis.sql

-- 1. Vérifier la structure de la table devis
SELECT 'Structure de la table devis:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'devis' 
ORDER BY ordinal_position;

-- 2. Vérifier les contraintes de clé étrangère
SELECT 'Contraintes de clé étrangère:' as info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'devis';

-- 3. Vérifier les index
SELECT 'Index sur la table devis:' as info;
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'devis';

-- 4. Vérifier les devis avec leurs maquettes associées
SELECT 'Devis avec maquettes associées:' as info;
SELECT 
    d.id as devis_id,
    d.name as devis_name,
    d.maquette_id,
    m.name as maquette_name,
    d.status,
    d.created_at
FROM devis d
LEFT JOIN maquettes m ON d.maquette_id = m.id
ORDER BY d.created_at DESC;

-- 5. Vérifier les devis sans maquette
SELECT 'Devis sans maquette associée:' as info;
SELECT 
    id,
    name,
    status,
    created_at
FROM devis 
WHERE maquette_id IS NULL
ORDER BY created_at DESC;

-- 6. Statistiques
SELECT 'Statistiques:' as info;
SELECT 
    COUNT(*) as total_devis,
    COUNT(maquette_id) as devis_avec_maquette,
    COUNT(*) - COUNT(maquette_id) as devis_sans_maquette,
    ROUND(COUNT(maquette_id) * 100.0 / COUNT(*), 2) as pourcentage_avec_maquette
FROM devis;
