import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useNavigate } from 'react-router-dom';
import { ObjectData } from '../types/ObjectData';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import '../styles/MainPage.css';
import { startDraggingPanel, closePanel, handleMouseMove } from '../utils/panelUtils.js';
import CanvasScene from '../components/CanvasScene';
import ObjectPanel from '../components/ObjectPanel';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import GltfList from "./GLTFList.js";


const MainPage: React.FC = () => {
    const [objects, setObjects] = useState<ObjectData[]>([]);
    const [quote, setQuote] = useState<ObjectData[]>([]);
    //détecte ou le user clique sur la scene
    const raycaster = useRef(new THREE.Raycaster());
    //position 2D du curseur
    const mouse = useRef(new THREE.Vector2());
    const cameraRef = useRef<THREE.Camera | null>(null); 
    const orbitControlsRef = useRef<any>(null);
    const groundPlaneRef = useRef<THREE.Mesh | null>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const draggerRef = useRef<HTMLDivElement>(null);
    const panelRootRef = useRef<Root | null>(null); 
    const navigate = useNavigate();

    const [isMoving, setIsMoving] = useState<string | null>(null);
    const [showDimensions, setShowDimensions] = useState<{ [key: string]: boolean }>({});
    const [is2DView, setIs2DView] = useState(false);

    // const [currentWall, setCurrentWall] = useState<THREE.Line | null>(null);
    const [creatingWallMode, setCreatingWallMode] = useState(false);
    const [walls2D, setWalls2D] = useState<THREE.Line[]>([]);
    //const [wallStart, setWallStart] = useState<THREE.Vector3 | null>(null);
    const lineHelper = useRef<THREE.Line | null>(null);

    const [showRoomConfig, setShowRoomConfig] = useState(false);
    const [roomConfig, setRoomConfig] = useState({
        width: 10,    // Valeur qui fonctionnait
        length: 8,    // Valeur qui fonctionnait
        height: 6     // Valeur qui fonctionnait
    });

    // Ajouter cet état pour gérer les étages
    const [currentFloor, setCurrentFloor] = useState(0);
    const [selectedFloor2D, setSelectedFloor2D] = useState(0);

    const [customTextures, setCustomTextures] = useState<Record<string, string>>({});

    const toggleView = () => {
        setIs2DView((prev) => !prev);
        if (creatingWallMode) {
            setCreatingWallMode(false);
        }
        // Reset selected floor when switching to 2D
        if (!is2DView && currentFloor > 0) {
            setSelectedFloor2D(0);
        }
    };

    const handleAddWall2D = (start: THREE.Vector3, end: THREE.Vector3) => {

        const wallHeight = 6;
        const wallWidth = 0.2;
        const wallLength = start.distanceTo(end);
        const pricePerUnitLength = 10;
        const wallPrice = wallLength * pricePerUnitLength;
        const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallWidth);
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 }); 
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        midPoint.y = 0;
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const angle = Math.atan2(direction.z, direction.x);

        const newWallObject: ObjectData = {
            id: uuidv4(),
            url: '',
            price: wallPrice,
            details: 'Mur',
            position: [midPoint.x / 2, 0, midPoint.z / 2],
            gltf: wallMesh,
            rotation: [0, -angle, 0],
            // texture: 'textures/Cube_BaseColor.png',
            scale: [wallLength, wallHeight, wallWidth],
        };

        setObjects((prevObjects: ObjectData[]) => [...prevObjects, newWallObject]);
        setQuote((prevQuote: ObjectData[]) => [...prevQuote, newWallObject]);

        if (lineHelper.current) {
            setWalls2D((prev) => prev.filter((w) => w !== lineHelper.current!));
            lineHelper.current = null;
        }
    };


    useEffect(() => {
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshBasicMaterial({ visible: false });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = 0; // S'assurer que le plan est à y=0
        groundPlaneRef.current = plane;
    }, []);

    useEffect(() => {
        const handleMouseMoveCallback = (e: MouseEvent) => {
            if (isMoving !== null && cameraRef.current) {
                handleMouseMove(e, isMoving, mouse, raycaster, objects, setObjects, cameraRef.current);
            }
        };

        if (isMoving !== null) {
            document.addEventListener('mousemove', handleMouseMoveCallback);
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enabled = false;
            }
        } else {
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enabled = true;
            }
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMoveCallback);
        };
    }, [isMoving, objects]);

    useEffect(() => {
        if (orbitControlsRef.current) {
            orbitControlsRef.current.enableRotate = !is2DView;
        }
    }, [is2DView]);



    useEffect(() => {
        const dragger = draggerRef.current;
        const leftPanel = leftPanelRef.current;
        const rightPanel = rightPanelRef.current;

        if (!dragger || !leftPanel || !rightPanel) return;

        let isDragging = false;

        const startDragging = () => {
            isDragging = true;
            document.body.style.cursor = 'col-resize';
            dragger.style.pointerEvents = 'none'; // Assure que le dragger reste fonctionnel
        };

        const stopDragging = () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = 'default';
                dragger.style.pointerEvents = 'auto'; // Réactiver les événements sur le dragger
            }
        };

        const handleDragging = (e: MouseEvent) => {
            if (!isDragging) return;

            const containerWidth = leftPanel.parentElement?.offsetWidth || 0;
            const dragPosition = e.clientX;

            const minRightPanelWidth = 400;
            const draggerWidth = 10; // Largeur du dragger (ou sa zone active)

            // Calculer la nouvelle largeur pour le panneau gauche
            const newLeftWidth = Math.min(
                Math.max(200, dragPosition - leftPanel.offsetLeft), // Limite gauche
                containerWidth - minRightPanelWidth - draggerWidth // Limite droite
            );

            // Appliquer les nouvelles largeurs
            leftPanel.style.flex = `0 0 ${newLeftWidth}px`;
            rightPanel.style.flex = `1 1 ${containerWidth - newLeftWidth - draggerWidth}px`;
        };

        dragger.addEventListener('mousedown', startDragging);
        document.addEventListener('mouseup', stopDragging);
        document.addEventListener('mousemove', handleDragging);

        return () => {
            dragger.removeEventListener('mousedown', startDragging);
            document.removeEventListener('mouseup', stopDragging);
            document.removeEventListener('mousemove', handleDragging);
        };
    }, []);


    const setCamera = useCallback((camera: THREE.Camera) => {
        cameraRef.current = camera;
    }, []);

    const handleRemoveObject = useCallback((id: string) => {
        setObjects((prevObjects) => prevObjects.filter((obj) => obj.id !== id));
        setQuote((prevQuote) => prevQuote.filter((item) => item.id !== id));
        setIsMoving(null);
    }, []);

    const handleToggleShowDimensions = useCallback((id: string) => {
        console.log("show dim");
        setShowDimensions((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    }, []);


    const handleUpdatePosition = useCallback((id: string, position: [number, number, number]) => {
        setObjects((prev) =>
            prev.map((obj) => (obj.id === id ? { ...obj, position } : obj))
        );
        console.log(objects);
    }, []);

    const handleUpdateTexture = useCallback((id: string, newTexture: string) => {
        setObjects((prevObjects) =>
            prevObjects.map((obj) =>
                obj.id === id ? { ...obj, texture: newTexture } : obj
            )
        );
    }, []);


    const handleAddObject = useCallback(async (url: string) => {
        try {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(url);
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const size = new THREE.Vector3();
            box.getSize(size);
            const extras = gltf.asset?.extras || {};
            const price = extras.price || 0;
            const details = extras.details || 'No details available';
            const newObject: ObjectData = {
                id: uuidv4(),
                url,
                price,
                details,
                position: [0, 0, 0] as [number, number, number],
                gltf: gltf,
                rotation: [0, 0, 0],
                // texture: "textures/Cube_BaseColor.png",
                scale: [size.x, size.y, size.z],
                //scale: [1, 1, 1],
            };
            setObjects((prevObjects) => [...prevObjects, newObject]);
            setQuote((prevQuote) => [...prevQuote, newObject]);
            console.log("A new object is added!");
            console.log(objects);
        } catch (error) {
            console.error('Error loading GLTF file:', error);
        }
    }, []);

    const handleUpdateScale = useCallback((id: string, newScale: [number, number, number]) => {
        setObjects((prevObjects) => {
            return prevObjects.map((obj) => {
                if (obj.id === id) {
                    return {
                        ...obj,
                        scale: newScale,
                    };
                }
                console.log(obj);
                return obj;
            });
        });
    }, []);

    const handleRotateObject = (id: string, newRotation: [number, number, number]) => {
        setObjects((prevObjects) =>
            prevObjects.map((obj) =>
                obj.id === id ? { ...obj, rotation: newRotation } : obj
            )
        );
        return [id, newRotation];
    };

    const getSerializableQuote = useCallback(() => {
        return quote.map((item) => ({
            id: item.id,
            url: item.url,
            price: item.price,
            details: item.details,
            position: item.position,
            scale: item.scale,
            texture: item.texture,
            rotation: item.rotation,
        }));
    }, [quote]);

    const navigateToFullQuote = useCallback(() => {
        const serializableQuote = getSerializableQuote();
        navigate('/full-quote', { state: { quote: serializableQuote } });
    }, [getSerializableQuote, navigate]);

    const handleObjectClick = useCallback((id: string) => {
        // Ne pas ouvrir le panneau si on est en mode 2D
        if (is2DView) {
            return;
        }

        const selectedObject = objects.find((obj) => obj.id === id);
        const panel = document.getElementById('floating-panel');
        setCreatingWallMode(false);
        
        if (selectedObject && panel) {
            panel.style.display = 'block';

            if (!panelRootRef.current) {
                panelRootRef.current = createRoot(panel);
            }
            panelRootRef.current.render(
                <ObjectPanel
                    object={selectedObject}
                    onUpdateTexture={handleUpdateTexture}
                    onUpdateScale={handleUpdateScale}
                    onRemoveObject={handleRemoveObject}
                    customTextures={customTextures}
                    onMoveObject={() => setIsMoving(id)}
                    onClosePanel={() => {
                        closePanel();
                        setIsMoving(null);
                    }}
                    onRotateObject={handleRotateObject}
                    onToggleShowDimensions={handleToggleShowDimensions}
                />
            );
        }
    }, [objects, handleUpdateTexture, handleUpdateScale, handleRemoveObject, is2DView, customTextures]);

    const updateQuotePrice = (id: string, newPrice: number, newScale : [number, number, number]) => {
        console.log("update quote price");
        setQuote((prevQuote) =>
            prevQuote.map((item) =>
                item.id === id ? { ...item, price: newPrice, scale : newScale } : item
            )
        );
    };

    const generateRoom = useCallback(() => {
        const wallThickness = 0.2;
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x90EE90,
            transparent: true,
            opacity: 0.8
        });
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xADD8E6,
            transparent: true,
            opacity: 0.7
        });

        // Créer le sol au niveau le plus bas (y = 0)
        const floorObject: ObjectData = {
            id: uuidv4(),
            url: '',
            price: 50,
            details: 'Sol (Rez-de-chaussée)',
            position: [0, wallThickness/2, 0], // Ajuster la position Y pour l'épaisseur du sol
            gltf: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), floorMaterial),
            rotation: [0, 0, 0],
            scale: [roomConfig.width, wallThickness, roomConfig.length],
        };

        // Créer les murs en commençant au niveau du sol
        const walls = [
            // Mur avant
            {
                position: [0, roomConfig.height/2, roomConfig.length/4],
                scale: [roomConfig.width, roomConfig.height, wallThickness],
                rotation: [0, 0, 0]
            },
            // Mur arrière
            {
                position: [0, roomConfig.height/2, -roomConfig.length/4],
                scale: [roomConfig.width, roomConfig.height, wallThickness],
                rotation: [0, 0, 0]
            },
            // Mur gauche
            {
                position: [-roomConfig.width/4, roomConfig.height/2, 0],
                scale: [roomConfig.length, roomConfig.height, wallThickness],
                rotation: [0, Math.PI/2, 0]
            },
            // Mur droit
            {
                position: [roomConfig.width/4, roomConfig.height/2, 0],
                scale: [roomConfig.length, roomConfig.height, wallThickness],
                rotation: [0, Math.PI/2, 0]
            }
        ];

        // Ajouter le sol
        setObjects(prevObjects => [...prevObjects, floorObject]);
        setQuote(prevQuote => [...prevQuote, {
            ...floorObject,
            price: (roomConfig.width * roomConfig.length * 50)
        }]);

        // Ajouter les murs
        walls.forEach(wall => {
            const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

            const newWallObject: ObjectData = {
                id: uuidv4(),
                url: '',
                price: 100,
                details: 'Mur (Rez-de-chaussée)',
                position: [
                    wall.position[0],
                    (wall.position[1] + wallThickness/2)/2, // Ajuster la position Y pour commencer au niveau du sol
                    wall.position[2]
                ],
                gltf: wallMesh,
                rotation: wall.rotation as [number, number, number],
                scale: wall.scale as [number, number, number],
            };

            setObjects(prevObjects => [...prevObjects, newWallObject]);
            setQuote(prevQuote => [...prevQuote, newWallObject]);
        });

        setCurrentFloor(0);
        setShowRoomConfig(false);
    }, [roomConfig]);

    // Ajouter cette fonction pour créer un nouvel étage
    const addNewFloor = useCallback(() => {
        const wallThickness = 0.2;
        const nextFloorNumber = currentFloor + 1;
        const floorHeight = nextFloorNumber * roomConfig.height;

        // Couleurs différentes pour chaque étage
        const colors = [
            0xFFB6C1, // Rose clair
            0xFFE4B5, // Pêche
            0xE6E6FA, // Lavande
            0x98FB98  // Vert pâle
        ];

        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: colors[nextFloorNumber % colors.length],
            transparent: true,
            opacity: 0.8
        });

        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: colors[(nextFloorNumber + 1) % colors.length],
            transparent: true,
            opacity: 0.7
        });

        // Créer le sol de l'étage
        const floorObject: ObjectData = {
            id: uuidv4(),
            url: '',
            price: 50,
            details: `Sol (Étage ${nextFloorNumber})`,
            position: [0, (floorHeight + wallThickness/2)/2, 0], // Ajuster la position Y pour l'épaisseur du sol
            gltf: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), floorMaterial),
            rotation: [0, 0, 0],
            scale: [roomConfig.width, wallThickness, roomConfig.length],
        };

        // Créer les murs de l'étage
        const walls = [
            // Mur avant
            {
                position: [0, (floorHeight + roomConfig.height/2)/2, roomConfig.length/4],
                scale: [roomConfig.width, roomConfig.height, wallThickness],
                rotation: [0, 0, 0]
            },
            // Mur arrière
            {
                position: [0, (floorHeight + roomConfig.height/2)/2, -roomConfig.length/4],
                scale: [roomConfig.width, roomConfig.height, wallThickness],
                rotation: [0, 0, 0]
            },
            // Mur gauche
            {
                position: [-roomConfig.width/4, (floorHeight + roomConfig.height/2)/2, 0],
                scale: [roomConfig.length, roomConfig.height, wallThickness],
                rotation: [0, Math.PI/2, 0]
            },
            // Mur droit
            {
                position: [roomConfig.width/4, (floorHeight + roomConfig.height/2)/2, 0],
                scale: [roomConfig.length, roomConfig.height, wallThickness],
                rotation: [0, Math.PI/2, 0]
            }
        ];

        // Ajouter le sol
        setObjects(prevObjects => [...prevObjects, floorObject]);
        setQuote(prevQuote => [...prevQuote, {
            ...floorObject,
            price: (roomConfig.width * roomConfig.length * 50)
        }]);

        // Ajouter les murs
        walls.forEach(wall => {
            const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

            const newWallObject: ObjectData = {
                id: uuidv4(),
                url: '',
                price: 100,
                details: `Mur (Étage ${nextFloorNumber})`,
                position: [
                    wall.position[0],
                    wall.position[1] + wallThickness/2, // Ajuster la position Y pour commencer au niveau du sol de l'étage
                    wall.position[2]
                ],
                gltf: wallMesh,
                rotation: wall.rotation as [number, number, number],
                scale: wall.scale as [number, number, number],
            };

            setObjects(prevObjects => [...prevObjects, newWallObject]);
            setQuote(prevQuote => [...prevQuote, newWallObject]);
        });

        setCurrentFloor(nextFloorNumber);
    }, [currentFloor, roomConfig]);

    const RoomConfigPanel = () => {
        const surfaceM2 = roomConfig.width * roomConfig.length;
        
        return (
            <div className="room-config-panel" style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 0 10px rgba(0,0,0,0.2)',
                zIndex: 1000
            }}>
                <h3>Configuration de la pièce</h3>
                <div>
                    <label>Largeur (m): </label>
                    <input 
                        type="number" 
                        value={roomConfig.width} 
                        onChange={(e) => setRoomConfig(prev => ({...prev, width: Number(e.target.value)}))}
                        min="1"
                        step="0.5"
                    />
                </div>
                <div>
                    <label>Longueur (m): </label>
                    <input 
                        type="number" 
                        value={roomConfig.length} 
                        onChange={(e) => setRoomConfig(prev => ({...prev, length: Number(e.target.value)}))}
                        min="1"
                        step="0.5"
                    />
                </div>
                <div>
                    <label>Hauteur (m): </label>
                    <input 
                        type="number" 
                        value={roomConfig.height} 
                        onChange={(e) => setRoomConfig(prev => ({...prev, height: Number(e.target.value)}))}
                        min="1"
                        step="0.5"
                    />
                </div>
                <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px'
                }}>
                    <strong>Surface totale:</strong> {surfaceM2.toFixed(2)} m²
                </div>
                <div style={{marginTop: '20px'}}>
                    <button onClick={generateRoom}>Créer la pièce</button>
                    <button onClick={() => setShowRoomConfig(false)}>Annuler</button>
                </div>
            </div>
        );
    };

    // Composant pour le sélecteur d'étage en vue 2D
    const FloorSelector = () => {
        if (!is2DView || currentFloor === 0) return null;

        return (
            <div className="floor-selector" style={{
                position: 'absolute',
                top: '80px',
                right: '20px',
                backgroundColor: 'white',
                padding: '10px',
                borderRadius: '5px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                zIndex: 1000
            }}>
                <label style={{ marginRight: '10px' }}>Étage à visualiser:</label>
                <select 
                    value={selectedFloor2D}
                    onChange={(e) => setSelectedFloor2D(Number(e.target.value))}
                    style={{
                        padding: '5px',
                        borderRadius: '3px'
                    }}
                >
                    {Array.from({ length: currentFloor + 1 }, (_, i) => (
                        <option key={i} value={i}>
                            {i === 0 ? 'Rez-de-chaussée' : `Étage ${i}`}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    // Add texture upload handler
    const handleTextureUpload = useCallback(async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://127.0.0.1:5000/upload_texture', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                const textureUrl = `http://127.0.0.1:5000/textures/${data.filename}`;
                setCustomTextures(prev => ({
                    ...prev,
                    [file.name]: textureUrl
                }));
            } else {
                console.error('Texture upload failed');
            }
        } catch (error) {
            console.error('Error uploading texture:', error);
        }
    }, []);

    return (
        <div id="page">
            {/* Bannière fixe en haut */}
            <div className="banner">
                <button onClick={() => setCreatingWallMode(!creatingWallMode)} disabled={!is2DView}>
                    {creatingWallMode ? 'terminer l\'ajout de mur' : 'ajouter un mur en 2D'}
                </button>
                <button onClick={() => handleAddObject('/wall_with_door.gltf')} className="bouton">
                    mur avec ouverture pour porte
                </button>
                <button onClick={() => handleAddObject('/porte_fenetre.gltf')} className="bouton">
                    porte-fenêtre
                </button>
                <button onClick={() => setShowRoomConfig(true)} className="bouton">
                    Générer une pièce
                </button>
                <button 
                    onClick={addNewFloor} 
                    className="bouton"
                    disabled={currentFloor === 0 && objects.length === 0} // Désactivé s'il n'y a pas de rez-de-chaussée
                >
                    Ajouter un étage
                </button>
            </div>
            <GltfList handleAddObject={handleAddObject} />

            {/* Contenu principal */}
            <div id="container" className="container-essaie">
                <div ref={leftPanelRef} className="left-panel">
                    <FloorSelector />
                    <div
                        id="floating-panel"
                        className="floating-panel"
                        onMouseDown={(e) => startDraggingPanel(e)}
                    ></div>

                    <CanvasScene
                        objects={objects.filter(obj => {
                            if (!is2DView) return true;
                            
                            // En vue 2D, filtrer les objets selon l'étage sélectionné
                            const objectHeight = obj.position[1] * 2; // Multiplier par 2 pour compenser la division
                            
                            if (selectedFloor2D === 0) {
                                // Pour le rez-de-chaussée
                                return objectHeight <= roomConfig.height;
                            } else {
                                // Pour les étages supérieurs
                                const floorStart = selectedFloor2D * roomConfig.height;
                                const floorEnd = (selectedFloor2D + 1) * roomConfig.height;
                                
                                // Vérifier si l'objet appartient à cet étage
                                const isInFloor = objectHeight > floorStart && objectHeight <= floorEnd;
                                
                                // Vérifier si c'est un sol d'étage (qui a une position légèrement décalée)
                                const isFloor = obj.details.includes('Sol') && 
                                              obj.details.includes(`Étage ${selectedFloor2D}`);
                                
                                return isInFloor || isFloor;
                            }
                        })}
                        onClick={handleObjectClick}
                        onUpdatePosition={handleUpdatePosition}
                        isMoving={isMoving}
                        setIsMoving={setIsMoving}
                        orbitControlsRef={orbitControlsRef}
                        setCamera={setCamera}
                        showDimensions={showDimensions}
                        is2DView={is2DView}
                        walls2D={walls2D}
                        updateQuotePrice={updateQuotePrice}
                        groundPlane={groundPlaneRef.current}
                        handleAddWall2D={handleAddWall2D}
                        creatingWallMode={creatingWallMode}
                    />
                </div>

                <button onClick={toggleView} className="vue3D">
                    {is2DView ? 'vue 3D' : 'vue 2D'}
                </button>

                <div ref={draggerRef} className="dragger"></div>
                <div ref={rightPanelRef} className="right-panel">
                    <img src={"logo.png"} alt="Top Right" className="top-right-image" />
                    <h2 className="title">devis</h2>
                    <hr className="hr" />
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {quote.map((item) => (
                            <li key={item.id} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px',
                                padding: '8px',
                                backgroundColor: '#f5f5f5',
                                borderRadius: '4px'
                            }}>
                                <div>
                                    {item.details} {item.scale[0]}m, {item.scale[1]}m, {item.scale[2]}m : {item.price} €
                                </div>
                                <div>
                                    <button 
                                        onClick={() => {
                                            setObjects(objects.filter(obj => obj.id !== item.id));
                                            setQuote(quote.filter(q => q.id !== item.id));
                                        }}
                                        style={{
                                            marginRight: '8px',
                                            padding: '4px 8px',
                                            backgroundColor: '#ff4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Tout supprimer
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setQuote(quote.filter(q => q.id !== item.id));
                                        }}
                                        style={{
                                            padding: '4px 8px',
                                            backgroundColor: '#ffa500',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Supprimer du devis
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <p>Total: {quote.reduce((sum, item) => sum + item.price, 0)} €</p>
                    <div className="parent-container">
                        <button onClick={navigateToFullQuote} className="full-quote-button">
                            consulter le devis complet
                        </button>
                    </div>
                </div>
            </div>
            {showRoomConfig && <RoomConfigPanel />}
        </div>
    );
};

export default MainPage;
