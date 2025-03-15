import { Routes, Route } from 'react-router-dom';
import MaquettePage from './pages/MaquettePage';
import FullQuote from './pages/FullQuote';

function App() {
    return (
        <Routes>
            <Route path="/" element={<MaquettePage />} />
            <Route path="/full-quote" element={<FullQuote />} />
        </Routes>
    );
}

export default App;
