import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#111827',
          }}
        >
          <div
            className="card"
            style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}
          >
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
              Что-то пошло не так
            </h1>
            <p className="text-gray" style={{ marginBottom: '16px' }}>
              Экран восстановить не удалось, но приложение не завершило работу полностью.
            </p>
            <button className="btn-primary" onClick={this.handleReload}>
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
