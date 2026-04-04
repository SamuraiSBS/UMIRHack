import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
    setMenuOpen(false);
  }

  const isCustomer = user?.role === 'CUSTOMER';
  const location = useLocation();

  // Count total items in all carts from localStorage
  const [cartCount, setCartCount] = useState(0);
  useEffect(() => {
    if (!isCustomer) return;
    function countCart() {
      let total = 0;
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('cart_')) {
          try {
            const cart = JSON.parse(localStorage.getItem(key) || '{}');
            total += Object.values(cart).reduce((s, v) => s + v, 0);
          } catch { /* skip */ }
        }
      }
      setCartCount(total);
    }
    countCart();
    window.addEventListener('storage', countCart);
    // Poll on route change to catch in-page updates
    const interval = setInterval(countCart, 1000);
    return () => { window.removeEventListener('storage', countCart); clearInterval(interval); };
  }, [isCustomer, location.pathname]);

  // Build nav links based on role
  const navLinks = [];
  if (isCustomer) {
    navLinks.push({ to: '/shops', label: 'Заказать', primary: true });
    navLinks.push({ to: '/orders', label: 'Мои заказы' });
  } else if (user?.role === 'COURIER') {
    navLinks.push({ to: '/courier', label: 'Смена' });
    navLinks.push({ to: '/courier/orders', label: 'Заказы' });
    navLinks.push({ to: '/courier/active', label: 'Активный' });
  } else if (user?.role === 'BUSINESS') {
    navLinks.push({ to: '/business', label: 'Заказы' });
    navLinks.push({ to: '/business/products', label: 'Меню' });
    navLinks.push({ to: '/business/settings', label: 'Настройки' });
    navLinks.push({ to: '/business/stats', label: 'Аналитика' });
  } else if (user?.role === 'ADMIN') {
    navLinks.push({ to: '/admin', label: 'Дашборд' });
    navLinks.push({ to: '/admin/users', label: 'Пользователи' });
    navLinks.push({ to: '/admin/businesses', label: 'Заведения' });
    navLinks.push({ to: '/admin/orders', label: 'Заказы' });
  } else if (!user) {
    navLinks.push({ to: '/login', label: 'Войти' });
    navLinks.push({ to: '/register', label: 'Регистрация' });
  }

  return (
    <>
      <nav style={{
        background: '#1C1C1C',
        borderBottom: '1px solid #2A2A2A',
        padding: '0 20px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        gap: '12px',
      }}>
        {/* Left: logo + desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <Link to="/" style={{
            fontWeight: 800,
            fontSize: '20px',
            color: '#FFD600',
            letterSpacing: '-0.5px',
            marginRight: '4px',
            flexShrink: 0,
          }}>Флагман</Link>

          {/* Desktop links */}
          <div className="nav-links">
            {isCustomer ? (
              <>
                <Link to="/shops">
                  <button style={{
                    background: '#FFD600', color: '#1C1C1C',
                    borderRadius: '20px', padding: '7px 18px',
                    fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer',
                  }}>Заказать</button>
                </Link>
                <Link to="/orders">
                  <button style={{
                    background: 'transparent', color: '#FFFFFF',
                    borderRadius: '20px', padding: '7px 18px',
                    fontSize: '14px', fontWeight: 600, border: '1px solid #3A3A3A', cursor: 'pointer',
                  }}>Мои заказы</button>
                </Link>
              </>
            ) : navLinks.map((link, i) => (
              <Link key={link.to} to={link.to} style={{
                color: '#CCCCCC', fontSize: '14px', fontWeight: 500,
                marginLeft: i > 0 ? '16px' : 0,
              }}>{link.label}</Link>
            ))}
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {isCustomer && (
            <Link to="/cart" style={{ position: 'relative', flexShrink: 0 }}>
              <button style={{
                background: cartCount > 0 ? '#FFD600' : '#2A2A2A',
                color: cartCount > 0 ? '#1C1C1C' : '#9E9E9E',
                border: 'none', borderRadius: '10px',
                width: '40px', height: '36px',
                fontSize: '18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                transition: 'background 0.2s',
              }}>
                🛒
                {cartCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-6px', right: '-6px',
                    background: '#FF4444', color: '#FFFFFF',
                    borderRadius: '50%', width: '18px', height: '18px',
                    fontSize: '11px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{cartCount > 99 ? '99+' : cartCount}</span>
                )}
              </button>
            </Link>
          )}

          {user && (
            <>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: '#3A3A3A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', fontWeight: 700, color: '#FFD600', flexShrink: 0,
              }}>
                {(user.name || user.email || '?')[0].toUpperCase()}
              </div>
              <span style={{
                fontSize: '13px', color: '#9E9E9E',
                maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                display: 'var(--name-display, block)',
              }} className="nav-username">
                {user.name || user.email}
              </span>
              <button onClick={handleLogout} style={{
                background: 'transparent', color: '#9E9E9E',
                border: '1px solid #3A3A3A', borderRadius: '8px',
                padding: '6px 14px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              }}>Выйти</button>
            </>
          )}

          {/* Hamburger (mobile only) */}
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Меню"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      <div className={`nav-mobile-menu${menuOpen ? ' open' : ''}`}>
        {navLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-mobile-link${link.primary ? ' primary' : ''}`}
            onClick={() => setMenuOpen(false)}
          >{link.label}</Link>
        ))}
        {user && (
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent', color: '#f87171',
              border: '1px solid #3b0a0a', borderRadius: '8px',
              padding: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              marginTop: '8px',
            }}
          >Выйти</button>
        )}
      </div>
    </>
  );
}
