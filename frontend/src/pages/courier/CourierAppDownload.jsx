export default function CourierAppDownload() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div className="card" style={{
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        padding: '40px 32px',
      }}>
        <p style={{ fontSize: '56px', marginBottom: '12px' }}>📱</p>

        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px', color: '#111827' }}>
          Используйте мобильное приложение
        </h1>

        <p style={{ color: '#6b7280', marginBottom: '28px', lineHeight: '1.6', fontSize: '15px' }}>
          Работа курьера доступна только в мобильном&nbsp;приложении.
          Скачайте APK на свой Android-телефон и войдите с теми же данными.
        </p>

        <a
          href="/courier-app.apk"
          download
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#2563eb',
            color: 'white',
            padding: '13px 28px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          <span>⬇️</span> Скачать приложение (APK)
        </a>

        <p style={{ marginTop: '16px', fontSize: '12px', color: '#9ca3af' }}>
          Требуется Android 8.0+. При установке разрешите установку из неизвестных источников.
        </p>
      </div>
    </div>
  );
}
