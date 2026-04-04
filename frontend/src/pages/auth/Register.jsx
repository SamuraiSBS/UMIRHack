import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'CUSTOMER', deliveryZone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(form.email, form.password, form.name, form.role, form.deliveryZone);
      if (user.role === 'COURIER') navigate('/courier');
      else if (user.role === 'BUSINESS') navigate('/business');
      else navigate('/shops');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>Регистрация</h1>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Имя</label>
            <input value={form.name} onChange={set('name')} placeholder="Иван Иванов" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input type="password" value={form.password} onChange={set('password')} required placeholder="Минимум 6 символов" minLength={6} />
          </div>
          <div className="form-group">
            <label>Роль</label>
            <select value={form.role} onChange={set('role')}>
              <option value="CUSTOMER">Покупатель</option>
              <option value="COURIER">Курьер</option>
              <option value="BUSINESS">Бизнес (ресторан/магазин)</option>
            </select>
          </div>
          {form.role === 'COURIER' && (
            <div className="form-group">
              <label>Зона доставки (район/адрес)</label>
              <input value={form.deliveryZone} onChange={set('deliveryZone')} placeholder="Например: Центральный район" />
            </div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Загрузка...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p style={{ marginTop: '16px', fontSize: '14px', textAlign: 'center', color: '#6b7280' }}>
          Уже есть аккаунт? <Link to="/login" style={{ color: '#2563eb' }}>Войти</Link>
        </p>
      </div>
    </div>
  );
}
