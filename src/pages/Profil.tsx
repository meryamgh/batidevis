import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import '../styles/Profil.css';

const Profil: React.FC = () => {
    const { user, loading, updateProfile } = useAuth();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        company_name: ''
    });

    // Mettre à jour les données du formulaire quand l'utilisateur est chargé
    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                company_name: user.company_name || ''
            });
        }
    }, [user]);

    // Fonction pour obtenir l'initiale de l'utilisateur
    const getUserInitial = () => {
        if (user?.first_name) {
            return user.first_name.charAt(0).toUpperCase();
        }
        if (user?.email) {
            return user.email.charAt(0).toUpperCase();
        }
        return '?';
    };

    // Afficher un loader pendant le chargement
    if (loading) {
        return (
            <div className="profil-container">
                <div className="loading-container">
                    <div className="loading-spinner-large"></div>
                    <p>Chargement de votre profil...</p>
                </div>
            </div>
        );
    }

    // Rediriger si l'utilisateur n'est pas connecté
    if (!user) {
        navigate('/connexion');
        return null;
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Ne pas inclure l'email dans les données à mettre à jour
            const result = await updateProfile({
                first_name: formData.first_name,
                last_name: formData.last_name,
                company_name: formData.company_name
            });
            
            if (result.success) {
                setIsEditing(false);
                // Optionnel : afficher un message de succès
                console.log('Profil mis à jour avec succès');
            } else {
                console.error('Erreur lors de la mise à jour:', result.error);
                // Optionnel : afficher un message d'erreur
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            email: user?.email || '',
            company_name: user?.company_name || ''
        });
        setIsEditing(false);
    };

    const handleRefreshProfile = async () => {
        // Forcer la récupération des données depuis la base de données
        try {
            const result = await updateProfile({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                company_name: user.company_name || ''
            });
            
            if (result.success) {
                console.log('Profil rafraîchi avec succès');
                // Recharger la page pour voir les changements
                window.location.reload();
            } else {
                console.error('Erreur lors du rafraîchissement:', result.error);
            }
        } catch (error) {
            console.error('Erreur lors du rafraîchissement:', error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="profil-container">
            <div className="profil-header">
                                 <div className="profil-avatar">
                     <div className="avatar-circle">
                         {getUserInitial()}
                     </div>
                 </div>
                <div className="profil-title">
                    <h1>Mon Profil</h1>
                    <p>Gérez vos informations personnelles</p>
                </div>
            </div>

            <div className="profil-content">
                <div className="profil-section">
                                         <div className="section-header">
                         <h2>Informations Personnelles</h2>
                         <div className="section-actions">
                             {!isEditing && (
                                 <>
                                     <button 
                                         className="refresh-button"
                                         onClick={handleRefreshProfile}
                                         title="Rafraîchir les données"
                                     >
                                         🔄 Rafraîchir
                                     </button>
                                     <button 
                                         className="edit-button"
                                         onClick={() => setIsEditing(true)}
                                     >
                                         ✏️ Modifier
                                     </button>
                                 </>
                             )}
                         </div>
                     </div>

                    <div className="profil-form">
                        <div className="form-group">
                            <label htmlFor="first_name">Prénom</label>
                            <input
                                type="text"
                                id="first_name"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className={isEditing ? 'editing' : ''}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="last_name">Nom</label>
                            <input
                                type="text"
                                id="last_name"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className={isEditing ? 'editing' : ''}
                            />
                        </div>

                                                 <div className="form-group">
                             <label htmlFor="email">Email</label>
                             <input
                                 type="email"
                                 id="email"
                                 name="email"
                                 value={formData.email}
                                 disabled={true}
                                 className="disabled-field"
                             />
                             <small className="field-note">L'email ne peut pas être modifié</small>
                         </div>

                        <div className="form-group">
                            <label htmlFor="company_name">Nom de l'entreprise</label>
                            <input
                                type="text"
                                id="company_name"
                                name="company_name"
                                value={formData.company_name}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className={isEditing ? 'editing' : ''}
                            />
                        </div>

                        {isEditing && (
                            <div className="form-actions">
                                                                 <button 
                                     className="save-button"
                                     onClick={handleSave}
                                     disabled={isSaving}
                                 >
                                     {isSaving ? (
                                         <>
                                             <span className="loading-spinner"></span>
                                             Sauvegarde...
                                         </>
                                     ) : (
                                         <>
                                             💾 Sauvegarder
                                         </>
                                     )}
                                 </button>
                                <button 
                                    className="cancel-button"
                                    onClick={handleCancel}
                                >
                                    ❌ Annuler
                                </button>
                            </div>
                        )}
                                                              </div>
                 </div>

                 
             </div>
         </div>
    );
};

export default Profil;
