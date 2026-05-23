import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TopbarProvider, useTopbar } from '../context/TopbarContext';
import { canAccess, getHome } from '../config/permissions';

// ─── dados de menu ────────────────────────────────────────────────────────────

const MENU_SECTIONS = [
  {
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: '▦', exact: true },
    ],
  },
  {
    label: 'PRODUÇÃO',
    items: [
      { path: '/ordens-producao', label: 'Ordens de Produção', icon: '📋' },
      { path: '/kanban',          label: 'Kanban',             icon: '🗂' },
      { path: '/corte',           label: 'Corte',              icon: '✂' },
      { path: '/costura',         label: 'Costura',            icon: '🧵' },
      { path: '/acabamento',      label: 'Acabamento',         icon: '⚙' },
      { path: '/qualidade',       label: 'Qualidade',          icon: '✓' },
    ],
  },
  {
    label: 'ALMOXARIFADO',
    items: [
      { path: '/entrada-malha', label: 'Entrada de Malha', icon: '📦' },
      { path: '/estoque',       label: 'Estoque',          icon: '🏪' },
    ],
  },
  {
    label: 'COMERCIAL',
    items: [
      { path: '/clientes',     label: 'Clientes',    icon: '👥' },
      { path: '/fornecedores', label: 'Fornecedores', icon: '🏭' },
      { path: '/transporte',   label: 'Transporte',   icon: '🚚' },
      { path: '/etiquetas',    label: 'Etiquetas',    icon: '🏷' },
    ],
  },
  {
    label: 'FINANCEIRO',
    items: [
      { path: '/financeiro',  label: 'Financeiro',  icon: '💵' },
      { path: '/faturamento', label: 'Faturamento', icon: '📄' },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { path: '/relatorios', label: 'Relatórios', icon: '📊' },
      { path: '/usuarios',   label: 'Usuários',   icon: '👤' },
      { path: '/app-mobile', label: 'App Mobile', icon: '📱' },
    ],
  },
];

const PAGE_TITLES = Object.fromEntries(
  MENU_SECTIONS.flatMap((s) => s.items).map((i) => [i.path, i.label])
);

// ─── cores ────────────────────────────────────────────────────────────────────

const C = {
  sidebar:      '#071e0f',
  sidebarBorder:'rgba(255,255,255,0.07)',
  active:        'rgba(34,197,94,0.13)',
  activeBorder:  '#22c55e',
  activeText:    '#86efac',
  inactiveText:  'rgba(255,255,255,0.62)',
  sectionLabel:  'rgba(255,255,255,0.28)',
  hoverBg:       'rgba(255,255,255,0.05)',
};

const BREAKPOINT = 768;

// ─── hook: largura da janela ──────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < BREAKPOINT);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(nome) {
  if (!nome) return '?';
  const parts = nome.trim().split(' ').filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : nome.slice(0, 2).toUpperCase();
}

function isActive(item, pathname) {
  return item.exact ? pathname === item.path : pathname.startsWith(item.path);
}

// ─── RouteGuard ───────────────────────────────────────────────────────────────

function RouteGuard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    if (!canAccess(user.perfil, location.pathname)) {
      navigate(getHome(user.perfil), { replace: true });
    }
  }, [location.pathname, user, navigate]);

  return null;
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function Topbar({ onHamburger, isMobile }) {
  const { action } = useTopbar();
  const location = useLocation();

  const title = (() => {
    for (const [path, label] of Object.entries(PAGE_TITLES)) {
      if (location.pathname === path || location.pathname.startsWith(path + '/')) return label;
    }
    return 'ConfecçãoERP';
  })();

  const dataBr = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <header style={{
      height: '60px', flexShrink: 0,
      background: '#fff', borderBottom: '1px solid #e5e7eb',
      display: 'flex', alignItems: 'center',
      padding: '0 1rem 0 1.5rem', gap: '0.75rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* botão hamburguer — só em mobile */}
      {isMobile && (
        <button
          onClick={onHamburger}
          aria-label="Abrir menu"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', gap: '5px', padding: '6px 4px', flexShrink: 0,
          }}
        >
          <span style={{ display: 'block', width: 22, height: 2, background: '#374151', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 22, height: 2, background: '#374151', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 22, height: 2, background: '#374151', borderRadius: 2 }} />
        </button>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </h2>
        {!isMobile && (
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af', textTransform: 'capitalize' }}>
            {dataBr}
          </p>
        )}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: isMobile ? '0.45rem 0.875rem' : '0.5rem 1.125rem',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: isMobile ? '0.8rem' : '0.85rem', fontWeight: '600', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          + {action.label}
        </button>
      )}
    </header>
  );
}

