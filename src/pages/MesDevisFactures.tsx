import React, { useState } from 'react';
import Header from '../components/Header';
import '../styles/MesDevisFactures.css';

interface Document {
    id: string;
    type: 'devis' | 'facture';
    numero: string;
    client: string;
    date: string;
    montant: number;
    statut: 'en_attente' | 'accepte' | 'refuse' | 'paye';
}

const MesDevisFactures: React.FC = () => {
    const [scrollPosition] = useState(0);
    const [ongletActif, setOngletActif] = useState<'devis' | 'factures'>('devis');
    const [recherche, setRecherche] = useState('');
    const [filtreStatut, setFiltreStatut] = useState('tous');

    const documents: Document[] = [
        {
            id: '1',
            type: 'devis',
            numero: 'DEVIS-2025-08',
            client: 'Entreprise',
            date: '2025-01-01',
            montant: 1500.00,
            statut: 'en_attente'
        },
        {
            id: '2',
            type: 'facture',
            numero: 'FACTURE-2025-10',
            client: 'Entreprise',
            date: '2025-01-01',
            montant: 2300.00,
            statut: 'paye'
        },
    ];

    const getCouleurStatut = (statut: string) => {
        switch (statut) {
            case 'en_attente': return 'statut-attente';
            case 'accepte': return 'statut-accepte';
            case 'refuse': return 'statut-refuse';
            case 'paye': return 'statut-paye';
            default: return '';
        }
    };

    const getTexteStatut = (statut: string) => {
        switch (statut) {
            case 'en_attente': return 'En attente';
            case 'accepte': return 'Accepté';
            case 'refuse': return 'Refusé';
            case 'paye': return 'Payé';
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

    return (
        <div className="conteneur-page">
            <Header scrollPosition={scrollPosition} />
            
            <main className="contenu-principal">
                <div className="entete-page">
                    <h1>MES DEVIS & FACTURES</h1>
                    <button className="bouton-creer">
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
                            <option value="en_attente">En attente</option>
                            <option value="accepte">Accepté</option>
                            <option value="refuse">Refusé</option>
                            <option value="paye">Payé</option>
                        </select>
                    </div>
                </div>

                <div className="grille-documents">
                    {documentsFiltres.map(doc => (
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
                                </div>
                                <div className="montant">
                                    {doc.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                </div>
                            </div>

                            <div className="actions-carte">
                                <button className="bouton-action voir">
                                    Voir
                                </button>
                                <button className="bouton-action modifier">
                                    Modifier
                                </button>
                                <button className="bouton-action supprimer">
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
            <br></br>
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-main">
                        <div className="footer-brand">
                            <img src="/assets/logo.svg" alt="BatiDevis Logo" className="footer-logo" />
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