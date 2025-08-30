import { Routes, Route } from 'react-router-dom';
import MaquettePage from './pages/MaquettePage';
import FullQuote from './pages/FullQuote';
import Home from './pages/Home';
import Tarifs from './pages/Tarifs';
import Connexion from './pages/Connexion'
import MesDevisFactures from './pages/MesDevisFactures'
import Profil from './pages/Profil';
import AuthCallback from './pages/AuthCallback';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/maquette" element={<MaquettePage />} />
                <Route path="/full-quote" element={<FullQuote />} />
                <Route path="/" element={<Home />} />
                <Route path="/tarifs" element={<Tarifs />} />
                <Route path="/connexion" element={<Connexion />} />
                <Route path="/mes-devis-factures" element={
                    <ProtectedRoute>
                        <MesDevisFactures />
                    </ProtectedRoute>
                } />
                <Route path="/profil" element={<Profil />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
            </Routes>
        </AuthProvider>
    );
}

export default App;
