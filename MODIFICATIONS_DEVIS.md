# Modifications apportées à la page MesDevisFactures

## 1. Modification du statut de la table devis

### Fichier SQL : `update_devis_status_french_fixed.sql`
- Changement des statuts de l'anglais vers le français :
  - `draft` → `brouillon`
  - `sent` → `envoyé`
  - `signed` → `signé`
  - `cancelled` → `annulé`
  - Ajout du statut `accepté`

### Instructions d'exécution :
1. Aller dans l'éditeur SQL de Supabase
2. Exécuter le script `update_devis_status_french_fixed.sql`
3. Ce script met d'abord à jour les données existantes, puis ajoute la nouvelle contrainte CHECK
4. Exécuter le script `verify_devis_status.sql` pour vérifier que la migration s'est bien passée

## 2. Mise à jour du service DevisService

### Fichier : `src/services/DevisService.ts`
- Mise à jour de l'interface `Devis` pour utiliser les nouveaux statuts en français
- Modification des valeurs par défaut de `'draft'` vers `'brouillon'`

## 3. Amélioration de la page MesDevisFactures

### Fichier : `src/pages/MesDevisFactures.tsx`

#### Nouvelles fonctionnalités :
- **Récupération des devis depuis Supabase** : Utilisation de `DevisService.getUserDevis()`
- **États de chargement** : Affichage d'un message pendant le chargement
- **Gestion des erreurs** : Affichage des erreurs de récupération
- **État vide** : Message quand aucun devis n'est trouvé
- **Redirection vers maquette** : Le bouton "CRÉER UN DEVIS" redirige vers `/maquette`

#### Modifications apportées :
- Ajout des imports nécessaires (`useNavigate`, `DevisService`, `Devis`)
- Ajout des états pour gérer les devis, le chargement et les erreurs
- Utilisation de `useEffect` pour récupérer les devis au chargement de la page
- Conversion des données Supabase vers le format d'affichage
- Mise à jour des statuts dans les filtres et les fonctions d'affichage
- Ajout de la fonction `handleCreerDevis` pour la redirection

## 4. Amélioration des styles CSS

### Fichier : `src/styles/MesDevisFactures.css`
- Ajout des styles pour les états de chargement, d'erreur et vide
- Classes CSS : `.loading-message`, `.error-message`, `.empty-message`

## 5. Fonctionnalités ajoutées

### Navigation :
- Clic sur "CRÉER UN DEVIS" → Redirection vers `/maquette`

### Affichage des devis :
- Récupération automatique depuis Supabase
- Affichage du nom du devis, client, date, montant et statut
- Filtrage par statut avec les nouveaux statuts en français
- Recherche par nom de devis ou client

### Gestion des états :
- **Chargement** : "Chargement des devis..."
- **Erreur** : Affichage du message d'erreur
- **Vide** : "Aucun devis trouvé"

## 6. Statuts disponibles

Les nouveaux statuts en français sont :
- **Brouillon** : Devis en cours de création
- **Envoyé** : Devis envoyé au client
- **Accepté** : Devis accepté par le client
- **Annulé** : Devis annulé
- **Signé** : Devis signé par le client

## 7. Relation Devis-Maquette

### Nouvelle fonctionnalité : Liaison automatique devis-maquette

Chaque devis est maintenant automatiquement lié à sa maquette correspondante. Lors de la sauvegarde d'un devis, la maquette associée est également enregistrée.

### Fichier SQL : `add_maquette_relation_to_devis.sql`
- Ajout de la colonne `maquette_id` à la table devis
- Création d'une clé étrangère vers la table maquettes
- Mise à jour des statuts en français
- Création d'index pour optimiser les performances

### Nouvelles méthodes dans DevisService :
- `saveDevisWithMaquette()` : Sauvegarde un devis avec sa maquette
- `getDevisWithMaquette()` : Récupère un devis avec sa maquette
- `getUserDevisWithMaquettes()` : Récupère tous les devis avec leurs maquettes

