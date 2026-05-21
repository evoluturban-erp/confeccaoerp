export default function EmConstrucao({ modulo }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '60vh', color: '#6b7280',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</div>
      <h2 style={{ margin: '0 0 0.5rem', color: '#374151', fontSize: '1.25rem' }}>
        {modulo || 'Módulo'} em construção
      </h2>
      <p style={{ margin: 0, fontSize: '0.9rem' }}>Esta página será implementada em breve.</p>
    </div>
  );
}
