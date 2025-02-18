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


    const toggleView = () => {
        setIs2DView((prev) => !prev);
        if (creatingWallMode) {
            setCreatingWallMode(false);
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
            texture: 'textures/Cube_BaseColor.png',
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
                texture: "textures/Cube_BaseColor.png",
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
    }, [objects, handleUpdateTexture, handleUpdateScale, handleRemoveObject]);

    const updateQuotePrice = (id: string, newPrice: number, newScale : [number, number, number]) => {
        console.log("update quote price");
        setQuote((prevQuote) =>
            prevQuote.map((item) =>
                item.id === id ? { ...item, price: newPrice, scale : newScale } : item
            )
        );
    };

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
                <button onClick={() => handleAddObject('/window.gltf')} className="bouton">
                    window
                </button>
                <button onClick={() => handleAddObject('/porte_fenetre.gltf')} className="bouton">
                    porte-fenêtre
                </button>
                <button onClick={() => handleAddObject('/scene.gltf')} className="bouton">
                    window sketchfab
                </button>
                <button onClick={() => handleAddObject('/Fence_Gate.gltf')} className="bouton">
                    gate
                </button>
                <button onClick={() => handleAddObject('/plaquette_facade.gltf')} className="bouton">
                    façade meshy
                </button>
                <button onClick={() => handleAddObject('/Columns.gltf')} className="bouton">
                    façade sloyd
                </button>
            </div>

            {/* Contenu principal */}
            <div id="container" className="container-essaie">
                <div ref={leftPanelRef} className="left-panel">
                    <div
                        id="floating-panel"
                        className="floating-panel"
                        onMouseDown={(e) => startDraggingPanel(e)}
                    ></div>

                    <CanvasScene
                        objects={objects}
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
                    <ul>
                        {quote.map((item) => (
                            <li key={item.id}>
                                {item.details} {item.scale[0]}m, {item.scale[1]}m, {item.scale[2]}m : {item.price} €
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
        </div>
    );
};

export default MainPage;
