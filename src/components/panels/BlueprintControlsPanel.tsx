import React from 'react';
import * as THREE from 'three';

interface BlueprintControlsProps {
  isBlueprintView: boolean;
  creationMode: 'wall' | 'room';
  setCreationMode: React.Dispatch<React.SetStateAction<'wall' | 'room'>>;
  isDrawingLine: boolean;
  setIsDrawingLine: React.Dispatch<React.SetStateAction<boolean>>;
  isCreatingRectangle: boolean;
  setIsCreatingRectangle: React.Dispatch<React.SetStateAction<boolean>>;
  rectangleStartPoint: THREE.Vector3 | null;
  setRectangleStartPoint: React.Dispatch<React.SetStateAction<THREE.Vector3 | null>>;
  rectangleEndPoint: THREE.Vector3 | null;
  setRectangleEndPoint: React.Dispatch<React.SetStateAction<THREE.Vector3 | null>>;
  rectanglePreview: {
    lines: { start: THREE.Vector3; end: THREE.Vector3; id: string }[];
    width: number;
    length: number;
  } | null;
  setRectanglePreview: React.Dispatch<React.SetStateAction<{
    lines: { start: THREE.Vector3; end: THREE.Vector3; id: string }[];
    width: number;
    length: number;
  } | null>>;
  blueprintLines: { start: THREE.Vector3; end: THREE.Vector3; id: string; length: number }[];
  setBlueprintLines: React.Dispatch<React.SetStateAction<{ start: THREE.Vector3; end: THREE.Vector3; id: string; length: number }[]>>;
  blueprintPoints: THREE.Vector3[];
  setBlueprintPoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>;
  tempPoint: THREE.Vector3 | null;
  setTempPoint: React.Dispatch<React.SetStateAction<THREE.Vector3 | null>>;
  currentLinePoints: THREE.Vector3[];
  setCurrentLinePoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>;
  setWalls2D: React.Dispatch<React.SetStateAction<THREE.Line[]>>;
  convertBlueprintToWalls: () => void;
  handleAddNewFloorBlueprint: () => void;
  createRoomFromRectangle: (startPoint: THREE.Vector3, endPoint: THREE.Vector3) => void;
}

