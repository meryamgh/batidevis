// import React, { useRef, useState } from 'react';
// import { Canvas } from '@react-three/fiber';
// import { OrbitControls, useGLTF } from '@react-three/drei';
// import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
// import QuotePage from './QuotePage';

// const Model = ({ color }) => {
//   const { scene } = useGLTF('/wall_with_door.gltf');
//   // Apply the color dynamically
//   React.useEffect(() => {
//     scene.traverse((child) => {
//       if (child.isMesh) {
//         child.material.color.set(color);
//       }
//     });
//   }, [color, scene]);

//   return <primitive object={scene} />;
// };

// const HomePage = () => {
//   const [color, setColor] = useState('#ff0000');
//   const [price, setPrice] = useState(643.66);
//   const navigate = useNavigate();

//   const handleGenerateQuote = () => {
//     navigate('/quote', { state: { color, price } });
//   };

//   return (
//     <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
//       {/* Sidebar for inputs */}
//       <div
//         style={{
//           position: 'absolute',
//           top: 20,
//           left: 20,
//           zIndex: 10,
//           background: 'white',
//           padding: '10px',
//           borderRadius: '8px',
//           boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
//         }}
//       >
//         <h3>Modify Model</h3>
//         <label>
//           Color:
//           <input
//             type="color"
//             value={color}
//             onChange={(e) => setColor(e.target.value)}
//             style={{ marginLeft: '10px' }}
//           />
//         </label>
//         <br />
//         <label>
//           Price:
//           <input
//             type="number"
//             value={price}
//             onChange={(e) => setPrice(Number(e.target.value))}
//             style={{ marginLeft: '10px', width: '80px' }}
//           />
//         </label>
//         <p>Current Price: {price.toFixed(2)} U</p>
//         <button
//           onClick={handleGenerateQuote}
//           style={{
//             marginTop: '10px',
//             padding: '10px 20px',
//             background: '#007BFF',
//             color: 'white',
//             border: 'none',
//             borderRadius: '5px',
//             cursor: 'pointer',
//           }}
//         >
//           Generate Quote
//         </button>
//       </div>

//       {/* 3D Canvas */}
//       <Canvas>
//         <ambientLight intensity={0.5} />
//         <directionalLight position={[10, 10, 10]} />
//         <OrbitControls />
//         <Model color={color} />
//       </Canvas>
//     </div>
//   );
// };

// const App = () => {
//   return (
//     <Router>
//       <Routes>
//         <Route path="/" element={<HomePage />} />
//         <Route path="/quote" element={<QuotePage />} />
//       </Routes>
//     </Router>
//   );
// };

// export default App;









// // App.js
// import React, { useRef, useEffect, useState } from 'react';
// import { Canvas, useLoader } from '@react-three/fiber';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import { OrbitControls } from '@react-three/drei';
// import * as THREE from 'three';

// const PorteFenetre = ({ params }) => {
//   const gltf = useLoader(GLTFLoader, '/porte_fenetre.gltf');
//   const meshRef = useRef();

//   useEffect(() => {
//     if (gltf && gltf.scene) {
//       const node = gltf.scene.getObjectByName('PorteFenetre');
//       if (node) {
//         // Appliquer les paramètres pour ajuster l'échelle
//         const width = params.Param12 / 1000;  // Convertir mm en mètres
//         const height = params.Param14 / 1000;
//         const depth = params.Param19 / 1000;

//         node.scale.set(width / 2.15, height / 0.9, depth / 0.05); // Ajustez les valeurs de référence selon votre modèle initial
//       }
//     }
//   }, [gltf, params]);

//   return <primitive object={gltf.scene} />;
// };

