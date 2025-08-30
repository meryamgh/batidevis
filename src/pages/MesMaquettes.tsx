import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { MaquetteService, Maquette } from '../services/MaquetteService'; 
import '../styles/MesMaquettes.css';

const MesMaquettes: React.FC = () => {
    const [maquettes, setMaquettes] = useState<Maquette[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null); 
    const navigate = useNavigate();

    useEffect(() => {
        loadMaquettes();
    }, []);

    const loadMaquettes = async () => {
        try {
            setLoading(true);
            const userMaquettes = await MaquetteService.getUserMaquettes();
            setMaquettes(userMaquettes);
        } catch (err) {
            setError('Erreur lors du chargement des maquettes');
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMaquette = async (id: string, name: string) => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer la maquette "${name}" ?`)) {
            try {
                await MaquetteService.deleteMaquette(id);
                setMaquettes(maquettes.filter(m => m.id !== id));
                alert('Maquette supprimée avec succès');
            } catch (err) {
                alert('Erreur lors de la suppression de la maquette');
                console.error('Erreur:', err);
            }
        }
    };

    const handleLoadMaquette = async (maquette: Maquette) => {
        try {
            // Naviguer vers la page maquette avec les données
            navigate('/maquette', { 
                state: { 
                    maquetteData: maquette.data,
                    maquetteName: maquette.name 
                } 
            });
        } catch (error) {
            console.error('Erreur lors du chargement de la maquette:', error);
            alert('Erreur lors du chargement de la maquette. Veuillez réessayer.');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="conteneur-page">
                <Header scrollPosition={0} />
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Chargement de vos maquettes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="conteneur-page">
            <Header scrollPosition={0} />
            
            <main className="contenu-principal">
                <div className="entete-page">
                    <h1>MES MAQUETTES</h1>
                    <button 
                        className="bouton-creer"
                        onClick={() => navigate('/maquette')}
                    >
                        <span className="icone">+</span>
                        CRÉER UNE NOUVELLE MAQUETTE
                    </button>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {maquettes.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🏗️</div>
                        <h2>Aucune maquette trouvée</h2>
                        <p>Vous n'avez pas encore créé de maquette. Commencez par en créer une !</p>
                        <button 
                            className="bouton-creer"
                            onClick={() => navigate('/maquette')}
                        >
                            Créer ma première maquette
                        </button>
                    </div>
                ) : (
                    <div className="grille-maquettes">
                        {maquettes.map(maquette => (
                            <div className="carte-maquette" key={maquette.id}>
                                <div className="entete-carte">
                                    <h3>{maquette.name}</h3>
                                    <span className="date-creation">
                                        {maquette.created_at && formatDate(maquette.created_at)}
                                    </span>
                                </div>
                                
                                <div className="corps-carte">
                                    {maquette.description && (
                                        <p className="description">{maquette.description}</p>
                                    )}
                                    <div className="stats">
                                        <span className="stat">
                                            <strong>{maquette.data.objects.length}</strong> objets
                                        </span>
                                        {maquette.updated_at && (
                                            <span className="stat">
                                                Modifiée le {formatDate(maquette.updated_at)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="actions-carte">
                                    <button 
                                        className="bouton-action charger"
                                        onClick={() => handleLoadMaquette(maquette)}
                                    >
                                        Charger
                                    </button>
                                    <button 
                                        className="bouton-action supprimer"
                                        onClick={() => maquette.id && handleDeleteMaquette(maquette.id, maquette.name)}
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

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

export default MesMaquettes;
