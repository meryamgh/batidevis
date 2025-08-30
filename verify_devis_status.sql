-- Script de vérification pour la migration des statuts devis
-- Exécuter ce script après avoir appliqué update_devis_status_french_fixed.sql

-- 1. Vérifier les statuts actuels dans la table
SELECT 'Statuts actuels dans la table devis:' as info;
SELECT DISTINCT status, COUNT(*) as nombre_devis 
FROM devis 
GROUP BY status 
ORDER BY status;

-- 2. Vérifier la contrainte CHECK
SELECT 'Contrainte CHECK actuelle:' as info;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'devis'::regclass AND contype = 'c';

-- 3. Vérifier la valeur par défaut
SELECT 'Valeur par défaut de la colonne status:' as info;
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'devis' AND column_name = 'status';

-- 4. Vérifier qu'il n'y a plus d'anciens statuts
SELECT 'Vérification des anciens statuts (doit être vide):' as info;
SELECT status, COUNT(*) as nombre 
FROM devis 
WHERE status IN ('draft', 'sent', 'signed', 'cancelled')
GROUP BY status;
