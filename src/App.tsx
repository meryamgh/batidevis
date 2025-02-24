import { Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import FullQuote from './pages/FullQuote';
import Main from './pages/Main';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Main />} />
            <Route path="/maquette" element={<MainPage />} />
            <Route path="/full-quote" element={<FullQuote />} />
        </Routes>
    );
}

export default App;
