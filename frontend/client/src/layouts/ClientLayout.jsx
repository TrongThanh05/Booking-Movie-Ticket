/**
 * ClientLayout.jsx — Layout cho phía khách hàng
 * Bao gồm: Navbar + Outlet (nội dung trang) + Footer
 */
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ClientLayout = () => {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
};

export default ClientLayout;
