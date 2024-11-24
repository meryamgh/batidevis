import React from 'react';
import { useLoader } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ObjectData } from '../types/ObjectData';

type GLTFObjectProps = {
    id: number;
    url: string;
    position: [number, number, number];
    onUpdatePosition: (id: number, position: [number, number, number]) => void;
    isMovable: boolean;
    onClick: () => void;
};

const GLTFObject: React.FC<GLTFObjectProps> = ({
    id,
    url,
    position,
    onUpdatePosition,
    isMovable,
    onClick,
}) => {
    const { scene } = useLoader(GLTFLoader, url);

    return (
        <TransformControls
            position={position}
            enabled={isMovable}
            mode="translate"
            onObjectChange={() => {
                onUpdatePosition(id, position);
            }}
        >
            <primitive
                object={scene}
                position={position}
                onClick={(event) => {
                    event.stopPropagation();
                    onClick();
                }}
            />
        </TransformControls>
    );
};

export default GLTFObject;
