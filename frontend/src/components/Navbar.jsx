import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isCustomer = user?.role === 'CUSTOMER';

  return (
    <nav style={{
      background: '#1C1C1C',
      borderBottom: '1px solid #2A2A2A',
      padding: '0 24px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: '16px',
    }}>
      {/* Logo + Customer nav buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <Link to="/" style={{
          fontWeight: 800,
          fontSize: '20px',
          color: '#FFD600',
          letterSpacing: '-0.5px',
          marginRight: '8px',
        }}>Флагман</Link>

        {isCustomer && (
          <>
            <Link to="/shops">
              <button style={{
                background: '#FFD600',
                color: '#1C1C1C',
                borderRadius: '20px',
                padding: '7px 18px',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}>Заказать</button>
            </Link>
            <Link to="/orders">
              <button style={{
                background: 'transparent',
                color: '#FFFFFF',
                borderRadius: '20px',
                padding: '7px 18px',
                fontSize: '14px',
                fontWeight: 600,
                border: '1px solid #3A3A3A',
                cursor: 'pointer',
              }}>Мои заказы</button>
            </Link>
          </>
        )}

        {user?.role === 'COURIER' && (
          <>
            <Link to="/courier" style={{ color: '#CCCCCC', fontSize: '14px', fontWeight: 500 }}>Смена</Link>
            <Link to="/courier/orders" style={{ color: '#CCCCCC', fontSize: '14px', fontWeight: 500, marginLeft: '16px' }}>Заказы</Link>
            <Link to="/courier/active" style={{ color: '#CCCCCC', fontSize: '14px', fontWeight: 500, marginLeft: '16px' }}>Активный</Link>
          </>
        )}

        {user?.role === 'BUSINESS' && (
          <>
            <Link to="/business" style={{ color: '#CCCCCC', fontSize: '14px', fontWeight: 500 }}>Заказы</Link>
            <Link to="/business/products" style={{ color: '#CCCCCC', fontSize: '14px', fontWeight: 500, marginLeft: '16px' }}>Меню</Link>
            <Link to="/business/settings" style={{ color: '#CCCCCC', fontSize: '14px', fontWeight: 500, marginLeft: '16px' }}>Настройки</Link>
            <Link to="/business/stats" style={{ color: '#CCCCCC', fontSize: '14px', fontWeight: 500, marginLeft: '16px' }}>Аналитика</Link>
          </>
        )}

        {user?.role === 'ADMIN' && (
          <>
            <Link to="/admin" style={{ color: '#CCCCCC', fontSize: '14px', fontWeight: 500 }}>Дашборд</Link>
            <Link to="/admin/users" style={{ color: '#CCCCCC', fontSize: '14px', fontWeight: 500, marginLeft: '16px' }}>Пользователи</Link>
            <Link to="/admin/businesses" style={{ color: '#CCCCCC', fontSize: '14px', fontWeight: 500, marginLeft: '16px' }}>Заведения</Link>
            <Link to="/admin/orders" style={{ color: '#CCCCCC', fontSize: '14px', fontWeight: 500, marginLeft: '16px' }}>Заказы</Link>
          </>
        )}

        {!user && (
          <>
            <Link to="/login" style={{ color: '#CCCCCC', fontSize: '14px', fontWeight: 500 }}>Войти</Link>
            <Link to="/register" style={{ color: '#CCCCCC', fontSize: '14px', fontWeight: 500, marginLeft: '16px' }}>Регистрация</Link>
          </>
        )}
      </div>

      {/* Right side */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#3A3A3A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            fontWeight: 700,
            color: '#FFD600',
            flexShrink: 0,
          }}>
            {(user.name || user.email || '?')[0].toUpperCase()}
          </div>
          <span style={{ fontSize: '13px', color: '#9E9E9E', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name || user.email}
          </span>
          <button onClick={handleLogout} style={{
            background: 'transparent',
            color: '#9E9E9E',
            border: '1px solid #3A3A3A',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}>Выйти</button>
        </div>
      )}
    </nav>
  );
}
