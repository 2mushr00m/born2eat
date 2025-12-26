import './App.css';
import { Route, Routes } from 'react-router-dom';
import KakaoMap from './page/KakaoMap';
import { ReviewCreatePayloadForm, ReviewUpdatePayloadForm } from './page/test';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<KakaoMap />} />
        <Route path="/create-test" element={<ReviewCreatePayloadForm />} />
        <Route path="/update-test" element={<ReviewUpdatePayloadForm />} />
      </Routes>
    </div>
  );
}

export default App;
