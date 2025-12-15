import './App.css';
import { Route, Routes } from 'react-router-dom';
import KakaoMap from './page/KakaoMap'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path='/' element={<KakaoMap/>}/>
      </Routes>
    </div>
  );
}

export default App;
