import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import '../styles/layout.scss';

export default function UsLayout(){
  return (
    <div className="user-theme">
      <Header variant="user" />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
