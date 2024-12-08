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
