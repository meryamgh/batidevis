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
