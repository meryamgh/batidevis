import { Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import FullQuote from './pages/FullQuote';
import Home from './pages/Home';

function App() {
    return (
        <Routes>
            <Route path="/maquette" element={<MainPage />} />
            <Route path="/full-quote" element={<FullQuote />} />
            <Route path="/" element={<Home />} />
        </Routes>
    );
}

export default App;
