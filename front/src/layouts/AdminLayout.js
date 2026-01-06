import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AdSide from './components/AdSide';
import '../styles/layout.scss';

export default function AdLayout(){
  return (
    <div className="admin-theme">
      <Header variant="admin" />
      <main>
        <AdSide />
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
