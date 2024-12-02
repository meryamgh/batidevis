import React, { useState, useEffect } from 'react';
import { ObjectData } from '../types/ObjectData';
import '../styles/MainPage.css';
import '../styles/Controls.css';

type ObjectPanelProps = {
    object: ObjectData;
    onUpdateTexture: (id: string, newTexture: string) => void;
    onUpdateScale: (id: string, newScale: [number, number, number]) => void;
    onRemoveObject: (id: string) => void;
    onMoveObject: () => void;
    onClosePanel: () => void;
    onRotateObject: (id: string, newRotation: [number, number, number]) => void;
    onToggleShowDimensions: (id: string) => void; // Prop pour basculer l'affichage des dimensions
    showDimensions: boolean;
};

const ObjectPanel: React.FC<ObjectPanelProps> = ({
    object,
    onUpdateTexture,
    onUpdateScale,
    onRemoveObject,
    onMoveObject,
    onClosePanel,
    onRotateObject,
    onToggleShowDimensions,
    showDimensions,
}) => {
    const [width, setWidth] = useState(object.scale[0]);
    const [height, setHeight] = useState(object.scale[1]);
    const [depth, setDepth] = useState(object.scale[2]);
    const [rotation, setRotation] = useState<[number, number, number]>(object.rotation || [0, 0, 0]);
    const [isRotating, setIsRotating] = useState(false);

    // Ensure the local state stays in sync with the incoming props
    useEffect(() => {
        setWidth(object.scale[0]);
        setHeight(object.scale[1]);
        setDepth(object.scale[2]);
        setRotation(object.rotation || [0, 0, 0]);
    }, [object.scale, object.rotation]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isRotating) {
                const deltaX = e.movementX;
                const deltaY = e.movementY;

                const rotationSpeed = 0.01; // Reduce rotation speed for smoother movement
                const newRotation: [number, number, number] = [
                    rotation[0] - deltaY * rotationSpeed, // Rotate up/down with Y movement
                    rotation[1] + deltaX * rotationSpeed, // Rotate left/right with X movement
                    rotation[2],
                ];

                setRotation(newRotation);
                onRotateObject(object.id, newRotation);
            }
        };

        const handleMouseClick = () => {
            if (isRotating) {
                setIsRotating(false);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseClick);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseClick);
        };
    }, [isRotating, rotation, onRotateObject, object.id]);

    const handleUpdateScale = (newWidth: number, newHeight: number, newDepth: number) => {
        onUpdateScale(object.id, [newWidth, newHeight, newDepth]);
    };

    const toggleRotation = () => {
        setIsRotating(!isRotating);
    };

    return (
        <div className="object-panel">
            <p><strong>Editing Object:</strong> {object.details}</p>
            <label>Texture:</label>
            <select
                value={object.texture}
                onChange={(e) => onUpdateTexture(object.id, e.target.value)}
            >
                <option value="textures/Cube_BaseColor.png">Cube_BaseColor.png</option>
                <option value="textures/concrete_texture.jpg">concrete_texture.jpg</option>
            </select>
            <br />
            <label>Width:</label>
            <input
                type="number"
                step="0.1"
                value={width}
                onChange={(e) => {
                    const newWidth = parseFloat(e.target.value) || 0;
                    setWidth(newWidth);
                    handleUpdateScale(newWidth, height, depth);
                    onUpdateScale(object.id, [newWidth, height, depth]);
                }}
                onBlur={() => handleUpdateScale(width, height, depth)}
            />
            <br />
            <label>Height:</label>
            <input
                type="number"
                step="0.1"
                value={height}
                onChange={(e) => {
                    const newHeight = parseFloat(e.target.value) || 0;
                    setHeight(newHeight);
                    handleUpdateScale(width, newHeight, depth);
                    onUpdateScale(object.id, [width, newHeight, depth]);
                }}
                onBlur={() => handleUpdateScale(width, height, depth)}
            />
            <br />
            <label>Depth:</label>
            <input
                type="number"
                step="0.1"
                value={depth}
                onChange={(e) => {
                    const newDepth = parseFloat(e.target.value) || 0;
                    setDepth(newDepth);
                    handleUpdateScale(width, height, newDepth);
                    onUpdateScale(object.id, [width, height, newDepth]);
                }}
                onBlur={() => handleUpdateScale(width, height, depth)}
            />
            <br />
            <p><strong>Price:</strong> {object.price} €</p>
            <button onClick={() => onRemoveObject(object.id)}>Delete</button>
            <button onClick={onMoveObject}>Move</button>
            <button
                onClick={() => {
                    // Rotate the object by 90 degrees around all axes
                    const newRotation: [number, number, number] = [
                        rotation[0] + Math.PI / 2,
                        rotation[1] + Math.PI / 2,
                        rotation[2] + Math.PI / 2,
                    ];
                    setRotation(newRotation); // Update local state
                    onRotateObject(object.id, newRotation); // Call the handler
                }}
            >
                Rotate 90° on All Axes
            </button>
            <button
                onClick={toggleRotation}
            >
                {isRotating ? 'Stop Rotation' : 'Rotate with Mouse'}
            </button>
            <button onClick={onClosePanel}>Close</button>
            <button onClick={() => onToggleShowDimensions(object.id)}>
                {showDimensions ? 'Hide Dimensions' : 'Show Dimensions'}
            </button>

        </div>

    );
};

export default ObjectPanel;
