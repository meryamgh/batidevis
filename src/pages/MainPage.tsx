import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import GLTFObject from '../components/GLTFObject';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ObjectData } from '../types/ObjectData';
import * as THREE from 'three';
import '../styles/Controls.css';
import '../styles/MainPage.css';

const MainPage: React.FC = () => {
    const [objects, setObjects] = useState<ObjectData[]>([]);
    const [quote, setQuote] = useState<ObjectData[]>([]);
    const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
    const [isMoving, setIsMoving] = useState<boolean>(false);
    
    const orbitControlsRef = useRef<any>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const draggerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const raycaster = useRef(new THREE.Raycaster());
    const mouse = useRef(new THREE.Vector2());

    const closePanel = () => {
        const panel = document.getElementById('floating-panel');
        if (panel) {
            panel.style.display = 'none';
        }
        setIsMoving(false);
    };

    const startDragging = (e: React.MouseEvent) => {
        const panel = document.getElementById('floating-panel');
        if (!panel) return;

        const offsetX = e.clientX - panel.getBoundingClientRect().left;
        const offsetY = e.clientY - panel.getBoundingClientRect().top;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            panel.style.left = `${moveEvent.clientX - offsetX}px`;
            panel.style.top = `${moveEvent.clientY - offsetY}px`;
        };

        const stopDragging = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopDragging);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopDragging);
    };

    const handleAddObject = async (url: string) => {
        try {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(url);

            const extras = gltf.asset?.extras || {};
            const price = extras.price || 0;
            const details = extras.details || 'No details available';

            const newObject: ObjectData = {
                id: Date.now(),
                url,
                price,
                details,
                position: [0, 0, 0], // Default position for new objects
            };

            setObjects([...objects, newObject]);
            setQuote([...quote, newObject]);

            // Automatically select the newly added object
            setSelectedObjectId(newObject.id);
        } catch (error) {
            console.error('Error loading GLTF file:', error);
        }
    };

    const handleRemoveObject = () => {
        alert(selectedObjectId)
        if (selectedObjectId === null) return;
        setObjects(objects.filter((obj) => obj.id !== selectedObjectId));
        setQuote(quote.filter((item) => item.id !== selectedObjectId));
        setSelectedObjectId(null);
        setIsMoving(false);
    };

    const handleUpdatePosition = (id: number, position: [number, number, number]) => {
        setObjects((prev) =>
            prev.map((obj) => (obj.id === id ? { ...obj, position } : obj))
        );
    };

    const navigateToFullQuote = () => {
        navigate('/full-quote', { state: { quote } });
    };

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
        const handleMouseMove = (e: MouseEvent) => {
            if (isMoving && selectedObjectId !== null) {
                // Normalize mouse position
                const canvasElement = document.querySelector('canvas');
                if (!canvasElement) return;

                const bounds = canvasElement.getBoundingClientRect();
                mouse.current.x = ((e.clientX - bounds.left) / bounds.width) * 2 - 1;
                mouse.current.y = -((e.clientY - bounds.top) / bounds.height) * 2 + 1;

                raycaster.current.setFromCamera(mouse.current, useThree().camera);
                
                const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
                const intersectPoint = new THREE.Vector3();
                raycaster.current.ray.intersectPlane(plane, intersectPoint);

                const updatedObjects = objects.map((obj) => {
                    if (obj.id === selectedObjectId) {
                        return {
                            ...obj,
                            position: [intersectPoint.x, obj.position[1], intersectPoint.z],
                        };
                    }
                    return obj;
                });
                setObjects(updatedObjects);
            }
        };

        if (isMoving) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', () => setIsMoving(false));
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enabled = false;
            }
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            if (orbitControlsRef.current) {
                orbitControlsRef.current.enabled = true;
            }
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isMoving, selectedObjectId, objects]);

    const handleObjectClick = (id: number) => {
        setSelectedObjectId(id);
        const selectedObject = objects.find((obj) => obj.id === id);
        const panel = document.getElementById('floating-panel');

        if (selectedObject && panel) {
            panel.style.display = 'block';
            panel.innerHTML = `
                <p><strong>Details:</strong> ${selectedObject.details}</p>
                <p><strong>Price:</strong> ${selectedObject.price} €</p>
                <button id="delete-button" style="margin: 5px; padding: 10px; background-color: #FF5733; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                <button id="move-button" style="margin: 5px; padding: 10px; background-color: #007BFF; color: white; border: none; border-radius: 4px; cursor: pointer;">Move</button>
                <button id="edit-button" style="margin: 5px; padding: 10px; background-color: #FFC107; color: white; border: none; border-radius: 4px; cursor: pointer;">Edit</button>
                <button id="close-button" style="margin: 5px; padding: 10px; background-color: green; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
            `;

            // Attach event listeners to buttons
            document.getElementById('delete-button')?.addEventListener('click', () => {
                setSelectedObjectId(id);
                handleRemoveObject();
                closePanel();
            });
            document.getElementById('move-button')?.addEventListener('click', () => {
                setIsMoving(true);
                alert(selectedObject)
            });
            document.getElementById('edit-button')?.addEventListener('click', () => {
                console.log(`Edit object ${selectedObject.id}`);
            });
            document.getElementById('close-button')?.addEventListener('click', () => {
                closePanel();
            });
        }
    };

    return (
        <div id="container" style={{ display: 'flex', height: '100vh' }}>
            {/* Left Panel */}
            <div
                ref={leftPanelRef}
                style={{
                    flex: '1 1 50%',
                    minWidth: '200px',
                    overflow: 'hidden',
                }}
            >
                <button onClick={() => handleAddObject('/wall_with_door.gltf')}>
                    Add Object 1
                </button>
                <button onClick={() => handleAddObject('/porte_fenetre.gltf')}>
                    Add Object 2
                </button>

                <div
                    id="floating-panel"
                    style={{
                        display: 'none',
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        backgroundColor: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        padding: '10px',
                        maxWidth: '300px',
                        overflowY: 'auto',
                        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        cursor: 'move',
                    }}
                    onMouseDown={(e) => startDragging(e)}
                ></div>

                <Canvas onClick={() => setSelectedObjectId(null)}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[5, 5, 5]} />
                    <OrbitControls ref={orbitControlsRef} />
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
                        <planeGeometry args={[50, 50]} />
                        <meshStandardMaterial color="lightgray" />
                    </mesh>
                    {objects.map((obj) => (
                        <GLTFObject
                            key={obj.id}
                            id={obj.id}
                            url={obj.url}
                            position={obj.position}
                            onUpdatePosition={handleUpdatePosition}
                            isMovable={selectedObjectId === obj.id}
                            onClick={() => handleObjectClick(obj.id)}
                        />
                    ))}
                </Canvas>
            </div>

            {/* Dragger */}
            <div
                ref={draggerRef}
                style={{
                    width: '10px',
                    cursor: 'col-resize',
                    background: '#ddd',
                }}
            ></div>

            {/* Right Panel */}
            <div
                ref={rightPanelRef}
                style={{
                    flex: '1 1 50%',
                    minWidth: '200px',
                    overflowY: 'auto',
                    padding: '10px',
                    backgroundColor: '#f8f8f8',
                }}
            >
                <h2>Quote</h2>
                <ul>
                    {quote.map((item) => (
                        <li key={item.id}>
                            {item.details}: {item.price} €
                        </li>
                    ))}
                </ul>
                <p>
                    Total: {quote.reduce((sum, item) => sum + item.price, 0)} €
                </p>
                <button
                    onClick={navigateToFullQuote}
                    style={{
                        padding: '10px 20px',
                        marginTop: '20px',
                        backgroundColor: '#007BFF',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Afficher Devis Complet
                </button>
            </div>
        </div>
    );
};

export default MainPage;
