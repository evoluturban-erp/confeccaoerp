const GRUPOS = [
  {
    label: 'ADULTO PADRÃO',
    sizes: ['P', 'M', 'G', 'GG'],
    cor: { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },
  },
  {
    label: 'ADULTO EXTRA',
    sizes: ['PP', 'EXG', 'XGG'],
    cor: { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd' },
  },
  {
    label: 'ADULTO PLUS',
    sizes: ['G1', 'G2', 'G3', 'G4', 'G5'],
    cor: { bg: '#ffedd5', text: '#ea580c', border: '#fdba74' },
  },
  {
    label: 'INFANTIL',
    sizes: ['02', '04', '06', '08', '10', '12', '14', '16'],
    cor: { bg: '#cffafe', text: '#0891b2', border: '#67e8f9' },
  },
];

export const ALL_TAMANHOS = GRUPOS.flatMap(g => g.sizes);
export const DEFAULT_TAMANHOS = ['P', 'M', 'G', 'GG'];

export default function SeletorTamanhos({ selected, onChange }) {
  const toggle = (size) => {
    const next = selected.includes(size)
      ? selected.filter(s => s !== size)
      : [...selected, size];
    onChange(ALL_TAMANHOS.filter(s => next.includes(s)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: '.75rem', fontWeight: 600, color: '#374151' }}>Tamanhos da grade</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {GRUPOS.map(grupo => (
          <div key={grupo.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '.6rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              {grupo.label}
            </span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {grupo.sizes.map(size => {
                const on = selected.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggle(size)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: `1px solid ${on ? grupo.cor.border : '#e5e7eb'}`,
                      background: on ? grupo.cor.bg : '#f9fafb',
                      color: on ? grupo.cor.text : '#9ca3af',
                      fontSize: '.72rem',
                      fontWeight: on ? 700 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                    }}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
