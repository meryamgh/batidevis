import React from 'react';
import { Object3D } from '../../types/Object3D';
import '../../styles/Controls.css';

type ObjectListProps = {
    objects: Object3D[];
    onObjectSelect: (object: Object3D) => void;
};

const ObjectList: React.FC<ObjectListProps> = ({ objects, onObjectSelect }) => {
    return (
        <div className="object-list">
            <h3>Objets disponibles</h3>
            <div className="object-grid">
                {objects.map((object) => (
                    <div
                        key={object.id}
                        className="object-card"
                        onClick={() => onObjectSelect(object)}
                    >
                        {object.thumbnail ? (
                            <img src={object.thumbnail} alt={object.name} />
                        ) : (
                            <div className="placeholder-thumbnail">
                                <span>{object.name[0]}</span>
                            </div>
                        )}
                        <div className="object-info">
                            <h4>{object.name}</h4>
                            <p>{object.price} €</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ObjectList; 