### Modifications de l'interface :
- Affichage de la maquette associée dans la page MesDevisFactures
- Sauvegarde automatique de la maquette lors de la création d'un devis

## 8. Fonctionnalités des boutons d'action

### Bouton "Modifier" :
- **Fonctionnalité** : Redirige vers la page maquette avec les données de la maquette associée
- **Comportement** :
  - Vérifie si le devis a une maquette associée
  - Récupère les données de la maquette via `MaquetteService.getMaquetteById()`
  - Navigue vers `/maquette` avec les données de la maquette dans `location.state`
  - Affiche une alerte si aucune maquette n'est associée
- **Gestion d'erreur** : Affiche une alerte en cas d'erreur lors du chargement de la maquette

### Bouton "Supprimer" :
- **Fonctionnalité** : Supprime le devis et sa maquette associée
- **Comportement** :
  - Affiche une boîte de dialogue de confirmation
  - Supprime le devis via `DevisService.deleteDevis()`
  - Supprime la maquette associée via `MaquetteService.deleteMaquette()` (si elle existe)
  - Recharge automatiquement la liste des devis
  - Affiche un message de succès
- **États visuels** :
  - Bouton désactivé pendant la suppression
  - Texte change en "Suppression..."
  - Style visuel indiquant l'état de suppression
- **Gestion d'erreur** : Affiche une alerte en cas d'erreur lors de la suppression

### Améliorations CSS :
- Ajout des styles pour l'état de suppression (`.bouton-action.supprimer.deleting`)
- Ajout des styles pour les boutons désactivés (`.bouton-action:disabled`)
- Désactivation des effets hover pour les boutons en cours d'action

## 9. Correction du problème de positionnement des maquettes

### Problème identifié :
Lors du chargement d'une maquette depuis le bouton "Modifier", les objets n'apparaissaient pas dans les bonnes positions.

### Cause du problème :
Dans `src/pages/MaquettePage.tsx`, la fonction `loadMaquetteData` divisait les positions par 2 (`position[0] / 2`, etc.) lors du chargement, ce qui causait un mauvais positionnement des objets.

### Corrections apportées :

#### Fichier : `src/pages/MaquettePage.tsx`
- **Suppression de la division par 2** : Les positions sont maintenant chargées telles qu'elles ont été sauvegardées
- **Amélioration de la validation des données** : La fonction `cleanObjectData` valide maintenant correctement les positions, échelles et rotations
- **Ajout de logs détaillés** : Pour faciliter le débogage du chargement des maquettes
- **Délai d'application des textures** : Augmentation du délai pour l'application des textures et faces (500ms au lieu de 100ms)
- **Recentrage automatique de la caméra** : La caméra se recentre automatiquement après le chargement de la maquette

#### Modifications spécifiques :
```typescript
// AVANT (problématique)
const adjustedPosition: [number, number, number] = [
    objData.position[0] / 2,
    objData.position[1] / 2,
    objData.position[2] / 2
];

// APRÈS (corrigé)
position: objData.position, // Utiliser la position originale
```

#### Améliorations de la validation :
- Conversion explicite des coordonnées en nombres
- Gestion des valeurs NaN avec des valeurs par défaut
- Validation des tableaux de positions, échelles et rotations

### Résultat :
- Les objets apparaissent maintenant dans leurs positions correctes lors du chargement d'une maquette
- Meilleure stabilité du chargement des maquettes
- Logs détaillés pour faciliter le débogage
- Recentrage automatique de la caméra pour une meilleure expérience utilisateur

## 10. Correction de la synchronisation des objets

### Problème identifié :
Les positions des objets n'étaient pas correctement synchronisées entre les listes `objects` et `quote` dans le store, causant des problèmes de positionnement lors de la sauvegarde et du chargement.