// const App = () => {
//   const [params, setParams] = useState({
//     Param12: 2150,  // Largeur en mm
//     Param14: 900,   // Hauteur en mm
//     Param16: 1,     // Nombre de vantaux
//     Param19: 50,    // Épaisseur en mm
//     Param27: "4/20/4",  // Type de vitrage
//     Param40: 2150,  // Largeur (duplicata)
//     Param42: "ht",  // Type de dimension
//     Param45: 1,     // Nombre de vantaux (duplicata)
//     Param47: "vantail",  // Type de vantaux
//     Param53: "4Fe/20/4",  // Type de vitrage (duplicata)
//     Param59: 1181,  // Prix partiel
//     Param60: 7643852941,  // Prix partiel
//     Param61: "U",   // Unité
//     Param62: ""     // Autre paramètre
//   });

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setParams((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   return (
//     <div style={{ display: 'flex' }}>
//       <Canvas style={{ width: '80vw', height: '100vh' }}>
//         <ambientLight />
//         <pointLight position={[10, 10, 10]} />
//         <PorteFenetre params={params} />
//         <OrbitControls />
//       </Canvas>
//       <div style={{ padding: '20px', width: '20vw', overflowY: 'auto' }}>
//         <h2>Paramètres Modifiables</h2>
//         <label>
//           Paramètre 12 (Largeur en mm):
//           <input
//             type="number"
//             name="Param12"
//             value={params.Param12}
//             onChange={handleChange}
//           />
//         </label>
//         <br />
//         <label>
//           Paramètre 14 (Hauteur en mm):
//           <input
//             type="number"
//             name="Param14"
//             value={params.Param14}
//             onChange={handleChange}
//           />
//         </label>
//         <br />
//         <label>
//           Paramètre 19 (Épaisseur en mm):
//           <input
//             type="number"
//             name="Param19"
//             value={params.Param19}
//             onChange={handleChange}
//           />
//         </label>
//         <br />
//         {/* Ajoutez d'autres contrôles ici selon vos besoins */}
//         {/* Par exemple, des sélecteurs pour Param27, Param42, etc. */}
//       </div>
//     </div>
//   );
// };

// export default App;










// import React, { useRef, useEffect, useState } from 'react';
// import { Canvas, useLoader } from '@react-three/fiber';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import { OrbitControls, TransformControls } from '@react-three/drei';
// import { Routes, Route, useNavigate } from 'react-router-dom';
// import FullQuote from './pages/FullQuote';
// import './App.css';

// type ObjectData = {
//     id: number;
//     url: string;
//     price: number;
//     details: string;
//     position: [number, number, number];
// };

// const GLTFObject: React.FC<{
//     id: number;
//     url: string;
//     position: [number, number, number];
//     onUpdatePosition: (id: number, position: [number, number, number]) => void;
//     isMovable: boolean;
//     onClick: () => void;
// }> = ({ id, url, position, onUpdatePosition, isMovable, onClick }) => {
//     const { scene } = useLoader(GLTFLoader, url);

//     return (
//         <TransformControls
//             position={position}
//             enabled={isMovable}
//             mode="translate"
//             onObjectChange={(e) => {
//                 const updatedPosition: [number, number, number] = [
//                     e.target.position.x,
//                     e.target.position.y,
//                     e.target.position.z,
//                 ];
//                 onUpdatePosition(id, updatedPosition);
//             }}
//         >
//             <primitive
//                 object={scene}
//                 position={position}
//                 onClick={(event) => {
//                     event.stopPropagation(); // Prevent deselection when clicking an object
//                     onClick();
//                 }}
//             />
//         </TransformControls>
//     );
// };

// const MainPage: React.FC = () => {
//     const [objects, setObjects] = useState<ObjectData[]>([]);
//     const [quote, setQuote] = useState<ObjectData[]>([]);
//     const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);

//     const leftPanelRef = useRef<HTMLDivElement>(null);
//     const rightPanelRef = useRef<HTMLDivElement>(null);
//     const draggerRef = useRef<HTMLDivElement>(null);

//     const navigate = useNavigate();

//     useEffect(() => {
//         const dragger = draggerRef.current;
//         const leftPanel = leftPanelRef.current;
//         const rightPanel = rightPanelRef.current;

//         if (!dragger || !leftPanel || !rightPanel) return;

//         let isDragging = false;

//         const startDragging = () => {
//             isDragging = true;
//             document.body.style.cursor = 'col-resize';
//         };

//         const stopDragging = () => {
//             isDragging = false;
//             document.body.style.cursor = 'default';
//         };

//         const handleDragging = (e: MouseEvent) => {
//             if (!isDragging) return;

//             const containerWidth = leftPanel.parentElement?.offsetWidth || 0;
//             const dragPosition = e.clientX;

//             const newLeftWidth = Math.min(
//                 Math.max(100, dragPosition - leftPanel.offsetLeft),
//                 containerWidth - 100
//             );

//             leftPanel.style.flex = `0 0 ${newLeftWidth}px`;
//             rightPanel.style.flex = `0 0 ${containerWidth - newLeftWidth}px`;
//         };

//         dragger.addEventListener('mousedown', startDragging);
//         document.addEventListener('mouseup', stopDragging);
//         document.addEventListener('mousemove', handleDragging);

//         return () => {
//             dragger.removeEventListener('mousedown', startDragging);
//             document.removeEventListener('mouseup', stopDragging);
//             document.removeEventListener('mousemove', handleDragging);
//         };
//     }, []);

//     const handleAddObject = async (url: string) => {
//         try {
//             const loader = new GLTFLoader();
//             const gltf = await loader.loadAsync(url);

//             const extras = gltf.asset?.extras || {};
//             const price = extras.price || 0;
//             const details = extras.details || 'No details available';

//             const newObject: ObjectData = {
//                 id: Date.now(),
//                 url,
//                 price,
//                 details,
//                 position: [0, 0, 0], // Default position for new objects
//             };

//             setObjects([...objects, newObject]);
//             setQuote([...quote, newObject]);
//         } catch (error) {
//             console.error('Error loading GLTF file:', error);
//         }
//     };

//     const handleRemoveObject = (id: number) => {
//         setObjects(objects.filter((obj) => obj.id !== id));
//         setQuote(quote.filter((item) => item.id !== id));
//         if (selectedObjectId === id) {
//             setSelectedObjectId(null);
//         }
//     };

//     const handleUpdatePosition = (id: number, position: [number, number, number]) => {
//         setObjects((prevObjects) =>
//             prevObjects.map((obj) => (obj.id === id ? { ...obj, position } : obj))
//         );
//     };

//     const navigateToFullQuote = () => {
//         navigate('/full-quote', { state: { quote } });
//     };

//     return (
//         <div id="container">
//             <div ref={leftPanelRef} id="objects-panel">
//                 <button onClick={() => handleAddObject('/wall_with_door.gltf')}>Add Object 1</button>
//                 <button onClick={() => handleAddObject('/porte_fenetre.gltf')}>Add Object 2</button>
//                 <Canvas
//                     onClick={() => setSelectedObjectId(null)} // Deselect object when clicking on empty space
//                 >
//                     <ambientLight intensity={0.5} />
//                     <directionalLight position={[5, 5, 5]} />
//                     <OrbitControls />
//                     <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
//                         <planeGeometry args={[50, 50]} />
//                         <meshStandardMaterial color="lightgray" />
//                     </mesh>
//                     {objects.map((obj) => (
//                         <GLTFObject
//                             key={obj.id}
//                             id={obj.id}
//                             url={obj.url}
//                             position={obj.position}
//                             onUpdatePosition={handleUpdatePosition}
//                             isMovable={selectedObjectId === obj.id}
//                             onClick={() => setSelectedObjectId(obj.id)}
//                         />
//                     ))}
//                 </Canvas>
//             </div>
//             {selectedObjectId !== null && (
//                 <div className="controls" style={{ position: 'absolute', top: '10px', right: '10px' }}>
//                     <button
//                         onClick={() => handleRemoveObject(selectedObjectId)}
//                         style={{
//                             padding: '10px 20px',
//                             backgroundColor: '#FF5733',
//                             color: '#fff',
//                             border: 'none',
//                             borderRadius: '4px',
//                             cursor: 'pointer',
//                             marginRight: '10px',
//                         }}
//                     >
//                         Delete
//                     </button>
//                     <button
//                         onClick={() => setSelectedObjectId(selectedObjectId)}
//                         style={{
//                             padding: '10px 20px',
//                             backgroundColor: '#007BFF',
//                             color: '#fff',
//                             border: 'none',
//                             borderRadius: '4px',
//                             cursor: 'pointer',
//                         }}
//                     >
//                         Move
//                     </button>
//                 </div>
//             )}
//             <div ref={draggerRef} className="dragger"></div>
//             <div ref={rightPanelRef} id="quote-panel">
//                 <h2>Quote</h2>
//                 <ul>
//                     {quote.map((item) => (
//                         <li key={item.id}>
//                             {item.details}: {item.price} €
//                         </li>
//                     ))}
//                 </ul>
//                 <p>Total: {quote.reduce((sum, item) => sum + item.price, 0)} €</p>
//                 <button onClick={navigateToFullQuote}>Afficher Devis Complet</button>
//             </div>
//         </div>
//     );
// };

// function App() {
//     return (
//         <Routes>
//             <Route path="/" element={<MainPage />} />
//             <Route path="/full-quote" element={<FullQuote />} />
//         </Routes>
//     );
// }

// export default App;



import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import FullQuote from './pages/FullQuote';

function App() {
    return (
        <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/full-quote" element={<FullQuote />} />
        </Routes>
    );
}

export default App;
