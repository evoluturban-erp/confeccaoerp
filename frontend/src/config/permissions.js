// Configuração central de permissões por perfil

const PROFILE_CONFIG = {
  Administrador: { home: '/dashboard', allowed: null,  blocked: [] },
  Gerente:       { home: '/dashboard', allowed: null,  blocked: ['/usuarios'] },
  Transportador: { home: '/transporte', allowed: ['/transporte', '/app-mobile'], blocked: [] },
  Faccao:        { home: '/costura',   allowed: ['/costura', '/qualidade'],      blocked: [] },
  Revisora:      { home: '/qualidade', allowed: ['/qualidade'],                  blocked: [] },
};

export function getHome(perfil) {
  return PROFILE_CONFIG[perfil]?.home ?? '/dashboard';
}

// Verifica se o perfil pode acessar o pathname
export function canAccess(perfil, pathname) {
  const cfg = PROFILE_CONFIG[perfil];
  if (!cfg) return false;

  if (cfg.blocked.some(b => pathname === b || pathname.startsWith(b + '/'))) return false;
  if (cfg.allowed === null) return true;
  return cfg.allowed.some(a => pathname === a || pathname.startsWith(a + '/'));
}
