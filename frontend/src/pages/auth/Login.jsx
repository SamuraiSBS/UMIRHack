import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'COURIER') navigate('/courier');
      else if (user.role === 'BUSINESS') navigate('/business');
      else navigate('/shops');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Войти</h1>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Загрузка...' : 'Войти'}
          </button>
        </form>

        <p style={{ marginTop: '16px', fontSize: '14px', textAlign: 'center', color: '#6b7280' }}>
          Нет аккаунта? <Link to="/register" style={{ color: '#2563eb' }}>Зарегистрироваться</Link>
        </p>

        <div style={{ marginTop: '16px', padding: '12px', background: '#2A2A2A', borderRadius: '6px', fontSize: '12px', color: '#9E9E9E' }}>
          <strong style={{ color: '#CCCCCC' }}>Demo аккаунты:</strong><br />
          pizza@demo.com / demo123 (бизнес)<br />
          courier@demo.com / demo123 (курьер)<br />
          customer@demo.com / demo123 (покупатель)
        </div>
      </div>
    </div>
  );
}
