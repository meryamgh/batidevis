import React, { useEffect, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import '../styles/Home.css';
import Header from '../components/Header';

const Home: React.FC = () => {
    const [scrollPosition, setScrollPosition] = useState(0);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isReverse, setIsReverse] = useState(false);
    const [videoOpacity, setVideoOpacity] = useState(1);
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
                <video 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    className="background-video"
                    style={{ opacity: videoOpacity }}
                    onTimeUpdate={(e) => {
                        const video = e.currentTarget;
                        if (video.duration) {
                            const progress = video.currentTime / video.duration;
                            // Fondu très subtil : 0.95 à 1.0 au début, 0.95 à 1.0 à la fin
                            if (progress < 0.05) {
                                setVideoOpacity(0.95 + (progress * 0.05));
                            } else if (progress > 0.95) {
                                setVideoOpacity(0.95 + ((1 - progress) * 0.05));
                            } else {
                                setVideoOpacity(1);
                            }
                        }
                    }}
                >
                    <source src="/Vid.mp4" type="video/mp4" />
                </video>
                <div className="video-overlay" style={{
                    opacity: Math.min(scrollPosition / 1000, 0.8)
                }}></div>
            </div>

            <Header scrollPosition={scrollPosition} />

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
                    <span className="title_showcase_2">La maquette 3D : un outil clé pour vos chantiers</span>
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
                    <span className="title_showcase_2">NOS FORFAITS</span>
                    
                    {/* Forfaits principaux - 3 colonnes */}
                    <div className="pricing-container">
                        <div className="pricing-grid main-pricing">
                            <div className="pricing-card">
                                <div className="pricing-content">
                                    <h3>BASIQUE</h3>
                                    <div className="price">
                                        <span className="amount">0€</span>
                                        <span className="period"> TTC/mois</span><br></br><br></br>
                                        <span className="period_2">Essai gratuit 1 mois du forfait standard</span>
                                    </div>

                                    <ul className="features-list">
                                        <li>Accès illimité au forfait standard pendant 1 mois</li>
                                        <li>Toutes les fonctionnalités du forfait inférieur</li>
                                        <li>Accès limité à la création de 10 maquette 3D</li>
                                        <li>Accès à la librairie d'objets 3D</li>
                                        <li>Accès à l'IA générative : permet à l'utilisateur de créer jusqu'à 5 objets 3D personnalisés à partir d'une simple description, lorsque l'objet recherché n'existe pas encore dans la bibliothèque.</li>
                                    </ul>
                                    <button className="pricing-btn">Choisir l'offre</button>
                                </div>
                            </div>

                            <div className="pricing-card featured">
                                <div className="pricing-content">
                                    <div className="popular-tag">Plus populaire</div>
                                    <h3>STANDARD</h3>
                                    <div className="price">
                                        <span className="amount">34,99€</span>
                                        <span className="period"> TTC/mois</span><br></br><br></br>
                                        <span className="period_2">Essai gratuit 1 mois du forfait pro</span>
                                    </div>

                                    <ul className="features-list">
                                        <li>Accès illimité au forfait pro pendant 1 mois</li>
                                        <li>Toutes les fonctionnalités du forfait inférieur</li>
                                        <li>Accès à la création de maquette 3D en illimité</li>
                                        <li>Accès à l'IA pour générer les objets 3D personnalisé qui constitue la bibliothèque personnel (limité à 50 génération)</li>
                                        <li>Toutes les fonctionnalités du forfait inférieur</li>
                                    </ul>
                                    <button className="pricing-btn">Choisir l'offre</button>
                                </div>
                            </div>

                            <div className="pricing-card">
                                <div className="pricing-content">
                                    <h3>PRO</h3>
                                    <div className="price">
                                        <span className="amount">79,99€</span>
                                        <span className="period"> TTC/mois</span>
                                    </div>

                                    <ul className="features-list">
                                        <li>Toutes les fonctionnalités du forfait inférieur</li>
                                        <li>Accès à la création de maquette 3D en illimité</li>
                                        <li>Accès à l'IA pour générer les objets 3D personnalisé qui constitue la bibliothèque personnel (limité à 50 génération)</li>
                                        <li>Toutes les fonctionnalités du forfait inférieur</li>
                                    </ul>
                                    <button className="pricing-btn">Choisir l'offre</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Forfaits Premium - plus compacts */}
                    <div className="premium-section">
                        <h3 className="premium-title">FORFAITS PREMIUM</h3>
                        <div className="premium-grid">
                            <div className="premium-card">
                                <div className="premium-content">
                                    <h4>PREMIUM 1</h4>
                                    <div className="premium-price">
                                        <span className="premium-amount">1000€</span>
                                        <span className="premium-period"> TTC /mois</span>
                                    </div>
                                    <p className="premium-desc">Entreprise ayant moins de 30 devis / mois</p>
                                    <ul className="premium-features">
                                        <li>Prise en charge de la génération de devis et factures</li>
                                    </ul>
                                    <button className="premium-btn">Choisir l'offre</button>
                                </div>
                            </div>

                            <div className="premium-card">
                                <div className="premium-content">
                                    <h4>PREMIUM 2</h4>
                                    <div className="premium-price">
                                        <span className="premium-amount">1500€</span>
                                        <span className="premium-period"> TTC /mois</span>
                                    </div>
                                    <p className="premium-desc">Entreprise ayant entre 31 et 60 devis / mois</p>
                                    <ul className="premium-features">
                                        <li>Prise en charge de la génération de devis et factures</li>
                                    </ul>
                                    <button className="premium-btn">Choisir l'offre</button>
                                </div>
                            </div>

                            <div className="premium-card">
                                <div className="premium-content">
                                    <h4>PREMIUM 3</h4>
                                    <div className="premium-price">
                                        <span className="premium-amount">2500€</span>
                                        <span className="premium-period"> TTC /mois</span>
                                    </div>
                                    <p className="premium-desc">Entreprise ayant entre 61 et 100 devis / mois</p>
                                    <ul className="premium-features">
                                        <li>Prise en charge de la génération de devis et factures</li>
                                        <li>Pour les entreprises générant plus de 100 devis par mois, le tarif est ajusté en fonction du volume</li>
                                    </ul>
                                    <button className="premium-btn">Choisir l'offre</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Coaching - plus petit, en dessous des Premium */}
                    <div className="coaching-compact-section">
                        <h3 className="coaching-compact-title">COACHING</h3>
                        <div className="coaching-compact-card">
                            <div className="coaching-compact-content">
                                <div className="coaching-compact-price">
                                    <span className="coaching-compact-amount">49,99€</span>
                                    <span className="coaching-compact-period"> TTC /par séance et par personnes</span>
                                </div>
                                <p className="coaching-compact-desc">Minimum de 5 personnes pour valider la séance</p>
                                <ul className="coaching-compact-features">
                                    <li>Séance de 1h de coaching</li>
                                    <li>Comprendre le numérique dans le BTP : les clés pour adopter le devis et la facture numérique.</li>
                                    <li>Génération de devis et de facture</li>
                                    <li>Signature électronique</li>
                                    <li>Émission de facture électronique</li>
                                </ul>
                                <button className="coaching-compact-btn">Choisir l'offre</button>
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
                            <img src={"logo-batidevis.jpg"} alt="BatiDevis Logo" className="footer-logo" />
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
