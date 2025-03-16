import React, { useEffect, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import '../styles/Tarifs.css';
import Header from '../components/Header';

const Tarifs: React.FC = () => {
    const [scrollPosition, setScrollPosition] = useState(0);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isReverse, setIsReverse] = useState(false);
    const totalSlides = 5;
    const slidesPerView = 3;
    const maxSlideIndex = totalSlides - slidesPerView;

    useEffect(() => {
        AOS.init({
            duration: 1000,
            once: false,
            mirror: true
        });

        setScrollPosition(window.scrollY);

        const handleScroll = () => {
            setScrollPosition(window.scrollY);
        };

        window.addEventListener('scroll', handleScroll);

        const interval = setInterval(() => {
            if (!isReverse) {
                if (currentSlide < maxSlideIndex) {
                    setCurrentSlide(prev => prev + 1);
                } else {
                    setIsReverse(true);
                    setCurrentSlide(prev => prev - 1);
                }
            } else {
                if (currentSlide > 0) {
                    setCurrentSlide(prev => prev - 1);
                } else {
                    setIsReverse(false);
                    setCurrentSlide(prev => prev + 1);
                }
            }
        }, 3000);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearInterval(interval);
        };
    }, [currentSlide, isReverse, maxSlideIndex]);

    return (
        <div className="home-container">
            <div className="background-tarifs">
            </div>

            <Header scrollPosition={scrollPosition} />

            <main>
                <section className="pricing-showcase">
                    <span className="title_showcase_2">NOS FORFAITS</span>
                    <div className="pricing-container">
                        <div className="pricing-grid">
                            <div className="pricing-card">
                                <br></br>
                                <div className="pricing-content">
                                    <h3>BASIQUE</h3>
                                    <div className="price">
                                        <span className="amount">1,99€</span>
                                        <span className="period"> /mois</span><br></br><br></br>
                                        <span className="period_2">Essai gratuit 1 mois du forfait standard</span>
                                    </div>
                                    <ul className="features-list">
                                        <li> Génération de devis et de facture</li>
                                        <li> Signature électronique</li>
                                        <li> Acomptes et avoirs</li>
                                        <li> Relance par e-mail uniquement</li>
                                    </ul>
                                    <button className="pricing-btn">Choisir l'offre</button>
                                </div>
                            </div>

                            <div className="pricing-card featured">
                                <div className="pricing-content">
                                    <div className="popular-tag">Plus populaire</div>
                                    <br></br>
                                    <h3>STANDARD</h3>
                                    <div className="price">
                                        <span className="amount">49,99€</span>
                                        <span className="period">/mois</span><br></br><br></br> 
                                        <span className="period_2">Essai gratuit 1 mois</span>
                                    </div>
                                    <ul className="features-list">
                                        <li>Toutes les fonctionnalités du forfait inférieur</li>
                                        <li>Sélection de tous les objets 3D</li>
                                        <li>Bibliothèque personnalisée d'objets 3D</li>
                                        <li>Suivi comptable</li>
                                        <li>Catalogue fournisseur</li>
                                        <li>Utilisation de l'IA pour générer les objets 3D</li>
                                    </ul>
                                    <button className="pricing-btn">Choisir l'offre</button>
                                </div>
                        
                            </div>

                            <div className="pricing-card">
                                <div className="pricing-content">
                                    <h3>PREMIUM</h3>
                                    <div className="price">
                                        <span className="amount">549,99€</span>
                                        <span className="period">/mois</span>
                                    </div>
                                    <ul className="features-list">
                                        <li>Toutes les fonctionnalités du forfait inférieur</li>
                                        <li>Prise en charge de tous les créations de devis et facture par BatiDevis</li>
                                    </ul>
                                    <button className="pricing-btn">Choisir l'offre</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <br></br><br></br><br></br>

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

export default Tarifs;