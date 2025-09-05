import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useMaquetteDevis } from '../hooks/useMaquetteDevis';

// Exemple d'utilisation de la structure unifiée dans MaquettePage
const MaquettePageUnified: React.FC = () => {
  const location = useLocation();
  const {
    currentDocument,
    isLoading,
    isDirty,
    loadFromNavigation,
    createNewDocument,
    removeObject3D,
    addDevisLine,
    getObjects3D,
    getAllDevisLines,
    isEditingExisting,
    updateDevisInfo,
    saveToDatabase
  } = useMaquetteDevis();

  // Gérer la navigation et les données
  useEffect(() => {
    if (location.state?.devisData || location.state?.maquetteData) {
      // Chargement depuis navigation (modification d'un devis existant)
      loadFromNavigation(location.state);
    } else if (!currentDocument) {
      // Nouveau devis
      createNewDocument();
    }
  }, [location.state, currentDocument, loadFromNavigation, createNewDocument]);

  // Fonctions pour les composants
  const handleRemoveObject = (id: string) => {
    removeObject3D(id);
  };

  const handleAddManualLine = () => {
    addDevisLine({
      details: 'Nouvelle ligne manuelle',
      price: 0,
      quantity: 1,
      unit: 'U',
      type: 'manual',
      category: 'Manuel'
    });
  };


  const handleSave = async () => {
    if (!currentDocument) return;
    
    try {
      const name = currentDocument.name || `Devis ${currentDocument.devisInfo.devisNumero}`;
      await saveToDatabase(name, currentDocument.description);
      alert('Document sauvegardé avec succès !');
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  // Obtenir les données pour les composants
  const objects3D = getObjects3D();
  const allDevisLines = getAllDevisLines();

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Zone principale - Maquette 3D */}
      <div style={{ flex: 1, padding: '20px' }}>
        <h1>Maquette 3D</h1>
        
        {/* Informations du document */}
        {currentDocument && (
          <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <h3>{currentDocument.name}</h3>
            <p>Status: {currentDocument.status}</p>
            <p>Dernière modification: {currentDocument.updatedAt ? new Date(currentDocument.updatedAt).toLocaleString() : 'Jamais'}</p>
            <p>Mode: {isEditingExisting() ? 'Modification' : 'Création'}</p>
            {isDirty && <p style={{ color: 'orange' }}>⚠️ Modifications non sauvegardées</p>}
          </div>
        )}

        {/* Contrôles */}
        <div style={{ marginBottom: '20px' }}>
          <button onClick={handleAddManualLine} style={{ marginRight: '10px' }}>
            Ajouter ligne manuelle
          </button>
          <button onClick={handleSave} disabled={!currentDocument} style={{ marginRight: '10px' }}>
            {isEditingExisting() ? 'Mettre à jour' : 'Sauvegarder'}
          </button>
        </div>

        {/* Informations du devis */}
        {currentDocument && (
          <div style={{ marginBottom: '20px' }}>
            <h4>Informations du devis</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input
                type="text"
                placeholder="Nom de l'entreprise"
                value={currentDocument.devisInfo.societeBatiment}
                onChange={(e) => updateDevisInfo({ societeBatiment: e.target.value })}
              />
              <input
                type="text"
                placeholder="Numéro de devis"
                value={currentDocument.devisInfo.devisNumero}
                onChange={(e) => updateDevisInfo({ devisNumero: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Totaux */}
        {currentDocument && (
          <div style={{ padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
            <h4>Totaux</h4>
            <p>Total HT: {currentDocument.totals.totalHT.toFixed(2)} €</p>
            <p>TVA: {currentDocument.totals.totalTVA.toFixed(2)} €</p>
            <p><strong>Total TTC: {currentDocument.totals.totalTTC.toFixed(2)} €</strong></p>
          </div>
        )}

        {/* Liste des objets 3D */}
        <div style={{ marginTop: '20px' }}>
          <h4>Objets 3D ({objects3D.length})</h4>
          {objects3D.map((obj) => (
            <div key={obj.id} style={{ padding: '5px', border: '1px solid #ddd', margin: '5px 0' }}>
              <span>{obj.details} - {obj.price}€</span>
              <button onClick={() => handleRemoveObject(obj.id)} style={{ marginLeft: '10px' }}>
                Supprimer
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Panel de droite - Devis */}
      <div style={{ width: '400px', borderLeft: '1px solid #ddd', padding: '20px' }}>
        <h3>Lignes de Devis ({allDevisLines.length})</h3>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {allDevisLines.map((line) => (
            <div key={line.id} style={{ 
              padding: '10px', 
              border: '1px solid #ddd', 
              margin: '5px 0',
              borderRadius: '4px',
              backgroundColor: '#f9f9f9'
            }}>
              <div style={{ fontWeight: 'bold' }}>{line.details}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {(line.quantity || 1)} x {line.price}€ = {((line.quantity || 1) * line.price).toFixed(2)}€
              </div>
              <button 
                onClick={() => handleRemoveObject(line.id)}
                style={{ 
                  marginTop: '5px', 
                  padding: '2px 8px', 
                  backgroundColor: '#dc3545', 
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
        
        {allDevisLines.length === 0 && (
          <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
            Aucune ligne de devis
          </p>
        )}
      </div>
    </div>
  );
};

export default MaquettePageUnified;