### Cause du problème :
Dans `src/hooks/useObjects.tsx`, plusieurs fonctions de mise à jour (`handleUpdatePosition`, `handleRotateObject`, `handleUpdateFaces`) ne mettaient à jour que la liste `objects` et pas la liste `quote`, créant une désynchronisation.

### Corrections apportées :

#### Fichier : `src/hooks/useObjects.tsx`
- **Synchronisation de `handleUpdatePosition`** : Mise à jour des deux listes `objects` et `quote`
- **Synchronisation de `handleRotateObject`** : Mise à jour des deux listes pour les rotations
- **Synchronisation de `handleUpdateTexture`** : Refactorisation pour mettre à jour les deux listes
- **Synchronisation de `handleUpdateFaces`** : Mise à jour des deux listes pour les faces
- **Ajout de logs détaillés** : Pour tracer les mises à jour de position

#### Modifications spécifiques :
```typescript
// AVANT (problématique)
const handleUpdatePosition = (id: string, position: [number, number, number]) => {
    setObjects((prev) => prev.map((obj) => 
        obj.id === id ? { ...obj, position } : obj
    ));
};

// APRÈS (corrigé)
const handleUpdatePosition = (id: string, position: [number, number, number]) => {
    // Mettre à jour les deux listes pour maintenir la synchronisation
    setObjects((prev) => prev.map((obj) => 
        obj.id === id ? { ...obj, position } : obj
    ));
    
    setQuote((prev) => prev.map((obj) => 
        obj.id === id ? { ...obj, position } : obj
    ));
};
```

#### Fichier : `src/store/maquetteStore.ts`
- **Ajout de la fonction `syncObjectsAndQuote`** : Force la synchronisation entre les deux listes
- **Exclusion de `gltf` de `quote`** : Évite les problèmes de sérialisation

#### Fichier : `src/pages/FullQuote.tsx`
- **Synchronisation avant sauvegarde** : Appel de `syncObjectsAndQuote()` avant la sauvegarde
- **Logs de sauvegarde** : Ajout de logs détaillés pour tracer les données sauvegardées

### Résultat :
- Les positions sont maintenant correctement synchronisées entre `objects` et `quote`
- La sauvegarde utilise les positions les plus récentes
- Le chargement des maquettes affiche les objets dans leurs positions correctes
- Meilleure cohérence des données dans toute l'application

## 11. Instructions de déploiement

1. **Exécuter les scripts SQL** dans l'éditeur SQL de Supabase :
   - Exécuter `add_maquette_relation_to_devis.sql`
   - Exécuter `verify_devis_maquette_relation.sql` pour vérifier la relation

2. **Redéployer l'application** avec les modifications du code

3. **Tester la sauvegarde** d'un devis avec sa maquette

4. **Vérifier l'affichage** des maquettes dans MesDevisFactures

5. **Tester les nouvelles fonctionnalités** :
   - Clic sur "Modifier" pour rediriger vers la maquette
   - Clic sur "Supprimer" pour supprimer un devis
   - Vérifier que les objets se positionnent correctement lors du chargement

## 11. Résolution des erreurs

### Erreur de contrainte CHECK
Si vous rencontrez l'erreur `check constraint "devis_status_check" of relation "devis" is violated by some row`, cela signifie qu'il y a des données existantes avec les anciens statuts. Le script `update_devis_status_french_fixed.sql` corrige ce problème en :
1. Supprimant d'abord la contrainte CHECK
2. Mettant à jour les données existantes
3. Réajoutant la nouvelle contrainte CHECK

### Problème de positionnement des maquettes
Si les objets n'apparaissent pas dans les bonnes positions lors du chargement d'une maquette, vérifiez que :
1. Les positions sont bien sauvegardées dans la base de données
2. La fonction `loadMaquetteData` utilise les positions originales (sans division par 2)
3. Les logs de la console ne montrent pas d'erreurs de chargement
