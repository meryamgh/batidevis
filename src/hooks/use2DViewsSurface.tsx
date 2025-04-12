import { useCallback } from 'react';
import * as THREE from 'three';
import { ObjectData } from '../types/ObjectData';

interface Use2DViewsSurfaceProps {  
    viewMode: '3D' | '2D' | 'Blueprint' | 'ObjectOnly';
    is2DView: boolean;
    renderObjectPanel: (object: ObjectData) => void;
    objectsUtils: any; // Type à définir selon votre implémentation
    isCreatingSurface: boolean;
    setIsCreatingSurface: (isCreatingSurface: boolean) => void;
    surfaceStartPoint: THREE.Vector3 | null;
    setSurfaceStartPoint: (surfaceStartPoint: THREE.Vector3 | null) => void;
    surfaceEndPoint: THREE.Vector3 | null;
    setSurfaceEndPoint: (surfaceEndPoint: THREE.Vector3 | null) => void;
    surfacePreview: THREE.Mesh | null;
    setSurfacePreview: (surfacePreview: THREE.Mesh | null) => void;
    showQuotePanel: boolean; 
    setObjectsWithHistory: (objectsWithHistory: ObjectData[]) => void;
    setQuoteWithHistory: (quoteWithHistory: ObjectData[]) => void;

}

export const use2DViewsSurface = ({  
    viewMode,
    is2DView,
    renderObjectPanel,
    objectsUtils,
    isCreatingSurface,
    setIsCreatingSurface,
    surfaceStartPoint,
    setSurfaceStartPoint,
    surfaceEndPoint,
    setSurfaceEndPoint,
    surfacePreview,
    setSurfacePreview,
    showQuotePanel, 
    setObjectsWithHistory,
    setQuoteWithHistory
}: Use2DViewsSurfaceProps) => {
    
    const onObjectClick = useCallback((id: string, point?: THREE.Vector3) => { 
        if (isCreatingSurface && point) {
            if (!surfaceStartPoint) {
                // Premier clic : définir le point de départ
                setSurfaceStartPoint(point);
                
                // Créer un aperçu de la surface
                const previewGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
                const previewMaterial = new THREE.MeshStandardMaterial({ 
                    color: '#808080',
                    transparent: true,
                    opacity: 0.5
                });
                const preview = new THREE.Mesh(previewGeometry, previewMaterial);
                preview.position.copy(point);
                setSurfacePreview(preview);
            } else {
                // Deuxième clic : créer la surface
                createSurface(surfaceStartPoint, point);
            }
        } else {
            objectsUtils.handleObjectClick(id, viewMode, is2DView, renderObjectPanel);
        }
    }, [objectsUtils, viewMode, is2DView, renderObjectPanel, isCreatingSurface, surfaceStartPoint]);
    
    
    
    // Ajouter la fonction pour créer la surface
    const createSurface = (start: THREE.Vector3, end: THREE.Vector3) => {
    
        const width = Math.abs(end.x - start.x);
        const depth = Math.abs(end.z - start.z);
        
        const geometry = new THREE.BoxGeometry(width, 0.1, depth);
        const material = new THREE.MeshStandardMaterial({ 
            color: '#808080',
            roughness: 0.8,
            metalness: 0.2
        });
        const mesh = new THREE.Mesh(geometry, material);
     
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
    
      
       
     
        setSurfaceStartPoint(null);
        setSurfaceEndPoint(null);
        setSurfacePreview(null);
        setIsCreatingSurface(false);
    };
    
    // Fonction pour gérer la sélection d'un point pour la surface
    const handleSurfacePointSelected = useCallback((point: THREE.Vector3) => {
        if (!surfaceStartPoint) {
            setSurfaceStartPoint(point);
        } else {
            // Créer la surface finale
            const width = Math.abs(point.x - surfaceStartPoint.x);
            const depth = Math.abs(point.z - surfaceStartPoint.z);
            
            const geometry = new THREE.BoxGeometry(width, 0.1, depth);
            const material = new THREE.MeshStandardMaterial({ 
                color: '#808080',
                roughness: 0.8,
                metalness: 0.2
            });
            const mesh = new THREE.Mesh(geometry, material);
    
            const box = new THREE.Box3().setFromObject(mesh);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            box.getSize(size);
            box.getCenter(center);
    
      
    
           
     
            setSurfaceStartPoint(null);
            setSurfaceEndPoint(null);
            setSurfacePreview(null);
            setIsCreatingSurface(false);
        }
    }, [surfaceStartPoint, setObjectsWithHistory, setQuoteWithHistory]);
    
    // Fonction pour mettre à jour l'aperçu de la surface
    const handleSurfacePreviewUpdate = useCallback((start: THREE.Vector3, end: THREE.Vector3) => {
        // Calculer les dimensions en fonction des points de départ et d'arrivée
        const width = Math.abs(end.x - start.x);
        const depth = Math.abs(end.z - start.z);
        
        // Calculer le centre de la surface
        const centerX = (start.x + end.x) / 2;
        const centerZ = (start.z + end.z) / 2;
        
        if (!surfacePreview) {
            // Créer un nouvel aperçu avec une géométrie unitaire
            const geometry = new THREE.BoxGeometry(1, 0.1, 1);
            const material = new THREE.MeshStandardMaterial({ 
                color: '#808080',
                transparent: true,
                opacity: 0.5,
                roughness: 0.8,
                metalness: 0.2
            });
            const mesh = new THREE.Mesh(geometry, material);
            
            // Appliquer l'échelle et la position
            mesh.scale.set(width, 0.1, depth);
            mesh.position.set(centerX, 0.05, centerZ);
            
            setSurfacePreview(mesh);
        } else {
            // Mettre à jour l'aperçu existant
            surfacePreview.scale.set(width, 0.1, depth);
            surfacePreview.position.set(centerX, 0.05, centerZ);
        }
        
        setSurfaceEndPoint(end);
    }, [surfacePreview]);

    return {
        isCreatingSurface,
        setIsCreatingSurface,
        surfaceStartPoint,
        surfaceEndPoint,
        surfacePreview,
        showQuotePanel, 
        onObjectClick,
        handleSurfacePointSelected,
        handleSurfacePreviewUpdate
    };
};