import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import * as THREE from 'three';

// Créer un gestionnaire d'événements global pour cameraControl
// Ce gestionnaire sera utilisé comme fallback si le composant MoveControls n'est pas encore monté
const handleGlobalCameraControl = (event: Event) => {
    console.log('Gestionnaire global cameraControl appelé');
    // Ce gestionnaire sera remplacé par celui de MoveControls quand il sera monté
    
    // Récupérer les détails de l'événement
    const customEvent = event as CustomEvent;
    const { direction, mode } = customEvent.detail;
    
    console.log(`Direction: ${direction}, Mode: ${mode}`);
    
    // Vérifier si la direction est valide
    const validDirections = [
        'forward', 'backward', 'left', 'right', 
        'zoomIn', 'zoomOut', 
        'rotateLeft', 'rotateRight', 'rotateUp', 'rotateDown'
    ];
    
    if (!validDirections.includes(direction)) {
        console.warn(`Direction non reconnue: ${direction}`);
    }
    
    // Le gestionnaire global ne fait que logger l'événement
    // Le traitement réel sera effectué par le gestionnaire dans MoveControls
};

// Ajouter l'écouteur d'événements global dès le chargement de la page
window.addEventListener('cameraControl', handleGlobalCameraControl);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
);
