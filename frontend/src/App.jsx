import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';

const Dashboard      = lazy(() => import('./pages/Dashboard'));
const OrdensProducao = lazy(() => import('./pages/OrdensProducao'));
const Clientes       = lazy(() => import('./pages/Clientes'));
const Estoque        = lazy(() => import('./pages/Estoque'));
const EntradaMalha   = lazy(() => import('./pages/EntradaMalha'));
const Fornecedores   = lazy(() => import('./pages/Fornecedores'));
const Financeiro     = lazy(() => import('./pages/Financeiro'));
const Qualidade      = lazy(() => import('./pages/Qualidade'));
const Usuarios       = lazy(() => import('./pages/Usuarios'));
const Relatorios     = lazy(() => import('./pages/Relatorios'));
const Kanban         = lazy(() => import('./pages/Kanban'));
const AppMobile      = lazy(() => import('./pages/AppMobile'));
const Corte          = lazy(() => import('./pages/Corte'));
const Costura        = lazy(() => import('./pages/Costura'));
const Transporte     = lazy(() => import('./pages/Transporte'));
const Etiquetas      = lazy(() => import('./pages/Etiquetas'));
const Faturamento    = lazy(() => import('./pages/Faturamento'));

function PageLoad() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', color: '#9ca3af', fontSize: '0.9rem',
    }}>
      Carregando...
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* pública */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      {/* raiz */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* protegidas */}
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<PageLoad />}>
                <Routes>
                  {/* dashboard */}
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* produção */}
                  <Route path="/ordens-producao"   element={<OrdensProducao />} />
                  <Route path="/ordens-producao/*" element={<OrdensProducao />} />
                  <Route path="/kanban"            element={<Kanban />} />
                  <Route path="/corte"             element={<Corte />} />
                  <Route path="/corte/*"           element={<Corte />} />
                  <Route path="/costura"           element={<Costura />} />
                  <Route path="/costura/*"         element={<Costura />} />
                  <Route path="/qualidade"         element={<Qualidade />} />
                  <Route path="/qualidade/*"       element={<Qualidade />} />

                  {/* almoxarifado */}
                  <Route path="/entrada-malha"   element={<EntradaMalha />} />
                  <Route path="/entrada-malha/*" element={<EntradaMalha />} />
                  <Route path="/estoque"         element={<Estoque />} />
                  <Route path="/estoque/*"       element={<Estoque />} />

                  {/* comercial */}
                  <Route path="/clientes"      element={<Clientes />} />
                  <Route path="/clientes/*"    element={<Clientes />} />
                  <Route path="/fornecedores"  element={<Fornecedores />} />
                  <Route path="/fornecedores/*"element={<Fornecedores />} />
                  <Route path="/transporte"    element={<Transporte />} />
                  <Route path="/transporte/*"  element={<Transporte />} />
                  <Route path="/etiquetas"     element={<Etiquetas />} />
                  <Route path="/etiquetas/*"   element={<Etiquetas />} />

                  {/* financeiro */}
                  <Route path="/financeiro"       element={<Financeiro />} />
                  <Route path="/financeiro/*"     element={<Financeiro />} />
                  <Route path="/faturamento"      element={<Faturamento />} />
                  <Route path="/faturamento/*"    element={<Faturamento />} />
                  <Route path="/contas-receber"   element={<Financeiro />} />
                  <Route path="/contas-receber/*" element={<Financeiro />} />
                  <Route path="/contas-pagar"     element={<Financeiro />} />
                  <Route path="/contas-pagar/*"   element={<Financeiro />} />

                  {/* sistema */}
                  <Route path="/relatorios"   element={<Relatorios />} />
                  <Route path="/relatorios/*" element={<Relatorios />} />
                  <Route path="/usuarios"     element={<Usuarios />} />
                  <Route path="/usuarios/*"   element={<Usuarios />} />
                  <Route path="/app-mobile"   element={<AppMobile />} />

                  {/* fallback */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
