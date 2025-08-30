# Guide d'utilisation - Sauvegarde des Devis

## 🚀 Installation

### 1. Créer la table dans Supabase

1. Connectez-vous à votre projet Supabase
2. Allez dans l'éditeur SQL
3. Copiez et exécutez le contenu du fichier `supabase_devis_table.sql`

### 2. Vérifier la configuration

Assurez-vous que vos variables d'environnement Supabase sont configurées dans votre fichier `.env` :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon_supabase
```

## 📋 Utilisation

### Sauvegarder un devis

1. **Ouvrir un devis** : Accédez à la page de création/édition de devis
2. **Remplir le devis** : Ajoutez toutes les informations nécessaires (client, lignes, totaux, etc.)
3. **Sauvegarder** : Cliquez sur le bouton "💾 Sauvegarder le devis"
4. **Nommer le devis** : Entrez un nom descriptif (pré-rempli avec "Devis [numéro] - [client]")
5. **Ajouter une description** (optionnel) : Décrivez le contexte du devis
6. **Confirmer** : Cliquez sur "Sauvegarder"

### Statuts des devis

Le système gère automatiquement les statuts suivants :

- **📝 draft** : Brouillon (par défaut lors de la sauvegarde)
- **📤 sent** : Devis envoyé pour signature électronique
- **✅ signed** : Devis signé par le client
- **❌ cancelled** : Devis annulé

### Workflow complet

1. **Création** → Statut : `draft`
2. **Envoi pour signature** → Statut : `sent` (automatique)
3. **Signature reçue** → Statut : `signed` (à implémenter selon vos besoins)
4. **Annulation** → Statut : `cancelled` (manuel)

## 🔧 Intégration avec YouSign

### Envoi automatique pour signature

Lorsque vous envoyez un devis pour signature :

1. Le devis est automatiquement sauvegardé avec le statut `sent`
2. L'ID de la demande de signature YouSign est stocké
3. L'URL de signature est sauvegardée pour accès ultérieur

### Mise à jour du statut

Pour mettre à jour le statut lors de la signature :

```typescript
// Exemple de mise à jour du statut après signature
await DevisService.updateDevisStatus(
  devisId,
  'signed',
  signatureRequestId,
  signatureUrl
);
```

## 📊 Structure des données

### Informations sauvegardées

Le système sauvegarde toutes les informations du devis :

- **Informations BatiDevis** : Titre, nom, adresse, SIREN
- **Informations client** : Société, adresse, contact
- **Détails du devis** : Numéro, dates, durée
- **Lignes de devis** : Désignation, prix, quantités
- **Totaux** : HT, TTC, TVA, acompte
- **Logo** : Image du logo (base64)

### Exemple de données JSON

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
    "logo": "data:image/png;base64,..."
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

## 🛠️ API du service

### Méthodes principales

```typescript
import { DevisService } from '../services/DevisService';

// Sauvegarder un nouveau devis
const savedDevis = await DevisService.saveDevis(
  "Nom du devis",
  devisData,
  "Description optionnelle"
);

// Mettre à jour un devis existant
const updatedDevis = await DevisService.updateDevis(
  devisId,
  "Nouveau nom",
  devisData,
  "Nouvelle description"
);

// Mettre à jour le statut
await DevisService.updateDevisStatus(
  devisId,
  'sent',
  signatureRequestId,
  signatureUrl
);

// Récupérer tous les devis de l'utilisateur
const userDevis = await DevisService.getUserDevis();

// Récupérer un devis par ID
const devis = await DevisService.getDevisById(devisId);

// Supprimer un devis
await DevisService.deleteDevis(devisId);
```

## 🧪 Tests

### Tester le service

Vous pouvez tester le service en utilisant le fichier de test :

```typescript
import { testDevisService } from '../services/DevisService.test';

// Exécuter les tests
await testDevisService();
```

Ou dans la console du navigateur :

```javascript
// Si le test est exposé globalement
await window.testDevisService();
```

## 🔒 Sécurité

### Row Level Security (RLS)

La table utilise RLS pour garantir que :

- Chaque utilisateur ne voit que ses propres devis
- Seul le propriétaire peut modifier/supprimer ses devis
- Les données sont isolées par utilisateur

### Politiques de sécurité

- **SELECT** : `auth.uid() = user_id`
- **INSERT** : `auth.uid() = user_id`
- **UPDATE** : `auth.uid() = user_id`
- **DELETE** : `auth.uid() = user_id`

## 📈 Performance

### Index optimisés

La table inclut des index pour optimiser les requêtes :

- `user_id` : Filtrage par utilisateur
- `status` : Filtrage par statut
- `created_at` : Tri chronologique
- `updated_at` : Tri par modification

### Bonnes pratiques

- Utilisez les méthodes du service plutôt que des requêtes directes
- Gérez les erreurs avec try/catch
- Vérifiez l'authentification avant les opérations

## 🐛 Dépannage

### Erreurs courantes

1. **"Aucun utilisateur connecté"**
   - Vérifiez que l'utilisateur est authentifié
   - Rafraîchissez la session si nécessaire

2. **"Erreur lors de la sauvegarde"**
   - Vérifiez la connexion à Supabase
   - Vérifiez les permissions RLS
   - Vérifiez la structure des données

3. **"Table devis n'existe pas"**
   - Exécutez le script SQL de création de table
   - Vérifiez que vous êtes dans le bon projet Supabase

### Debug

Utilisez la méthode de debug pour diagnostiquer les problèmes :

```typescript
const authResult = await DevisService.debugAuth();
console.log('Auth status:', authResult);
```

## 📞 Support

Pour toute question ou problème :

1. Vérifiez les logs de la console
2. Testez avec le fichier de test
3. Vérifiez la configuration Supabase
4. Consultez la documentation Supabase
