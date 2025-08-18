import React from 'react';
import '../styles/ObjectPanel.css';

type ParametricDataPanelProps = {
  parametricData: any;
};

const ParametricDataPanel: React.FC<ParametricDataPanelProps> = ({ parametricData }) => {
  if (!parametricData || Object.keys(parametricData).length === 0) {
    return null;
  }

  // Function to render nested object data
  const renderObjectData = (data: any, level = 0) => {
    if (!data || typeof data !== 'object') {
      return <span className="item-value">{data?.toString() || 'N/A'}</span>;
    }

    return (
      <div style={{ marginLeft: `${level * 10}px` }}>
        {Object.entries(data).map(([key, value]) => {
          // Skip rendering if the value is null, undefined, or an empty object/array
          if (
            value === null || 
            value === undefined || 
            (typeof value === 'object' && Object.keys(value as object).length === 0)
          ) {
            return null;
          }

          // For objects or arrays, recursively render their content
          if (typeof value === 'object') {
            return (
              <div key={key} className="parametric-item">
                <div className="item-label">{key}:</div>
                {renderObjectData(value, level + 1)}
              </div>
            );
          }

          // For simple values, render as key-value pair
          return (
            <div key={key} className="parametric-item">
              <div className="item-label">{key}:</div>
              <div className="item-value">{value.toString()}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="item-details">
      <h4>Données paramétriques</h4>
      {renderObjectData(parametricData)}
    </div>
  );
};

export default ParametricDataPanel; 