import React, { useEffect, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import '../styles/Home.css';

const Home: React.FC = () => {
    const [scrollPosition, setScrollPosition] = useState(0);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isReverse, setIsReverse] = useState(false);
    const totalSlides = 5;
    const slidesPerView = 3;
    const maxSlideIndex = totalSlides - slidesPerView;
    const sliderRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        AOS.init({
            duration: 1000,
            once: false,
            mirror: true
        });

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

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
            setIsReverse(true);
        }
    };

    const nextSlide = () => {
        if (currentSlide < maxSlideIndex) {
            setCurrentSlide(currentSlide + 1);
            setIsReverse(false);
        }
    };

    return (
        <div className="home-container">
            <div className="video-background">
                <video autoPlay muted loop playsInline className="background-video">
                    <source src="/Vid.mp4" type="video/mp4" />
                </video>
                <div className="video-overlay" style={{
                    opacity: Math.min(scrollPosition / 1000, 0.8)
                }}></div>
            </div>

            <header className="dynamic-header" style={{
                backgroundColor: `rgba(0, 0, 0, ${Math.min(scrollPosition / 500, 0.9)})`,
                boxShadow: `0 10px 17px rgba(0, 0, 0, 0.46)`
            }}>
                <nav className="nav-container">
                    <div className="logo" data-aos="fade-right">
                        <img src="/assets/logo.svg" alt="Devo Logo" className="logo-img" />
                    </div>
                    <div className="nav-links" data-aos="fade-left">
                        <a href="/" className="nav-link active">ACCUEIL</a>
                        <a href="/Maquette" className="nav-link">MAQUETTE</a>
                        <a href="/Tarifs" className="nav-link">TARIFS</a>
                        <a href="/Devis" className="nav-link">MES DEVIS & FACTURES</a>
                        <button className="button_connexion">CONNEXION / INSCRIPTION</button>
                    </div>
                </nav>
            </header>

            <main>
                <section className="hero-section">
                    <div className="hero-content-wrapper">
                        <div className="hero-content">
                            <h1 className="animated-title" data-aos="zoom-in">
                                <span className="gradient-text">PASSEZ DU PLAN AU DEVIS EN QUELQUES SECONDES</span>
                                <br />
                                <p className="batidevis">AVEC BATIDEVIS</p>
                            </h1>
                            <br></br><br></br><br></br>
                            <p className="hero-subtitle" data-aos="fade-up" data-aos-delay="200">
                            <span className="cercle">○</span> Un outil intuitif pensé pour les artisants du btp
                            <br></br><br></br>
                            <span className="cercle">○</span> Vos devis et factures générés en un clic depuis votre maquette 3D
                            <br></br><br></br>
                            <span className="cercle">○</span> Gagnez du temps et concentrez-vous sur vos chantiers !
                            </p>
                            <div className="interactive-buttons" data-aos="fade-up" data-aos-delay="400">
                                <button className="primary-btn pulse-effect">
                                    <span className="btn-text">Découvrir</span>
                                    <span className="btn-icon">→</span>
                                </button>
                                <button className="secondary-btn hover-effect">
                                    <span className="btn-text">En savoir plus</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="dynamic-showcase">
                    <span className="title_showcase">La maquette 3D : un outil clé pour vos chantiers</span>
                    <div className="showcase-container">
                        <div className="showcase-slider" ref={sliderRef} style={{ transform: `translateX(-${currentSlide * 33.333}%)` }}>
                            <div className="showcase-slide">
                                <div className="slide-content">
                                    <img src="/assets/Image_interieur.jpg" alt="Aménagement intérieur" />
                                    <div className="slide-info">
                                        <h3>Second oeuvre et finitions</h3>
                                        <p>Prévisualisez vos finitions et aménagements intérieurs</p>
                                    </div>
                                </div>
                            </div>
                            <div className="showcase-slide">
                                <div className="slide-content">
                                    <img src="/assets/Image_exterieur.jpg" alt="Aménagements extérieurs" />
                                    <div className="slide-info">
                                        <h3>Aménagements extérieurs</h3>
                                        <p>Modélisez vos espaces extérieurs avec précision</p>
                                    </div>
                                </div>
                            </div>
                            <div className="showcase-slide">
                                <div className="slide-content">
                                    <img src="/assets/Image_interieur_3.jpg" alt="Structure et Gros Œuvre" />
                                    <div className="slide-info">
                                        <h3>Structure et gros oeuvre</h3>
                                        <p>Visualisez la structure et le gros œuvre avant construction</p>
                                    </div>
                                </div>
                            </div>
                            <div className="showcase-slide">
                                <div className="slide-content">
                                    <img src="/assets/Image_interieur_2.jpg" alt="Charpente et Couverture" />
                                    <div className="slide-info">
                                        <h3>Charpente et couverture</h3>
                                        <p>Concevez et ajustez votre charpente et couverture</p>
                                    </div>
                                </div>
                            </div>
                            <div className="showcase-slide">
                                <div className="slide-content">
                                    <img src="/assets/Image_interieur.jpg" alt="Terrassement et Infrastructures" />
                                    <div className="slide-info">
                                        <h3>Terrassement et infrastructures</h3>
                                        <p>Optimisez vos travaux de sol et fondations</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button 
                            className={`control-btn prev-btn ${currentSlide === 0 ? 'disabled' : ''}`}
                            onClick={prevSlide}
                            disabled={currentSlide === 0}
                        >&lt;</button>
                        <button 
                            className={`control-btn next-btn ${currentSlide === maxSlideIndex ? 'disabled' : ''}`}
                            onClick={nextSlide}
                            disabled={currentSlide === maxSlideIndex}
                        >&gt;</button>
                    </div>
                </section>

                <section className="pricing-showcase">
                    <span className="title_showcase">NOS FORFAITS</span>
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

export default Home; 