const BlueprintControls: React.FC<BlueprintControlsProps> = ({
  isBlueprintView,
  creationMode,
  setCreationMode,
  isDrawingLine,
  setIsDrawingLine,
  isCreatingRectangle,
  setIsCreatingRectangle,
  rectangleStartPoint,
  setRectangleStartPoint,
  setRectangleEndPoint,
  rectanglePreview,
  setRectanglePreview,
  blueprintLines,
  setBlueprintLines,
  setBlueprintPoints,
  setTempPoint,
  setCurrentLinePoints,
  setWalls2D,
  convertBlueprintToWalls,
  handleAddNewFloorBlueprint,
  createRoomFromRectangle
}) => {
  if (!isBlueprintView) return null;
  
  return (
    <div className="blueprint-controls">
      <h3>Mode Blueprint</h3>
      
      <div className="blueprint-mode-selector" style={{ marginBottom: '15px' }}>
        <label style={{ marginRight: '10px' }}>Mode de création:</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`blueprint-mode-button ${creationMode === 'wall' ? 'active' : ''}`}
            onClick={() => {
              // Si on était déjà en mode mur, ne rien faire
              if (creationMode === 'wall') return;
              
              // Nettoyer les états du mode pièce
              setCreationMode('wall');
              setIsCreatingRectangle(false);
              setRectangleStartPoint(null);
              setRectangleEndPoint(null);
              setRectanglePreview(null);
              
              // Nettoyer les lignes de prévisualisation
              // (Cela sera fait automatiquement par l'effet dans CanvasScene)
            }}
            style={{
              padding: '8px 15px',
              backgroundColor: creationMode === 'wall' ? '#4CAF50' : '#f0f0f0',
              color: creationMode === 'wall' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Créer des murs
          </button>
          <button 
            className={`blueprint-mode-button ${creationMode === 'room' ? 'active' : ''}`}
            onClick={() => {
              // Si on était déjà en mode pièce, ne rien faire
              if (creationMode === 'room') return;
              
              // Nettoyer les états du mode mur
              setCreationMode('room');
              setIsDrawingLine(false);
              setCurrentLinePoints([]);
              setTempPoint(null);
              
              // Nettoyer les lignes de prévisualisation
              // (Cela sera fait automatiquement par l'effet dans CanvasScene)
            }}
            style={{
              padding: '8px 15px',
              backgroundColor: creationMode === 'room' ? '#4CAF50' : '#f0f0f0',
              color: creationMode === 'room' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Créer une pièce
          </button>
        </div>
      </div>
      
      <div className="blueprint-info">
        {creationMode === 'wall' ? (
          <>
            <p>Dessinez des lignes en cliquant sur plusieurs points successifs.</p>
            <p>La ligne devient <strong style={{ color: '#00cc00' }}>verte</strong> lorsqu'elle s'aligne sur un angle spécifique (0°, 45°, 90°...).</p>
            <p>La succession de lignes s'arrête automatiquement quand un point croise une ligne existante.</p>
            <p>Cliquez à nouveau pour commencer une nouvelle succession de lignes.</p>
            <p>Nombre de lignes : <strong>{blueprintLines.length}</strong></p>
          </>
        ) : (
          <>
            <p>Créez une pièce rectangulaire en sélectionnant deux points opposés.</p>
            <p>1. Cliquez pour définir le premier coin de la pièce</p>
            <p>2. Déplacez la souris pour ajuster les dimensions</p>
            <p>3. Cliquez à nouveau pour finaliser la pièce</p>
            {isCreatingRectangle && rectanglePreview && (
              <p>Dimensions actuelles: <strong>{rectanglePreview.width.toFixed(2)}m × {rectanglePreview.length.toFixed(2)}m</strong></p>
            )}
          </>
        )}
      </div>
      
      <div className="blueprint-info">
        {creationMode === 'wall' ? (
          isDrawingLine 
            ? "Continuez à cliquer pour ajouter des points à la ligne" 
            : "Cliquez pour commencer une nouvelle ligne"
        ) : (
          isCreatingRectangle
            ? "Cliquez pour définir le second coin de la pièce"
            : "Cliquez pour définir le premier coin de la pièce"
        )}
      </div>
      
      <div className="blueprint-buttons">
        <button 
          className="blueprint-button"
          onClick={() => {
            // Nettoyer tous les états du mode Blueprint
            setBlueprintPoints([]);
            setBlueprintLines([]);
            setTempPoint(null);
            setCurrentLinePoints([]);
            setIsDrawingLine(false);
            setIsCreatingRectangle(false);
            setRectangleStartPoint(null);
            setRectangleEndPoint(null);
            setRectanglePreview(null);
            
            // Supprimer toutes les lignes de la scène
            setWalls2D([]);
          }}
        >
          Effacer tout
        </button>
        
        {creationMode === 'wall' && (
          <button 
            className="blueprint-button"
            onClick={() => {
              setIsDrawingLine(false);
              setCurrentLinePoints([]);
              setTempPoint(null);
            }}
          >
            Terminer la ligne
          </button>
        )}
        
        {creationMode === 'room' && isCreatingRectangle && rectangleStartPoint && rectanglePreview && (
          <button 
            className="blueprint-button"
            onClick={() => {
              // Utiliser la position actuelle de la souris comme point final
              if (rectangleStartPoint && rectanglePreview) {
                // Créer la pièce 3D à partir du rectangle
                const mousePosition = new THREE.Vector3(
                  rectanglePreview.lines[2].start.x,
                  0.1,
                  rectanglePreview.lines[2].start.z
                );
                createRoomFromRectangle(rectangleStartPoint, mousePosition);
              }
            }}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            Générer la pièce
          </button>
        )}
        
        <button 
          className="blueprint-button"
          onClick={convertBlueprintToWalls}
          style={{
            backgroundColor: '#4CAF50',
            marginLeft: '10px',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          Generate 3D Maquette
        </button>
        
        <button 
          className="blueprint-button"
          onClick={handleAddNewFloorBlueprint}
          style={{
            backgroundColor: '#FFA500',
            marginLeft: '10px',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          Ajouter un étage
        </button>
      </div>
    </div>
  );
};

export default BlueprintControls;
