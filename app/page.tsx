export default function HomePage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        Fiolet работает! 🚀
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
        Сайт успешно развернут
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <a 
          href="/onboarding" 
          style={{
            padding: '12px 24px',
            background: '#0070f3',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none'
          }}
        >
          Начать онбординг
        </a>
        <a 
          href="/feed" 
          style={{
            padding: '12px 24px',
            background: '#e5e7eb',
            color: '#333',
            borderRadius: '8px',
            textDecoration: 'none'
          }}
        >
          Перейти в ленту
        </a>
      </div>
    </div>
  );
}
