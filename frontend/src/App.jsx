import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Customer pages
import BusinessList from './pages/customer/BusinessList';
import Menu from './pages/customer/Menu';
import MyOrders from './pages/customer/MyOrders';

// Courier pages
import ShiftControl from './pages/courier/ShiftControl';
import AvailableOrders from './pages/courier/AvailableOrders';
import ActiveOrder from './pages/courier/ActiveOrder';

// Business pages
import Dashboard from './pages/business/Dashboard';
import Products from './pages/business/Products';
import BusinessSettings from './pages/business/BusinessSettings';
import BusinessStats from './pages/business/BusinessStats';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBusinesses from './pages/admin/AdminBusinesses';
import AdminOrders from './pages/admin/AdminOrders';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'COURIER') return <Navigate to="/courier" replace />;
  if (user.role === 'BUSINESS') return <Navigate to="/business" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/shops" replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Customer routes */}
        <Route path="/shops" element={<ProtectedRoute roles={['CUSTOMER']}><BusinessList /></ProtectedRoute>} />
        <Route path="/shops/:id/menu" element={<ProtectedRoute roles={['CUSTOMER']}><Menu /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute roles={['CUSTOMER']}><MyOrders /></ProtectedRoute>} />

        {/* Courier routes */}
        <Route path="/courier" element={<ProtectedRoute roles={['COURIER']}><ShiftControl /></ProtectedRoute>} />
        <Route path="/courier/orders" element={<ProtectedRoute roles={['COURIER']}><AvailableOrders /></ProtectedRoute>} />
        <Route path="/courier/active" element={<ProtectedRoute roles={['COURIER']}><ActiveOrder /></ProtectedRoute>} />

        {/* Business routes */}
        <Route path="/business" element={<ProtectedRoute roles={['BUSINESS']}><Dashboard /></ProtectedRoute>} />
        <Route path="/business/products" element={<ProtectedRoute roles={['BUSINESS']}><Products /></ProtectedRoute>} />
        <Route path="/business/settings" element={<ProtectedRoute roles={['BUSINESS']}><BusinessSettings /></ProtectedRoute>} />
        <Route path="/business/stats" element={<ProtectedRoute roles={['BUSINESS']}><BusinessStats /></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/businesses" element={<ProtectedRoute roles={['ADMIN']}><AdminBusinesses /></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute roles={['ADMIN']}><AdminOrders /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
