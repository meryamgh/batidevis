import React from 'react';

interface NavigationHelpModalProps {
  showNavigationHelp: boolean;
  setShowNavigationHelp: React.Dispatch<React.SetStateAction<boolean>>;
}

const NavigationHelpModal: React.FC<NavigationHelpModalProps> = ({
  showNavigationHelp,
  setShowNavigationHelp
}) => {
  if (!showNavigationHelp) return null;
  
  return (
    <div className="help-modal" onClick={() => setShowNavigationHelp(false)}>
      <div className="help-modal-content" onClick={(e) => e.stopPropagation()}>
        <button 
          className="help-modal-close"
          onClick={() => setShowNavigationHelp(false)}
        >
          ×
        </button>
        <br></br>
        <h2>MODES DE NAVIGATION</h2>
        <hr></hr>
        <h3>MODE ORBITE (PAR DÉFAUT)</h3>
        <p>Permet de tourner autour de la maquette :</p>
        <ul>
          <li>Clic gauche + déplacer : Rotation autour de la maquette</li>
          <li>Clic droit + déplacer : Déplacement latéral</li>
          <li>Molette : Zoom avant/arrière</li>
        </ul>
        
        <h3>MODE DÉPLACEMENT HORIZONTAL</h3>
        <p>Permet de se déplacer librement dans la maquette comme sur une carte :</p>
        <ul>
          <li>Clic maintenu + déplacer : Glisser la carte dans la direction souhaitée</li>
          <li>Clic simple : Se déplacer instantanément vers le point cliqué</li>
          <li>Molette : Zoom avant/arrière</li>
        </ul>
        
        <h3>MODE PERSONNAGE (PREMIÈRE PERSONNE)</h3>
        <p>Permet de se déplacer comme un personnage dans la maquette :</p>
        <ul>
          <li>W/Z : Avancer</li>
          <li>S : Reculer</li>
          <li>A/Q : Tourner à gauche</li>
          <li>D : Tourner à droite</li>
          <li>Souris : Regarder autour</li>
        </ul>
        
        <h3>RACCOURCIS CLAVIER</h3>
        <ul>
          <li><strong>N</strong> : Basculer entre mode Orbite et Vol libre</li>
          <li><strong>V</strong> : Activer/désactiver le mode Personnage</li>
        </ul>
      </div>
    </div>
  );
};

export default NavigationHelpModal; 