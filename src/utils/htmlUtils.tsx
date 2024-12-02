

export const generatePanelHTML = (selectedObject: { details: string; price: number }) => {
    return (
        <>
            <p><strong>Details:</strong> {selectedObject.details}</p>
            <p><strong>Price:</strong> {selectedObject.price} €</p>
            <button id="delete-button" style={{ margin: '5px', padding: '10px', backgroundColor: '#FF5733', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
            <button id="move-button" style={{ margin: '5px', padding: '10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Move</button>
            <button id="edit-button" style={{ margin: '5px', padding: '10px', backgroundColor: '#FFC107', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
            <button id="close-button" style={{ margin: '5px', padding: '10px', backgroundColor: 'green', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
        </>
    );
};
