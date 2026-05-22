import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'https://confeccaoerp-production.up.railway.app/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
};

// Usuários
export const usuariosService = {
  listar: (params) => api.get('/usuarios', { params }),
  buscar: (id) => api.get(`/usuarios/${id}`),
  criar: (data) => api.post('/usuarios', data),
  atualizar: (id, data) => api.put(`/usuarios/${id}`, data),
  deletar: (id) => api.delete(`/usuarios/${id}`),
  alterarSenha: (id, data) => api.patch(`/usuarios/${id}/senha`, data),
};

// Clientes
export const clientesService = {
  listar: (params) => api.get('/clientes', { params }),
  buscar: (id) => api.get(`/clientes/${id}`),
  criar: (data) => api.post('/clientes', data),
  atualizar: (id, data) => api.put(`/clientes/${id}`, data),
  deletar: (id) => api.delete(`/clientes/${id}`),
  buscarPorCpfCnpj: (doc) => api.get(`/clientes/documento/${doc}`),
};

// Fornecedores
export const fornecedoresService = {
  listar: (params) => api.get('/fornecedores', { params }),
  buscar: (id) => api.get(`/fornecedores/${id}`),
  criar: (data) => api.post('/fornecedores', data),
  atualizar: (id, data) => api.put(`/fornecedores/${id}`, data),
  deletar: (id) => api.delete(`/fornecedores/${id}`),
};

// Produtos
export const produtosService = {
  listar: (params) => api.get('/produtos', { params }),
  buscar: (id) => api.get(`/produtos/${id}`),
  criar: (data) => api.post('/produtos', data),
  atualizar: (id, data) => api.put(`/produtos/${id}`, data),
  deletar: (id) => api.delete(`/produtos/${id}`),
  listarCategorias: () => api.get('/produtos/categorias'),
  buscarEstoque: (id) => api.get(`/produtos/${id}/estoque`),
};

// Ordens de Produção
export const ordensProducaoService = {
  listar: (params) => api.get('/ordens-producao', { params }),
  buscar: (id) => api.get(`/ordens-producao/${id}`),
  criar: (data) => api.post('/ordens-producao', data),
  atualizar: (id, data) => api.put(`/ordens-producao/${id}`, data),
  deletar: (id) => api.delete(`/ordens-producao/${id}`),
  atualizarStatus: (id, status) => api.patch(`/ordens-producao/${id}/status`, { status }),
  listarItens: (id) => api.get(`/ordens-producao/${id}/itens`),
  adicionarItem: (id, item) => api.post(`/ordens-producao/${id}/itens`, item),
  removerItem: (id, itemId) => api.delete(`/ordens-producao/${id}/itens/${itemId}`),
};

// Pedidos de Venda
export const pedidosVendaService = {
  listar: (params) => api.get('/pedidos-venda', { params }),
  buscar: (id) => api.get(`/pedidos-venda/${id}`),
  criar: (data) => api.post('/pedidos-venda', data),
  atualizar: (id, data) => api.put(`/pedidos-venda/${id}`, data),
  deletar: (id) => api.delete(`/pedidos-venda/${id}`),
  atualizarStatus: (id, status) => api.patch(`/pedidos-venda/${id}/status`, { status }),
  adicionarItem: (id, item) => api.post(`/pedidos-venda/${id}/itens`, item),
  removerItem: (id, itemId) => api.delete(`/pedidos-venda/${id}/itens/${itemId}`),
  gerarNota: (id) => api.post(`/pedidos-venda/${id}/nota-fiscal`),
};

// Estoque
export const estoqueService = {
  listar: (params) => api.get('/estoque', { params }),
  buscar: (id) => api.get(`/estoque/${id}`),
  entrada: (data) => api.post('/estoque/entrada', data),
  saida: (data) => api.post('/estoque/saida', data),
  ajuste: (data) => api.post('/estoque/ajuste', data),
  historico: (produtoId, params) => api.get(`/estoque/${produtoId}/historico`, { params }),
  alertasMinimo: () => api.get('/estoque/alertas/minimo'),
};

// Financeiro
export const financeiroService = {
  // Contas a Receber
  listarReceber: (params) => api.get('/financeiro/receber', { params }),
  buscarReceber: (id) => api.get(`/financeiro/receber/${id}`),
  criarReceber: (data) => api.post('/financeiro/receber', data),
  baixarReceber: (id, data) => api.patch(`/financeiro/receber/${id}/baixa`, data),

  // Contas a Pagar
  listarPagar: (params) => api.get('/financeiro/pagar', { params }),
  buscarPagar: (id) => api.get(`/financeiro/pagar/${id}`),
  criarPagar: (data) => api.post('/financeiro/pagar', data),
  baixarPagar: (id, data) => api.patch(`/financeiro/pagar/${id}/baixa`, data),

  // Caixa
  abrirCaixa: (data) => api.post('/financeiro/caixa/abrir', data),
  fecharCaixa: (data) => api.post('/financeiro/caixa/fechar', data),
  saldoCaixa: () => api.get('/financeiro/caixa/saldo'),
  movimentosCaixa: (params) => api.get('/financeiro/caixa/movimentos', { params }),
};

// Relatórios
export const relatoriosService = {
  vendasPeriodo: (params) => api.get('/relatorios/vendas', { params }),
  producaoPeriodo: (params) => api.get('/relatorios/producao', { params }),
  estoquePosicao: () => api.get('/relatorios/estoque'),
  fluxoCaixa: (params) => api.get('/relatorios/fluxo-caixa', { params }),
  rankingProdutos: (params) => api.get('/relatorios/ranking-produtos', { params }),
  rankingClientes: (params) => api.get('/relatorios/ranking-clientes', { params }),
  inadimplentes: (params) => api.get('/relatorios/inadimplentes', { params }),
};

// Dashboard
export const dashboardService = {
  resumo: () => api.get('/dashboard/resumo'),
  graficosVendas: (params) => api.get('/dashboard/vendas', { params }),
  alertas: () => api.get('/dashboard/alertas'),
};

export default api;
