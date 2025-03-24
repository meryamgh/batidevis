import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import { ObjectData } from '../types/ObjectData';


// Interface pour les paramètres d'entrée du hook
interface BlueprintProps {
    currentFloor: number;
    setObjects: React.Dispatch<React.SetStateAction<ObjectData[]>>;
    setQuote: React.Dispatch<React.SetStateAction<ObjectData[]>>;
    setWalls2D: React.Dispatch<React.SetStateAction<THREE.Line[]>>;
    lineHelper: React.MutableRefObject<THREE.Line | null>;
    blueprintLines: {start: THREE.Vector3, end: THREE.Vector3, id: string, length: number}[];
    creationMode: 'wall' | 'room';
    setCreationMode: React.Dispatch<React.SetStateAction<'wall' | 'room'>>;
    isCreatingRectangle: boolean;
    setIsCreatingRectangle: React.Dispatch<React.SetStateAction<boolean>>;
    rectangleStartPoint: THREE.Vector3 | null;
    setRectangleStartPoint: React.Dispatch<React.SetStateAction<THREE.Vector3 | null>>;
    rectangleEndPoint: THREE.Vector3 | null;
    setRectangleEndPoint: React.Dispatch<React.SetStateAction<THREE.Vector3 | null>>;
    rectanglePreview: {lines: {start: THREE.Vector3, end: THREE.Vector3, id: string}[], width: number, length: number} | null;
    setRectanglePreview: React.Dispatch<React.SetStateAction<{lines: {start: THREE.Vector3, end: THREE.Vector3, id: string}[], width: number, length: number} | null>>;
    blueprintPoints: THREE.Vector3[];
    setBlueprintPoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>;
    tempPoint: THREE.Vector3 | null;
    setTempPoint: React.Dispatch<React.SetStateAction<THREE.Vector3 | null>>;
    currentLinePoints: THREE.Vector3[];
    setCurrentLinePoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>;
    setBlueprintLines: React.Dispatch<React.SetStateAction<{start: THREE.Vector3, end: THREE.Vector3, id: string, length: number}[]>>;
    isDrawingLine: boolean;
    setIsDrawingLine: React.Dispatch<React.SetStateAction<boolean>>;
    roomConfig: {width: number, length: number, height: number};
    setViewMode: React.Dispatch<React.SetStateAction<'3D' | '2D' | 'Blueprint' | 'ObjectOnly'>>;
    setCurrentFloor: React.Dispatch<React.SetStateAction<number>>;
}

interface BlueprintReturn {
   handleAddWall2D: (start: THREE.Vector3, end: THREE.Vector3) => void;
   isPointNearLine: (point: THREE.Vector3) => THREE.Vector3 | null;
   isAngleAligned: (angle: number) => boolean;
   adjustPointToAlignedAngle: (start: THREE.Vector3, end: THREE.Vector3) => THREE.Vector3;
   handleBlueprintClick: (point: THREE.Vector3) => void;
   createRoomFromRectangle: (startPoint: THREE.Vector3, endPoint: THREE.Vector3) => void;
   convertBlueprintToWalls: () => void;
   handleAddNewFloorBlueprint: () => void;
   updateRectanglePreview: (startPoint: THREE.Vector3, currentPoint: THREE.Vector3) => void;
}


