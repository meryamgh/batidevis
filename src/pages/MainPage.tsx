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

    const [currentWall, setCurrentWall] = useState<THREE.Line | null>(null);
    const [creatingWallMode, setCreatingWallMode] = useState(false);
    const [walls2D, setWalls2D] = useState<THREE.Line[]>([]);
    const [wallStart, setWallStart] = useState<THREE.Vector3 | null>(null);
    const lineHelper = useRef<THREE.Line | null>(null);


    const toggleView = () => {
        setIs2DView((prev) => !prev);
    };

    const handleAddWall2D = (start: THREE.Vector3, end: THREE.Vector3) => {
        const wallHeight = 1;   
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
            position: [midPoint.x, 0, midPoint.z], 
            gltf: wallMesh,
            rotation: [0,-angle, 0],
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
        };

        const stopDragging = () => {
            isDragging = false;
            document.body.style.cursor = 'default';
        };

        const handleDragging = (e: MouseEvent) => {
            if (!isDragging) return;

            const containerWidth = leftPanel.parentElement?.offsetWidth || 0;
            const dragPosition = e.clientX;

            const newLeftWidth = Math.min(
                Math.max(200, dragPosition - leftPanel.offsetLeft),
                containerWidth - 200
            );

            leftPanel.style.flex = `0 0 ${newLeftWidth}px`;
            rightPanel.style.flex = `0 0 ${containerWidth - newLeftWidth}px`;
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
    useEffect(() => {
        const handleMouseClick = (e: MouseEvent) => {
            if (!is2DView || !creatingWallMode || !groundPlaneRef.current) return;
    
            const target = e.target as HTMLElement;
            const rect = target?.getBoundingClientRect();
    
            if (rect && cameraRef.current && groundPlaneRef.current) { 
                const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
                mouse.current.set(x, y);
                raycaster.current.setFromCamera(mouse.current, cameraRef.current);
     
                const intersects = raycaster.current.intersectObject(groundPlaneRef.current);
                if (intersects.length > 0) {
                    const point = intersects[0].point.clone();   
                    if (!wallStart) { 
                        console.log("Wall Start Point Set:", point);
                        setWallStart(point);
                    } else { 
                        console.log("Creating Wall - From:", wallStart, "To:", point);
                        handleAddWall2D(wallStart, point);
    
                        setWallStart(null);  
                        setCurrentWall(null);  
                    }
                }
            }
        };
    
        const handleMouseMove = (e: MouseEvent) => {
            if (!is2DView || !creatingWallMode || !wallStart) return;
    
            const target = e.target as HTMLElement;
            const rect = target?.getBoundingClientRect();
    
            if (rect && cameraRef.current && groundPlaneRef.current) {
                const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
                mouse.current.set(x, y);
                raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    
                const intersects = raycaster.current.intersectObject(groundPlaneRef.current);
                if (intersects.length > 0) {
                    const point = intersects[0].point.clone();
                    point.y = 0;
                    console.log("Mouse Move - Intersection Point:", point);
    
                    if (lineHelper.current) { 
                        const points = [wallStart, point];
                        const geometry = new THREE.BufferGeometry().setFromPoints(points);
                        lineHelper.current.geometry.dispose();
                        lineHelper.current.geometry = geometry;
    
                        console.log("Updated Line Geometry:", points);
                    } else { 
                        const material = new THREE.LineBasicMaterial({ color: 0x0000ff });
                        const points = [wallStart, point];
                        const geometry = new THREE.BufferGeometry().setFromPoints(points);
                        const line = new THREE.Line(geometry, material);
    
                        lineHelper.current = line;
                        console.log("Created New Line Helper:", points);
    
                        setCurrentWall(line);
                        setWalls2D((prev: THREE.Line[]) => [...prev, line]);
                    }
                }
            }
        };
     
        window.addEventListener('click', handleMouseClick);
        window.addEventListener('mousemove', handleMouseMove);
    
        return () => { 
            window.removeEventListener('click', handleMouseClick);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [is2DView, creatingWallMode, wallStart, currentWall]);
    

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
                gltf : gltf,
                rotation : [0, 0, 0],
                texture: "textures/Cube_BaseColor.png",
               // scale: [size.x, size.y, size.z],
                scale: [1, 1, 1],
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
                    showDimensions={!!showDimensions[id]}
                />
            );
        }
    }, [objects, handleUpdateTexture, handleUpdateScale, handleRemoveObject]);

    return (
        <div id="container">
            <div ref={leftPanelRef} className="left-panel">
                <button onClick={() => setCreatingWallMode(!creatingWallMode)} disabled={!is2DView}>
                    {creatingWallMode ? 'Terminer l\'ajout de mur' : 'Ajouter un mur (Mode 2D)'}
                </button>
                <button onClick={() => handleAddObject('/wall_with_door.gltf')}>
                    Mur pour porte
                </button>
                <button onClick={() => handleAddObject('/porte_fenetre.gltf')}>
                    Porte PorteFenetre
                </button>

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
                    groundPlane={groundPlaneRef.current}
                />
            </div>
            <button onClick={toggleView}>
                {is2DView ? 'Passer en Vue 3D' : 'Passer en Vue 2D'}
            </button>

            <div ref={draggerRef} className="dragger"></div>
            <div ref={rightPanelRef} className="right-panel">
                <h2>Quote</h2>
                <ul>
                    {quote.map((item) => (
                        <li key={item.id}>
                            {item.details}: {item.price} €
                        </li>
                    ))}
                </ul>
                <p>Total: {quote.reduce((sum, item) => sum + item.price, 0)} €</p>
                <button onClick={navigateToFullQuote} className="full-quote-button">
                    afficher devis complet
                </button>
            </div>
        </div>
    );
};

export default MainPage;