// ─── MenuItem ─────────────────────────────────────────────────────────────────

function MenuItem({ item, onClick }) {
  const location = useLocation();
  const active = isActive(item, location.pathname);
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={item.path}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.625rem',
        padding: '0.55rem 1rem',
        color: active ? C.activeText : C.inactiveText,
        textDecoration: 'none',
        background: active ? C.active : hovered ? C.hoverBg : 'transparent',
        borderLeft: `3px solid ${active ? C.activeBorder : 'transparent'}`,
        fontSize: '0.855rem',
        transition: 'background 0.12s, color 0.12s',
        borderRadius: '0 6px 6px 0',
        marginRight: '6px',
      }}
    >
      <span style={{ fontSize: '0.9rem', lineHeight: 1, minWidth: '18px', textAlign: 'center' }}>{item.icon}</span>
      <span style={{ fontWeight: active ? '600' : '400' }}>{item.label}</span>
    </Link>
  );
}

// ─── SidebarContent ───────────────────────────────────────────────────────────

function SidebarContent({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const perfil = user?.perfil;

  const visibleSections = MENU_SECTIONS
    .map(section => ({
      ...section,
      items: section.items.filter(item => canAccess(perfil, item.path)),
    }))
    .filter(section => section.items.length > 0);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* logo */}
      <div style={{ padding: '1.125rem 1rem 1rem', borderBottom: `1px solid ${C.sidebarBorder}`, display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0, background: 'linear-gradient(135deg, #16a34a, #15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
          🧵
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#fff', lineHeight: 1.2 }}>ConfecçãoERP</p>
          <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>Gestão têxtil</p>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,.45)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
        )}
      </div>

      {/* navegação filtrada por perfil */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.625rem 0', scrollbarWidth: 'thin' }}>
        {visibleSections.map((section, si) => (
          <div key={si} style={{ marginBottom: '0.25rem' }}>
            {section.label && (
              <p style={{ margin: '0.75rem 1rem 0.3rem', fontSize: '0.65rem', fontWeight: '700', color: C.sectionLabel, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                {section.label}
              </p>
            )}
            {section.items.map((item) => (
              <MenuItem key={item.path} item={item} onClick={onClose} />
            ))}
          </div>
        ))}
      </nav>

      {/* rodapé do usuário */}
      <div style={{ borderTop: `1px solid ${C.sidebarBorder}`, padding: '0.875rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #16a34a, #15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700', color: '#fff' }}>
            {initials(user?.nome || user?.name || '')}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.nome || user?.name || 'Usuário'}
            </p>
            <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>{perfil || 'Operador'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ width: '100%', padding: '0.4rem 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', cursor: 'pointer', transition: 'background 0.12s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        >
          Sair da conta
        </button>
      </div>
    </>
  );
}

// ─── Sidebar desktop ──────────────────────────────────────────────────────────

function Sidebar() {
  return (
    <aside style={{ width: '210px', flexShrink: 0, background: C.sidebar, borderRight: `1px solid ${C.sidebarBorder}`, display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
      <SidebarContent onClose={null} />
    </aside>
  );
}

// ─── Drawer mobile (overlay) ──────────────────────────────────────────────────

function MobileDrawer({ open, onClose }) {
  // fecha ao apertar Escape
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 900, backdropFilter: 'blur(2px)' }}
      />
      {/* drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
        background: C.sidebar, borderRight: `1px solid ${C.sidebarBorder}`,
        display: 'flex', flexDirection: 'column', zIndex: 901,
        boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
        animation: 'slideIn .2s ease',
      }}>
        <SidebarContent onClose={onClose} />
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout({ children }) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // fecha drawer ao navegar
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  return (
    <TopbarProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>

        {/* sidebar fixa — só desktop */}
        {!isMobile && <Sidebar />}

        {/* drawer overlay — só mobile */}
        {isMobile && <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <RouteGuard />
          <Topbar isMobile={isMobile} onHamburger={() => setDrawerOpen(v => !v)} />
          <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1rem' : '1.5rem' }}>
            {children}
          </main>
        </div>
      </div>
    </TopbarProvider>
  );
}