export const useBlueprint = ({ 
    currentFloor,
    setObjects,
    setQuote,
    setWalls2D,
    lineHelper,
    blueprintLines,
    creationMode,
    setCreationMode,
    isCreatingRectangle,
    setIsCreatingRectangle,
    rectangleStartPoint,
    setRectangleStartPoint,
    rectangleEndPoint,
    setRectangleEndPoint,
    rectanglePreview,
    setRectanglePreview,
    setBlueprintLines,
    blueprintPoints,
    setBlueprintPoints,
    tempPoint,
    setTempPoint,
    currentLinePoints,
    setCurrentLinePoints,
    isDrawingLine,
    setIsDrawingLine,
    roomConfig,
    setViewMode,
    setCurrentFloor

}: BlueprintProps): BlueprintReturn => {
    const tolerance = 0.5;

    const handleAddWall2D = (start: THREE.Vector3, end: THREE.Vector3) => {
        // Hauteur de base pour le rez-de-chaussée
        const baseWallHeight = 2;
        // Hauteur ajustée en fonction de l'étage courant
        const wallHeight = baseWallHeight;
        // Position Y ajustée en fonction de l'étage
        const wallPositionY = currentFloor * baseWallHeight;
        
        const wallWidth = 0.2;
        const wallLength = start.distanceTo(end);
        const pricePerUnitLength = 10;
        const wallPrice = Math.round(wallLength * pricePerUnitLength);
        const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallWidth);
        const wallMaterial = new THREE.MeshStandardMaterial();
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        midPoint.y = wallPositionY; // Ajuster la hauteur en fonction de l'étage
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const angle = Math.atan2(direction.z, direction.x);
        const boundingBox = new THREE.Box3();
        boundingBox.setFromObject(wallMesh);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        // Arrondir les dimensions au millimètre près
        const roundedScale: [number, number, number] = [
            Math.round(wallLength * 1000) / 1000,
            Math.round(wallHeight * 1000) / 1000,
            Math.round(wallWidth * 1000) / 1000
        ];

        const newWallObject: ObjectData = {
            id: uuidv4(),
            url: '',
            price: wallPrice,
            details: `Mur (Étage ${currentFloor})`,
            position: [midPoint.x/2, (wallPositionY + wallHeight/2)/2, midPoint.z/2],
            gltf: wallMesh,
            rotation: [0, -angle, 0],
            scale: roundedScale,
            color: '',
            type: 'wall',
            faces: {
                front: { color: '', texture: '' },
                back: { color: '', texture: '' },
                left: { color: '', texture: '' },
                right: { color: '', texture: '' },
                top: { color: '', texture: '' },
                bottom: { color: '', texture: '' }
            },
            boundingBox: {
                min: [
                    Math.round(boundingBox.min.x * 1000) / 1000,
                    Math.round(boundingBox.min.y * 1000) / 1000,
                    Math.round(boundingBox.min.z * 1000) / 1000
                ],
                max: [
                    Math.round(boundingBox.max.x * 1000) / 1000,
                    Math.round(boundingBox.max.y * 1000) / 1000,
                    Math.round(boundingBox.max.z * 1000) / 1000
                ],
                size: [
                    Math.round((boundingBox.max.x - boundingBox.min.x) * 1000) / 1000,
                    Math.round((boundingBox.max.y - boundingBox.min.y) * 1000) / 1000,
                    Math.round((boundingBox.max.z - boundingBox.min.z) * 1000) / 1000
                ],
                center: [
                    Math.round(center.x * 1000) / 1000,
                    Math.round(center.y * 1000) / 1000,
                    Math.round(center.z * 1000) / 1000
                ]
            }
        };

        setObjects((prevObjects: ObjectData[]) => [...prevObjects, newWallObject]);
        setQuote((prevQuote: ObjectData[]) => [...prevQuote, newWallObject]);

        if (lineHelper.current) {
            setWalls2D((prev) => prev.filter((w) => w !== lineHelper.current!));
            lineHelper.current = null;
        }
    };


    const isPointNearLine = (point: THREE.Vector3): THREE.Vector3 | null => {
        for (const line of blueprintLines) {
            const start = new THREE.Vector3(line.start.x, line.start.y, line.start.z);
            const end = new THREE.Vector3(line.end.x, line.end.y, line.end.z);
            
            // Calculer la distance du point à la ligne
            const line3 = new THREE.Line3(start, end);
            const closestPoint = new THREE.Vector3();
            line3.closestPointToPoint(point, true, closestPoint);
            const distance = point.distanceTo(closestPoint);
            
            if (distance < tolerance) {
                return closestPoint;
            }
        }
        return null;
    };

    const isAngleAligned = (angle: number): boolean => {
        // Convertir l'angle en degrés et le normaliser entre 0 et 360
        const degrees = ((angle * 180 / Math.PI) % 360 + 360) % 360;
        
        // Angles spécifiques à vérifier (en degrés)
        const targetAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
        
        // Vérifier si l'angle est proche d'un des angles cibles
        return targetAngles.some(targetAngle => 
            Math.abs(degrees - targetAngle) < tolerance || 
            Math.abs(degrees - targetAngle - 360) < tolerance
        );
    };

    const adjustPointToAlignedAngle = (start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3 => {
        const direction = new THREE.Vector3().subVectors(end, start);
        const angle = Math.atan2(direction.z, direction.x);
        
        if (!isAngleAligned(angle)) {
            return end; // Retourner le point original si l'angle n'est pas aligné
        }
        
        // Trouver l'angle cible le plus proche
        const degrees = ((angle * 180 / Math.PI) % 360 + 360) % 360;
        const targetAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
        let closestAngle = targetAngles[0];
        let minDiff = Math.abs(degrees - targetAngles[0]);
        
        for (let i = 1; i < targetAngles.length; i++) {
            const diff = Math.abs(degrees - targetAngles[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closestAngle = targetAngles[i];
            }
        }
        
        // Convertir l'angle cible en radians
        const targetAngle = closestAngle * Math.PI / 180;
        
        // Calculer la distance entre les points
        const distance = direction.length();
        
        // Créer un nouveau point ajusté selon l'angle cible
        const adjustedDirection = new THREE.Vector3(
            Math.cos(targetAngle) * distance,
            0,
            Math.sin(targetAngle) * distance
        );
        
        return new THREE.Vector3(
            start.x + adjustedDirection.x,
            end.y,
            start.z + adjustedDirection.z
        );
    };

    const createRoomFromRectangle = (startPoint: THREE.Vector3, endPoint: THREE.Vector3) => {
        if (!startPoint || !endPoint) return;
        
        const x1 = startPoint.x;
        const z1 = startPoint.z;
        const x2 = endPoint.x;
        const z2 = endPoint.z;
        
        // Calculer les dimensions de la pièce
        const width = Math.abs(x2 - x1);
        const length = Math.abs(z2 - z1);
        const height = roomConfig.height;
        const wallThickness = 0.2;
        
        // Position du centre de la pièce
        const centerX = (x1 + x2) / 2;
        const centerZ = (z1 + z2) / 2;
        
        // Position Y en fonction de l'étage actuel
        const floorPositionY = currentFloor * height;
        
        // Créer le matériau du sol avec une couleur différente selon l'étage
        const floorColors = [
            0x808080, // Gris neutre pour le rez-de-chaussée
            0xCCE6FF, // Bleu clair pour le 1er étage
            0xE6FFCC, // Vert clair pour le 2ème étage
            0xFFE6CC  // Orange clair pour le 3ème étage et plus
        ];
        
        const floorColor = floorColors[Math.min(currentFloor, floorColors.length - 1)];
        
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: floorColor,
            transparent: true,
            opacity: 0.8
        });
        
        const wallMaterial = new THREE.MeshStandardMaterial();
        
        // Arrondir les dimensions au millimètre près
        const roundedWidth = Math.round(width * 1000) / 1000;
        const roundedLength = Math.round(length * 1000) / 1000;
        const roundedHeight = Math.round(height * 1000) / 1000;
        const roundedThickness = Math.round(wallThickness * 1000) / 1000;

        // Créer le sol
        const floorGeometry = new THREE.BoxGeometry(1, 1, 1);
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        const floorBoundingBox = new THREE.Box3();
        floorBoundingBox.setFromObject(floorMesh);
        const floorCenter = new THREE.Vector3();
        floorBoundingBox.getCenter(floorCenter);

        const floorObject: ObjectData = {
            id: uuidv4(),
            url: '',
            price: Math.round(roundedWidth * roundedLength * 25),
            details: `Sol (Étage ${currentFloor})`,
            position: [centerX / 2, floorPositionY / 2, centerZ / 2],
            gltf: floorMesh,
            rotation: [0, 0, 0],
            scale: [roundedWidth, roundedThickness, roundedLength],
            color: '',
            type: 'floor',
            faces: {
                front: { color: '', texture: '' },
                back: { color: '', texture: '' },
                left: { color: '', texture: '' },
                right: { color: '', texture: '' },
                top: { color: '', texture: '' },
                bottom: { color: '', texture: '' }
            },
            boundingBox: {
                min: [
                    Math.round(floorBoundingBox.min.x * roundedWidth * 1000) / 1000,
                    Math.round(floorBoundingBox.min.y * roundedThickness * 1000) / 1000,
                    Math.round(floorBoundingBox.min.z * roundedLength * 1000) / 1000
                ],
                max: [
                    Math.round(floorBoundingBox.max.x * roundedWidth * 1000) / 1000,
                    Math.round(floorBoundingBox.max.y * roundedThickness * 1000) / 1000,
                    Math.round(floorBoundingBox.max.z * roundedLength * 1000) / 1000
                ],
                size: [roundedWidth, roundedThickness, roundedLength],
                center: [
                    Math.round(floorCenter.x * 1000) / 1000,
                    Math.round(floorCenter.y * 1000) / 1000,
                    Math.round(floorCenter.z * 1000) / 1000
                ]
            }
        };
        
        // Ajouter le sol aux objets et au devis
        setObjects(prevObjects => [...prevObjects, floorObject]);
        setQuote(prevQuote => [...prevQuote, floorObject]);
        
        // Créer les murs
        const walls = [
            // Mur avant (z1)
            {
                position: [centerX, floorPositionY + height/2, z1],
                scale: [width, height, wallThickness],
                rotation: [0, 0, 0]
            },
            // Mur arrière (z2)
            {
                position: [centerX, floorPositionY + height/2, z2],
                scale: [width, height, wallThickness],
                rotation: [0, 0, 0]
            },
            // Mur gauche (x1)
            {
                position: [x1, floorPositionY + height/2, centerZ],
                scale: [length, height, wallThickness],
                rotation: [0, Math.PI/2, 0]
            },
            // Mur droit (x2)
            {
                position: [x2, floorPositionY + height/2, centerZ],
                scale: [length, height, wallThickness],
                rotation: [0, Math.PI/2, 0]
            }
        ];
        
        // Ajouter les murs
        walls.forEach(wall => {
            const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            
            const wallPrice = wall.scale[0] * wall.scale[1] * 15; // Prix basé sur la surface du mur
            
            const newWallObject: ObjectData = {
                id: uuidv4(),
                url: '',
                price: wallPrice,
                details: `Mur (${currentFloor === 0 ? 'Rez-de-chaussée' : `Étage ${currentFloor}`})`,
                position: [
                    wall.position[0] / 2,
                    wall.position[1] / 2,
                    wall.position[2] / 2
                ],
                gltf: wallMesh,
                rotation: wall.rotation as [number, number, number],
                scale: wall.scale as [number, number, number],
                color: '', // Enlever la couleur par défaut
                texture: '',
                type: 'wall',
                faces: {
                    front: {
                        color: '',
                        texture: ''
                    },
                    back: {
                        color: '',
                        texture: ''
                    },
                    left: {
                        color: '',
                        texture: ''
                    },
                    right: {
                        color: '',
                        texture: ''
                    },
                    top: {
                        color: '',
                        texture: ''
                    },
                    bottom: {
                        color: '',
                        texture: ''
                    }
                },
                boundingBox: {
                    min: [-wall.scale[0]/2, -wall.scale[1]/2, -wall.scale[2]/2],
                    max: [wall.scale[0]/2, wall.scale[1]/2, wall.scale[2]/2],
                    size: [wall.scale[0], wall.scale[1], wall.scale[2]],
                    center: [0, 0, 0]
                }
            };
            
            setObjects(prevObjects => [...prevObjects, newWallObject]);
            setQuote(prevQuote => [...prevQuote, newWallObject]);
        });
        
        // Passer en mode 3D après la création de la pièce
        setViewMode('3D');
        
        // Réinitialiser les états
        setBlueprintPoints([]);
        setBlueprintLines([]);
        setTempPoint(null);
        setCurrentLinePoints([]);
        setIsDrawingLine(false);
        setIsCreatingRectangle(false);
        setRectangleStartPoint(null);
        setRectangleEndPoint(null);
        setRectanglePreview(null);
        setWalls2D([]);
    };

    const handleBlueprintClick = (point: THREE.Vector3) => {
        console.log("Blueprint click handled:", point);
        
        // Si on est en mode création de pièce rectangulaire
        if (creationMode === 'room') {
            if (!isCreatingRectangle) {
                // Premier clic : définir le point de départ du rectangle
                setRectangleStartPoint(point);
                setIsCreatingRectangle(true);
            } else {
                // Deuxième clic : définir le point d'arrivée et créer le rectangle
                setRectangleEndPoint(point);
                
                // Créer les quatre lignes du rectangle
                if (rectangleStartPoint) {
                    const x1 = rectangleStartPoint.x;
                    const z1 = rectangleStartPoint.z;
                    const x2 = point.x;
                    const z2 = point.z;
                    
                    // Créer les quatre coins du rectangle
                    const corner1 = new THREE.Vector3(x1, 0.1, z1);
                    const corner2 = new THREE.Vector3(x2, 0.1, z1);
                    const corner3 = new THREE.Vector3(x2, 0.1, z2);
                    const corner4 = new THREE.Vector3(x1, 0.1, z2);
                    
                    // Créer les quatre lignes
                    const lines = [
                        { start: corner1, end: corner2, id: uuidv4() },
                        { start: corner2, end: corner3, id: uuidv4() },
                        { start: corner3, end: corner4, id: uuidv4() },
                        { start: corner4, end: corner1, id: uuidv4() }
                    ];
                   
                    const blueprintLinesWithLength = lines.map(line => ({
                        ...line,
                        length: line.start.distanceTo(line.end)
                    }));
                    
                    setBlueprintLines(prev => [...prev, ...blueprintLinesWithLength]);
                    
                    // Ajouter les points au blueprint
                    setBlueprintPoints(prev => [...prev, corner1, corner2, corner3, corner4]);
                    
                    // Ajouter les lignes à la scène
                    lines.forEach(line => {
                        const path = new THREE.LineCurve3(
                            new THREE.Vector3(line.start.x, 0.1, line.start.z),
                            new THREE.Vector3(line.end.x, 0.1, line.end.z)
                        );
                        const tubeGeometry = new THREE.TubeGeometry(path, 1, 0.25, 12, false);
                        const tubeMaterial = new THREE.MeshBasicMaterial({ 
                            color: 0x0066cc,
                        });
                        const tubeLine = new THREE.Mesh(tubeGeometry, tubeMaterial);
                        tubeLine.uuid = line.id;
                        
                        setWalls2D(prev => [...prev, tubeLine as unknown as THREE.Line]);
                    });
                    
                    // Créer la pièce 3D à partir du rectangle
                    createRoomFromRectangle(rectangleStartPoint, point);
                    
                    // Réinitialiser les états
                    setIsCreatingRectangle(false);
                    setRectangleStartPoint(null);
                    setRectangleEndPoint(null);
                    setRectanglePreview(null);
                }
            }
            return;
        }
        
        // Mode création de mur (comportement existant)
        // Vérifier si le point est proche d'une ligne existante
        const snapPoint = isPointNearLine(point);
        const finalPoint = snapPoint || point;
        
        // Si on est en train de dessiner une ligne et que le point est proche d'une ligne existante,
        // on termine la ligne actuelle et on ne commence pas immédiatement une nouvelle ligne
        if (isDrawingLine && snapPoint) {
            // Continuer la ligne existante jusqu'au point d'intersection
            const lastPoint = currentLinePoints[currentLinePoints.length - 1];
            
            // Créer un tube épais au lieu d'une simple ligne
            const path = new THREE.LineCurve3(
                new THREE.Vector3(lastPoint.x, 0.1, lastPoint.z),
                new THREE.Vector3(finalPoint.x, 0.1, finalPoint.z)
            );
            const tubeGeometry = new THREE.TubeGeometry(path, 1, 0.25, 12, false);
            const tubeMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x0066cc,
            });
            const tubeLine = new THREE.Mesh(tubeGeometry, tubeMaterial);
            
            // Générer un ID unique pour la ligne
            const lineId = uuidv4();
            tubeLine.uuid = lineId;
            
            // Calculer la longueur de la ligne
            const length = lastPoint.distanceTo(finalPoint);
            
            // Ajouter la ligne à la liste des lignes
            const newLine = {
                start: lastPoint,
                end: finalPoint,
                id: lineId,
                length
            };
            setBlueprintLines(prev => [...prev, newLine]);
            
            // Ajouter le point à la liste des points
            setBlueprintPoints(prev => [...prev, finalPoint]);
            
            // Ajouter la ligne à la scène
            setWalls2D(prev => [...prev, tubeLine as unknown as THREE.Line]);
            
            // Terminer la ligne actuelle
            setIsDrawingLine(false);
            setCurrentLinePoints([]);
            setTempPoint(null);
            
            return; // Sortir de la fonction pour ne pas commencer une nouvelle ligne immédiatement
        }
        
        // Si on n'est pas en train de dessiner une ligne ou si on vient de cliquer sur un nouveau point
        if (!isDrawingLine) {
            // Commencer une nouvelle ligne
            setCurrentLinePoints([finalPoint]);
            setIsDrawingLine(true);
            setTempPoint(finalPoint);
        } else {
            // Continuer la ligne existante
            const lastPoint = currentLinePoints[currentLinePoints.length - 1];
            
            // Calculer l'angle entre le dernier point et le point actuel
            const direction = new THREE.Vector3().subVectors(finalPoint, lastPoint);
            const angle = Math.atan2(direction.z, direction.x);
            
            // Ajuster le point si l'angle est aligné
            const adjustedPoint = isAngleAligned(angle) 
                ? adjustPointToAlignedAngle(lastPoint, finalPoint)
                : finalPoint;
            
            // Créer un tube épais au lieu d'une simple ligne
            const path = new THREE.LineCurve3(
                new THREE.Vector3(lastPoint.x, 0.1, lastPoint.z),
                new THREE.Vector3(adjustedPoint.x, 0.1, adjustedPoint.z)
            );
            const tubeGeometry = new THREE.TubeGeometry(path, 1, 0.25, 12, false);
            const tubeMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x0066cc,
            });
            const tubeLine = new THREE.Mesh(tubeGeometry, tubeMaterial);
            
            // Générer un ID unique pour la ligne
            const lineId = uuidv4();
            tubeLine.uuid = lineId;
            
            // Calculer la longueur de la ligne
            const length = lastPoint.distanceTo(adjustedPoint);
            
            // Ajouter la ligne à la liste des lignes
            const newLine = {
                start: lastPoint,
                end: adjustedPoint,
                id: lineId,
                length
            };
            setBlueprintLines(prev => [...prev, newLine]);
            
            // Ajouter le point à la liste des points de la ligne courante
            setCurrentLinePoints(prev => [...prev, adjustedPoint]);
            
            // Ajouter les deux points à la liste des points
            setBlueprintPoints(prev => [...prev, adjustedPoint]);
            
            // Ajouter la ligne à la scène
            setWalls2D(prev => [...prev, tubeLine as unknown as THREE.Line]);
            
            // Mettre à jour le point temporaire
            setTempPoint(adjustedPoint);
        }
    };


    const convertBlueprintToWalls = () => {
        // Ajouter un sol pour l'étage actuel avant de convertir les lignes
        // Déterminer les dimensions du sol en fonction des lignes blueprint
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        
        // Parcourir toutes les lignes pour trouver les dimensions maximales
        blueprintLines.forEach(line => {
            minX = Math.min(minX, line.start.x, line.end.x);
            maxX = Math.max(maxX, line.start.x, line.end.x);
            minZ = Math.min(minZ, line.start.z, line.end.z);
            maxZ = Math.max(maxZ, line.start.z, line.end.z);
        });
        
        // S'assurer qu'il y a des lignes pour créer un sol
        if (blueprintLines.length > 0) {
            // Ajouter une marge autour du sol
            const margin = 0;
            minX -= margin;
            maxX += margin;
            minZ -= margin;
            maxZ += margin;
            
            // Calculer les dimensions du sol
            const floorWidth = maxX - minX;
            const floorLength = maxZ - minZ;
            const floorThickness = 0.2;
            
            // Position du sol (au niveau de l'étage actuel)
            const floorPositionY = currentFloor * roomConfig.height;
            
            // Créer le matériau du sol avec une couleur différente selon l'étage
            const floorColors = [
                0xE0E0E0, // Gris clair pour le rez-de-chaussée
                0xCCE6FF, // Bleu clair pour le 1er étage
                0xE6FFCC, // Vert clair pour le 2ème étage
                0xFFE6CC  // Orange clair pour le 3ème étage et plus
            ];
            
            const floorColor = floorColors[Math.min(currentFloor, floorColors.length - 1)];
            
            const floorMaterial = new THREE.MeshStandardMaterial({ 
                color: floorColor,
                transparent: true,
                opacity: 0.8
            });
            
            // Créer la géométrie du sol
            const floorGeometry = new THREE.BoxGeometry(1, 1, 1);
            const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
            const boundingBox = new THREE.Box3();
            boundingBox.min.set(-floorWidth/2, -floorThickness/2, -floorLength/2);
            boundingBox.max.set(floorWidth/2, floorThickness/2, floorLength/2);
            // Créer l'objet sol
            const floorObject: ObjectData = {
                id: uuidv4(),
                url: '',
                price: Math.round(floorWidth * floorLength * 25), // Prix basé sur la surface
                details: `Sol (${currentFloor === 0 ? 'Rez-de-chaussée' : `Étage ${currentFloor}`})`,
                position: [(minX + maxX) / 4, floorPositionY / 2, (minZ + maxZ) / 4],
                gltf: floorMesh,
                rotation: [0, 0, 0],
                scale: [floorWidth, floorThickness, floorLength],
                color: '#' + floorColor.toString(16).padStart(6, '0'),
                type: 'floor',
                faces: {
                    top: {
                        color: '#' + floorColor.toString(16).padStart(6, '0'),
                        texture: ''
                    }
                },
                boundingBox: {
                    min: [boundingBox.min.x, boundingBox.min.y, boundingBox.min.z],
                    max: [boundingBox.max.x, boundingBox.max.y, boundingBox.max.z],
                    size: [boundingBox.max.x - boundingBox.min.x, boundingBox.max.y - boundingBox.min.y, boundingBox.max.z - boundingBox.min.z],
                    center: [boundingBox.min.x + (boundingBox.max.x - boundingBox.min.x) / 2, boundingBox.min.y + (boundingBox.max.y - boundingBox.min.y) / 2, boundingBox.min.z + (boundingBox.max.z - boundingBox.min.z) / 2]
                }
            };
            
            // Ajouter le sol aux objets et au devis
            setObjects(prevObjects => [...prevObjects, floorObject]);
            setQuote(prevQuote => [...prevQuote, floorObject]);
        }
        
        // Convertir chaque ligne blueprint en mur 3D
        blueprintLines.forEach(line => {
            handleAddWall2D(line.start, line.end);
        });
        
        // Passer en mode 3D après la conversion
        setViewMode('3D');
        
        // Optionnel: afficher un message de confirmation
        alert(`${blueprintLines.length} lignes ont été converties en murs 3D avec un sol ajouté`);
    };

    const handleAddNewFloorBlueprint = () => {
        // Convertir les lignes actuelles en murs 3D
        blueprintLines.forEach(line => {
            handleAddWall2D(line.start, line.end);
        });
        
        // Incrémenter l'étage courant
        setCurrentFloor(prev => prev + 1);
        
        // Nettoyer le plan pour le nouvel étage
        setBlueprintPoints([]);
        setBlueprintLines([]);
        setTempPoint(null);
        setCurrentLinePoints([]);
        setIsDrawingLine(false);
        setIsCreatingRectangle(false);
        setRectangleStartPoint(null);
        setRectangleEndPoint(null);
        setRectanglePreview(null);
        setWalls2D([]);
        
        // Afficher un message de confirmation
        alert(`Étage ${currentFloor + 1} ajouté. Vous pouvez maintenant dessiner le plan pour l'étage ${currentFloor + 1}.`);
    };


    const updateRectanglePreview = (startPoint: THREE.Vector3, currentPoint: THREE.Vector3) => {
        if (!startPoint) return;
        
        const x1 = startPoint.x;
        const z1 = startPoint.z;
        const x2 = currentPoint.x;
        const z2 = currentPoint.z;
        
        // Créer les quatre coins du rectangle
        const corner1 = new THREE.Vector3(x1, 0.1, z1);
        const corner2 = new THREE.Vector3(x2, 0.1, z1);
        const corner3 = new THREE.Vector3(x2, 0.1, z2);
        const corner4 = new THREE.Vector3(x1, 0.1, z2);
        
        // Créer les quatre lignes
        const lines = [
            { start: corner1, end: corner2, id: uuidv4() },
            { start: corner2, end: corner3, id: uuidv4() },
            { start: corner3, end: corner4, id: uuidv4() },
            { start: corner4, end: corner1, id: uuidv4() }
        ];
        
        // Calculer les dimensions du rectangle
        const width = Math.abs(x2 - x1);
        const length = Math.abs(z2 - z1);
        
        setRectanglePreview({
            lines,
            width,
            length
        });
    };


  return {
    handleAddWall2D,
    isPointNearLine,
    isAngleAligned,
    adjustPointToAlignedAngle,
    handleBlueprintClick,
    createRoomFromRectangle,
    convertBlueprintToWalls,
    handleAddNewFloorBlueprint,
    updateRectanglePreview
  };
}; 