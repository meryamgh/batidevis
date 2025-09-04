import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { DevisService, Devis } from '../services/DevisService';
import { MaquetteService } from '../services/MaquetteService';
import '../styles/MesDevisFactures.css';

interface Document {
    id: string;
    type: 'devis' | 'facture';
    numero: string;
    client: string;
    date: string;
    montant: number;
    statut: 'brouillon' | 'envoyé' | 'accepté' | 'annulé' | 'signé';
    maquette_id?: string;
    maquette_name?: string;
}

const MesDevisFactures: React.FC = () => {
    const navigate = useNavigate();
    const [scrollPosition] = useState(0);
    const [ongletActif, setOngletActif] = useState<'devis' | 'factures'>('devis');
    const [recherche, setRecherche] = useState('');
    const [filtreStatut, setFiltreStatut] = useState('tous');
    const [devisWithMaquettes, setDevisWithMaquettes] = useState<Array<{ devis: Devis; maquette: any }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingDevisId, setDeletingDevisId] = useState<string | null>(null);

    // Récupérer les devis avec leurs maquettes depuis Supabase
    useEffect(() => {
        const fetchDevis = async () => {
            try {
                setLoading(true);
                const devisData = await DevisService.getUserDevisWithMaquettes();
                setDevisWithMaquettes(devisData);
            } catch (err) {
                console.error('Erreur lors de la récupération des devis:', err);
                setError('Erreur lors de la récupération des devis');
            } finally {
                setLoading(false);
            }
        };

        fetchDevis();
    }, []);

    // Convertir les devis en format Document pour l'affichage
    const documents: Document[] = devisWithMaquettes.map(({ devis, maquette }) => ({
        id: devis.id || '',
        type: 'devis' as const,
        numero: devis.name,
        client: devis.data?.info?.societeBatiment || 'Client non spécifié',
        date: devis.created_at || new Date().toISOString(),
        montant: devis.data?.totals?.totalTTC || 0,
        statut: devis.status,
        maquette_id: devis.maquette_id,
        maquette_name: maquette?.name || 'Aucune maquette'
    }));

    const getCouleurStatut = (statut: string) => {
        switch (statut) {
            case 'brouillon': return 'statut-attente';
            case 'envoyé': return 'statut-accepte';
            case 'accepté': return 'statut-accepte';
            case 'annulé': return 'statut-refuse';
            case 'signé': return 'statut-paye';
            default: return '';
        }
    };

    const getTexteStatut = (statut: string) => {
        switch (statut) {
            case 'brouillon': return 'Brouillon';
            case 'envoyé': return 'Envoyé';
            case 'accepté': return 'Accepté';
            case 'annulé': return 'Annulé';
            case 'signé': return 'Signé';
            default: return statut;
        }
    };

    const documentsFiltres = documents.filter(doc => {
        const correspondType = ongletActif === 'devis' ? doc.type === 'devis' : doc.type === 'facture';
        const correspondRecherche = doc.client.toLowerCase().includes(recherche.toLowerCase()) ||
                            doc.numero.toLowerCase().includes(recherche.toLowerCase());
        const correspondStatut = filtreStatut === 'tous' || doc.statut === filtreStatut;
        return correspondType && correspondRecherche && correspondStatut;
    });

    // Fonction pour rediriger vers la page maquette
    const handleCreerDevis = () => {
        navigate('/maquette');
    };

    // Fonction pour modifier un devis (rediriger vers la maquette)
    const handleModifierDevis = async (doc: any) => {
        try { 
            
            if (!doc.maquette_id) {
                alert('Aucune maquette associée à ce devis');
                return;
            }
            
            // Récupérer à la fois le devis ET la maquette
            const { devis, maquette } = await DevisService.getDevisWithMaquette(doc.id); 
            
            navigate('/maquette', { 
                state: { 
                    maquetteData: maquette.data,
                    maquetteName: maquette.name,
                    devisData: devis.data // Ajouter les données du devis
                } 
            });
        } catch (error) {
            console.error('Erreur lors de la récupération du devis et de la maquette:', error);
            alert('Erreur lors de la récupération du devis et de la maquette');
        }
    };

    // Fonction pour supprimer un devis
    const handleSupprimerDevis = async (doc: Document) => {
        

        try {
            setDeletingDevisId(doc.id);
            
            // Supprimer le devis
            await DevisService.deleteDevis(doc.id);
            
            // Si le devis a une maquette associée, la supprimer aussi
            if (doc.maquette_id) {
                try {
                    await MaquetteService.deleteMaquette(doc.maquette_id);
                } catch (maquetteError) {
                    console.warn('Erreur lors de la suppression de la maquette associée:', maquetteError);
                    // On continue même si la suppression de la maquette échoue
                }
            }
            
            // Recharger la liste des devis
            const devisData = await DevisService.getUserDevisWithMaquettes();
            setDevisWithMaquettes(devisData);
             
        } catch (error) {
            console.error('Erreur lors de la suppression du devis:', error);
            alert('Erreur lors de la suppression du devis.');
        } finally {
            setDeletingDevisId(null);
        }
    };

    return (
        <div className="conteneur-page">
            <Header scrollPosition={scrollPosition} />
            
            <main className="contenu-principal">
                <div className="entete-page">
                    <h1>MES DEVIS & FACTURES</h1>
                    <button className="bouton-creer" onClick={handleCreerDevis}>
                        <span className="icone">+</span>
                        CRÉER {ongletActif === 'devis' ? 'UN DEVIS' : 'UNE FACTURE'}
                    </button>
                </div>

                <div className="barre-controles">
                    <div className="onglets">
                        <button 
                            className={`onglet ${ongletActif === 'devis' ? 'actif' : ''}`}
                            onClick={() => setOngletActif('devis')}
                        >
                            DEVIS
                        </button>
                        <button 
                            className={`onglet ${ongletActif === 'factures' ? 'actif' : ''}`}
                            onClick={() => setOngletActif('factures')}
                        >
                            FACTURES
                        </button>
                    </div>

                    <div className="filtres">
                        <div className="zone-recherche">
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={recherche}
                                onChange={(e) => setRecherche(e.target.value)}
                            />
                        </div>

                        <select 
                            value={filtreStatut} 
                            onChange={(e) => setFiltreStatut(e.target.value)}
                            className="filtre-statut"
                        >
                            <option value="tous">Tous les statuts</option>
                            <option value="brouillon">Brouillon</option>
                            <option value="envoyé">Envoyé</option>
                            <option value="accepté">Accepté</option>
                            <option value="annulé">Annulé</option>
                            <option value="signé">Signé</option>
                        </select>
                    </div>
                </div>

                <div className="grille-documents">
                    {loading ? (
                        <div className="loading-message">
                            <p>Chargement des devis...</p>
                        </div>
                    ) : error ? (
                        <div className="error-message">
                            <p>{error}</p>
                        </div>
                    ) : documentsFiltres.length === 0 ? (
                        <div className="empty-message">
                            <p>Aucun devis trouvé</p>
                        </div>
                    ) : (
                        documentsFiltres.map(doc => (
                            <div className="carte-document" key={doc.id}>
                                <div className="entete-carte">
                                    <span className="numero-document">{doc.numero}</span>
                                    <span className={`badge-statut ${getCouleurStatut(doc.statut)}`}>
                                        {getTexteStatut(doc.statut)}
                                    </span>
                                </div>
                                
                                <div className="corps-carte">
                                    <div className="info-client">
                                        <h3>{doc.client}</h3>
                                        <p className="date">{new Date(doc.date).toLocaleDateString('fr-FR')}</p>
                                        {doc.maquette_id && (
                                            <p className="maquette-info">
                                                <span className="maquette-label">Maquette:</span> {doc.maquette_name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="montant">
                                        {doc.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                    </div>
                                </div>

                                <div className="actions-carte">
                                    <button 
                                        className="bouton-action modifier" 
                                        onClick={() => handleModifierDevis(doc)}
                                        disabled={deletingDevisId === doc.id}
                                    >
                                        Modifier
                                    </button>
                                    <button 
                                        className={`bouton-action supprimer ${deletingDevisId === doc.id ? 'deleting' : ''}`}
                                        onClick={() => handleSupprimerDevis(doc)}
                                        disabled={deletingDevisId === doc.id}
                                    >
                                        {deletingDevisId === doc.id ? 'Suppression...' : 'Supprimer'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
            <br></br>
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-main">
                        <div className="footer-brand">
                            <img src={"logo-batidevis-removebg.png"} alt="BatiDevis Logo" className="footer-logo" />
                            <p>La solution innovante pour vos devis et factures dans le BTP</p>
                        </div>
                        <div className="footer-links">
                            <div className="footer-column">
                                <h4>Navigation</h4>
                                <a href="/">Accueil</a>
                                <a href="/fonctionnalites">Fonctionnalités</a>
                                <a href="/tarifs">Tarifs</a>
                                <a href="/contact">Contact</a>
                            </div>
                            <div className="footer-column">
                                <h4>Légal</h4>
                                <a href="/mentions-legales">Mentions légales</a>
                                <a href="/cgv">CGV</a>
                                <a href="/confidentialite">Confidentialité</a>
                            </div>
                            <div className="footer-column">
                                <h4>Contact</h4>
                                <p><i className="fas fa-phone"></i> 01 23 45 67 89</p>
                                <p><i className="fas fa-envelope"></i> contact@batidevis.fr</p>
                                <div className="social-links">
                                    <a href="#" className="social-link"><i className="fab fa-linkedin"></i></a>
                                    <a href="#" className="social-link"><i className="fab fa-twitter"></i></a>
                                    <a href="#" className="social-link"><i className="fab fa-facebook"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; {new Date().getFullYear()} BatiDevis. Tous droits réservés.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default MesDevisFactures;