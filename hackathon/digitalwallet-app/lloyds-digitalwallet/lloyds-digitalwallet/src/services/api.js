import axios from 'axios';

const BASE_URL = 'http://localhost:4000';

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token expiry
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('token_type');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: () => api.post('/api/token'),
  logout: () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('token_type');
  }
};

export const walletAPI = {
  getBalance: () => api.get('/api/wallets/balance'),
  getTokens: (contractAddress) => {
    const params = {};
    
    if (contractAddress) {
      params.contractAddress = contractAddress;
    }
    return api.get('/api/wallet/tokens', { params });
  },
  getTransactions: () => api.get('/api/wallet/transactions'),
  // sendTransaction should call the proxy transfer endpoint which forwards to
  // the server-side /transfer handler (expects { contractAddress, to, amount })
  sendTransaction: (data) => api.post('/api/transfer', data),
  receiveTransaction: (data) => api.post('/api/wallet/receive', data),
  buyTokens: (params) => api.post('/api/buyTokens', params),
  redeemTokens: (params) => api.post('/api/redeemTokens', params), 
  mintTokens: (params) => api.post('/api/mint', params),
  executeTrade: (params) => api.post('/api/executeTrade', params),
  getExchangeRate: () => api.get('/api/exchangeRate'),
  getAllWalletsTransactions: () => api.get('/api/wallet/getAllWalletTransactions'),
  getAllWalletsTokens: () => api.get('/api/wallet/getAllWalletsTokens')
};


export const contractAPI = {
  deploy: (contractData) => api.post('/api/deploy', contractData),
  deployCustomContract: (contractData, config) => api.post('/api/deploy/custom-contract', contractData, config),
  list: ({ page = 1, size = 5 } = {}) => api.get('/api/getContracts', {
    params: { page, size }
  }),
  getDetails: (contractId) => api.get(`/api/contracts/${contractId}`),
  getRequestDetails: (requestId) => api.get(`/api/deployment-status/${requestId}`),
  getSwapContractConfig: () => api.get('/api/swap-contract-config'),
};

export default api;