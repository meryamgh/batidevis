# Fonctionnalité de Sauvegarde des Devis

## Vue d'ensemble

Cette fonctionnalité permet de sauvegarder les devis dans Supabase avec un système de statuts pour suivre leur progression (brouillon, envoyé, signé, annulé).

## Installation

### 1. Créer la table dans Supabase

Exécutez le script SQL `supabase_devis_table.sql` dans l'éditeur SQL de votre projet Supabase.

### 2. Structure de la table

La table `devis` contient les colonnes suivantes :

- `id` : Identifiant unique du devis (UUID)
- `user_id` : Référence vers l'utilisateur propriétaire
- `name` : Nom du devis
- `description` : Description optionnelle
- `data` : Données JSON du devis (informations, lignes, totaux)
- `status` : Statut du devis ('draft', 'sent', 'signed', 'cancelled')
- `signature_request_id` : ID de la demande de signature YouSign
- `signature_url` : URL de la demande de signature
- `created_at` : Date de création
- `updated_at` : Date de dernière modification

### 3. Sécurité

La table utilise Row Level Security (RLS) pour que chaque utilisateur ne puisse voir et modifier que ses propres devis.

## Utilisation

### Sauvegarder un devis

1. Cliquez sur le bouton "💾 Sauvegarder le devis" dans l'interface
2. Entrez un nom pour le devis (pré-rempli avec "Devis [numéro] - [client]")
3. Ajoutez une description optionnelle
4. Cliquez sur "Sauvegarder"

### Statuts des devis

- **draft** : Brouillon (par défaut lors de la sauvegarde)
- **sent** : Devis envoyé pour signature
- **signed** : Devis signé par le client
- **cancelled** : Devis annulé

### Mise à jour automatique du statut

Le statut est automatiquement mis à jour lors des actions suivantes :

- **Envoi pour signature** : Le statut passe à 'sent'
- **Signature reçue** : Le statut passe à 'signed'
- **Annulation** : Le statut passe à 'cancelled'

## Structure des données JSON

Le champ `data` contient un objet JSON avec la structure suivante :

```json
{
  "info": {
    "devoTitle": "BatiDevis",
    "devoName": "Chen Emma",
    "devoAddress": "73 Rue Rateau",
    "devoCity": "93120 La Courneuve, France",
    "devoSiren": "SIREN : 000.000.000.000",
    "societeBatiment": "Société Bâtiment",
    "clientAdresse": "20 rue le blanc",
    "clientCodePostal": "75013 Paris",
    "clientTel": "0678891223",
    "clientEmail": "sociétébatiment@gmail.com",
    "devisNumero": "123",
    "enDateDu": "05/10/2024",
    "valableJusquau": "04/12/2024",
    "debutTravaux": "05/10/2024",
    "dureeTravaux": "1 jour",
    "fraisDeplacement": "",
    "tauxHoraire": "",
    "isDevisGratuit": true,
    "logo": "data:image/..."
  },
  "lines": [
    {
      "details": "Frais de déplacement - Déplacement standard (50,00€/déplacement)",
      "price": 50,
      "quantity": 1,
      "unit": "déplacement"
    }
  ],
  "totals": {
    "totalHT": 50,
    "totalTVA": 10,
    "totalTTC": 60,
    "acompte": 18,
    "resteAPayer": 42,
    "tvaRate": 0.2,
    "acompteRate": 0.3
  }
}
```

## API du service DevisService

### Méthodes principales

- `saveDevis(name, data, description, userId)` : Sauvegarder un nouveau devis
- `updateDevis(id, name, data, description, status)` : Mettre à jour un devis existant
- `updateDevisStatus(id, status, signatureRequestId, signatureUrl)` : Mettre à jour le statut
- `getUserDevis()` : Récupérer tous les devis de l'utilisateur
- `getDevisById(id)` : Récupérer un devis par son ID
- `deleteDevis(id)` : Supprimer un devis

### Exemple d'utilisation

```typescript
import { DevisService } from '../services/DevisService';

// Sauvegarder un devis
const devisData = {
  info: { /* informations du devis */ },
  lines: [ /* lignes du devis */ ],
  totals: { /* totaux */ }
};

const savedDevis = await DevisService.saveDevis(
  "Devis 123 - Client ABC",
  devisData,
  "Description optionnelle"
);

// Mettre à jour le statut après envoi pour signature
await DevisService.updateDevisStatus(
  savedDevis.id,
  'sent',
  signatureRequestId,
  signatureUrl
);
```

## Intégration avec YouSign

Le système est conçu pour s'intégrer avec YouSign pour la signature électronique :

1. Lors de l'envoi pour signature, le statut passe à 'sent'
2. L'ID de la demande de signature et l'URL sont stockés
3. Lors de la signature, le statut passe à 'signed'

## Gestion des erreurs

Le service gère automatiquement :
- Les erreurs d'authentification
- Les erreurs de connexion à Supabase
- La validation des données
- Les timeouts

## Performance

La table est optimisée avec des index sur :
- `user_id` : Pour filtrer par utilisateur
- `status` : Pour filtrer par statut
- `created_at` et `updated_at` : Pour le tri chronologique

## Maintenance

- Les timestamps sont automatiquement mis à jour
- La suppression en cascade est activée (si un utilisateur est supprimé, ses devis le sont aussi)
- Les politiques RLS garantissent la sécurité des données
