import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const styles = {
  nav: {
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 16px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  logo: { fontWeight: 700, fontSize: '18px', color: '#2563eb' },
  links: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' },
  link: { fontSize: '14px', color: '#374151', fontWeight: 500 },
  btn: {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>Доставка</Link>

      <div style={styles.links}>
        {!user && (
          <>
            <Link to="/login" style={styles.link}>Войти</Link>
            <Link to="/register" style={styles.link}>Регистрация</Link>
          </>
        )}

        {user?.role === 'CUSTOMER' && (
          <>
            <Link to="/shops" style={styles.link}>Рестораны</Link>
            <Link to="/orders" style={styles.link}>Мои заказы</Link>
          </>
        )}

        {user?.role === 'COURIER' && (
          <>
            <Link to="/courier" style={styles.link}>Смена</Link>
            <Link to="/courier/orders" style={styles.link}>Заказы</Link>
            <Link to="/courier/active" style={styles.link}>Активный</Link>
          </>
        )}

        {user?.role === 'BUSINESS' && (
          <>
            <Link to="/business" style={styles.link}>Заказы</Link>
            <Link to="/business/products" style={styles.link}>Меню</Link>
            <Link to="/business/settings" style={styles.link}>Настройки</Link>
          </>
        )}

        {user?.role === 'ADMIN' && (
          <>
            <Link to="/admin" style={styles.link}>Дашборд</Link>
            <Link to="/admin/users" style={styles.link}>Пользователи</Link>
            <Link to="/admin/businesses" style={styles.link}>Заведения</Link>
            <Link to="/admin/orders" style={styles.link}>Заказы</Link>
          </>
        )}

        {user && (
          <>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>{user.name || user.email}</span>
            <button style={styles.btn} onClick={handleLogout}>Выйти</button>
          </>
        )}
      </div>
    </nav>
  );
}
