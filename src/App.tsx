import { Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import FullQuote from './pages/FullQuote';
import Home from './pages/Home';
import Tarifs from './pages/Tarifs';
import Connexion from './pages/Connexion'
import MesDevisFactures from './pages/MesDevisFactures'

function App() {
    return (
        <Routes>
            <Route path="/maquette" element={<MainPage />} />
            <Route path="/full-quote" element={<FullQuote />} />
            <Route path="/" element={<Home />} />
            <Route path="/tarifs" element={<Tarifs />} />
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/mes-devis-factures" element={<MesDevisFactures />} />
        </Routes>
    );
}

export default App;
