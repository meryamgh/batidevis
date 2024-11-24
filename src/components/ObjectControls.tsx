import React from 'react';

type ObjectControlsProps = {
    selectedObjectId: number | null;
    onRemove: () => void;
    onMove: () => void;
};

const ObjectControls: React.FC<ObjectControlsProps> = ({
    selectedObjectId,
    onRemove,
    onMove,
}) => {
    if (selectedObjectId === null) return null;

    return (
        <div className="controls">
            <button className="delete-button" onClick={onRemove}>
                Delete
            </button>
            <button className="move-button" onClick={onMove}>
                Move
            </button>
        </div>
    );
};

export default ObjectControls;
