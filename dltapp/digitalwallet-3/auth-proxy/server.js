import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/token', async (req, res) => {
  try {
    // Auth0 expects application/x-www-form-urlencoded for the token endpoint
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: process.env.AUTH0_AUDIENCE,
    }).toString();
  console.log(`${process.env.AUTH0_DOMAIN}/oauth/token`);
    const response = await axios.post(`${process.env.AUTH0_DOMAIN}/oauth/token`, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    res.json(response.data);
  } catch (err) {
    // Log full context for debugging: message, upstream status and body
    console.error('Token request error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    // Forward upstream status/body when available to aid debugging in dev.
    const upstreamStatus = err.response?.status || 500
    const upstreamBody = err.response?.data || { error: 'Token request failed', message: err.message }
    res.status(upstreamStatus).json(upstreamBody)
  }
});

// GET /api/contracts - List or search contracts with optional query params
// Supports: ?status=active&type=erc20&page=1&limit=10 etc.
app.get('/api/getContracts', async (req, res) => {
  try {
    const upstreamBase = process.env.WALLET_SERVICE_URL;
      console.log("get contracs");;
    // If configured, proxy to the upstream wallet service
    if (upstreamBase) {
      // Allow caller to provide an address via query, otherwise fallback to configured CONTRACT_ADDRESS
      const address =  process.env.LBG_CONTRACT_ADDRESS;
      if (!address) {
        return res.status(500).json({ error: 'Contract address not configured on server and not provided as query parameter (address)' });
      }

      const url = `${upstreamBase.replace(/\/$/, '')}/getContract/${encodeURIComponent(address)}`;

      console.log(url);
      const headers = {};
      
      // Forward authorization header if present
      if (req.headers.authorization) {
        headers.Authorization = req.headers.authorization;
      }

      // Forward query params to upstream service
      const response = await axios.get(url, { 
        headers
      });
      return res.json(response.data);
    }

    // Mock response for development
    return res.json({
      contracts: [
        {
          id: 'contract1',
          address: '0x123...abc',
          type: 'ERC20',
          name: 'Sample Token',
          symbol: 'STKN',
          status: 'active',
          deployedAt: new Date().toISOString()
        }
      ],
      pagination: {
        total: 1,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      }
    });
  } catch (err) {
    console.error('Contracts request error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { 
      error: 'Failed to fetch contracts', 
      message: err.message 
    };
    res.status(upstreamStatus).json(upstreamBody);
  }
});

// GET /api/wallets/balance
// If WALLET_SERVICE_URL is configured, proxy the request to that service and forward
// the Authorization header if provided. Otherwise return a safe mock response so
// the frontend can work in local/dev without an upstream service.
app.post('/api/deploy', async (req, res) => {
  try {
    const upstreamBase = process.env.WALLET_SERVICE_URL;
    const walletAddress = process.env.WALLET_ADDRESS; // Get wallet address from server env

    if (!walletAddress) {
      return res.status(500).json({ error: 'Wallet address not configured on server' });
    }

    // Add wallet address to the existing params array
    const contractData = {
      ...req.body,
      params: [...req.body.params, walletAddress]
    };

    console.log(walletAddress);
    console.log(contractData);

    if (upstreamBase) {
      const url = `${upstreamBase.replace(/\/$/, '')}/deploy`;
      const headers = {};
      
      if (req.headers.authorization) {
        headers.Authorization = req.headers.authorization;
      }

      const response = await axios.post(url, contractData, { headers });
      return res.json(response.data);
    }
    console.log(res);

    // Mock response for development
    return res.json({ 
      status: 'success',
      message: 'Contract deployment initiated',
      contractAddress: '0x...'
    });
  } catch (err) {
    console.error('Contract deployment error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { 
      error: 'Failed to deploy contract', 
      message: err.message 
    };
    res.status(upstreamStatus).json(upstreamBody);
  }
});

// Helper function to fetch request status by requestId
async function fetchRequestStatus(upstreamBase, requestId, headers) {
  console.log("in fetch request status");
  const followupUrl = `${upstreamBase.replace(/\/$/, '')}/request/${encodeURIComponent(requestId)}`;
  console.log('Making follow-up request to:', followupUrl);
  try {
    const followupResp = await axios.get(followupUrl, { headers });
    console.log('Follow-up response:', followupResp.data);
    return { status: followupResp.status, data: followupResp.data };
  } catch (followupErr) {
    console.error('Follow-up request error:', {
      message: followupErr.message,
      status: followupErr.response?.status,
      data: followupErr.response?.data,
    });
    return {
      success: false,
      status: followupErr.response?.status,
      error: {
        message: followupErr.message,
        status: followupErr.response?.status,
        data: followupErr.response?.data,
      }
    };
  }
}

// POST /transfer (and /api/transfer)
// Accepts { amount } from the client, inserts the server-side WALLET_ADDRESS
// as the `to` field and forwards to the upstream transfer endpoint when
// WALLET_SERVICE_URL is configured. Forwards Authorization header if present.
app.post('/api/transfer', async (req, res) => {
  try {

    const upstreamBase = process.env.WALLET_SERVICE_URL;
    // Expect contractAddress, to and amount from client
    const {  amount } = req.body || {};
    const contractAddress = process.env.LBG_CONTRACT_ADDRESS;
   const to = process.env.JUDGE_WALLET_ADDRESS;
 
    if (!contractAddress) {
      return res.status(400).json({ error: 'contractAddress is required' });
    }
    if (!to) {
      return res.status(400).json({ error: 'Recipient (to) is required in request body' });
    }
    // if (amount === undefined || amount === null) {
    //   return res.status(400).json({ error: 'Amount is required' });
    // }

    // Build target URL using contractAddress
     const url = `${upstreamBase.replace(/\/$/, '')}/contract/${encodeURIComponent(contractAddress)}/method/transfer`;
     console.log(url);
   
    // Forward authorization header if present; otherwise reject since upstream likely requires auth
    const headers = {
      'Content-Type': 'application/json'
    };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    } else if (req.headers['x-access-token']) {
      headers.Authorization = `Bearer ${req.headers['x-access-token']}`;
    }

    const payload = { "params": [ to, amount ]};


    const response = await axios.post(url, payload, { headers });
    console.log('Blockchain API response for transwfr:', response.data);
    // If response is 200, pick requestId and make another API call

  if (response.data && response.data.requestId) {
      const requestId = response.data.requestId;
      // Poll every 20 seconds until terminal state (SUCCESS or FAILURE)
      const POLL_INTERVAL_MS = 20000; // 20 seconds
      const MAX_ATTEMPTS = parseInt(process.env.BUY_POLL_MAX_ATTEMPTS || '15', 10); // configurable via env

      let attempt = 0;
      let lastFollowup = null;
      console.log("attempt", attempt );

      while (attempt < MAX_ATTEMPTS) {
        // wait before each follow-up (first wait 40s)
        console.log(attempt);
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        try {
          const followupResult = await fetchRequestStatus(upstreamBase, requestId, headers);
          console.log('transfer api  followUpResult', followupResult);
          lastFollowup = followupResult;
          console.log(followupResult);
          if (followupResult && followupResult.data && followupResult.data.requestStatus) {
            const status = String(followupResult.data.requestStatus).toUpperCase();
            if (status === 'SUCCESS' || status === 'FAILURE') {
              return res.json({ requestId, requestStatus: followupResult.data.requestStatus });
            }
          }
        } catch (pollErr) {
          console.error('Error while polling buyTokens status:', pollErr);
          // continue to next attempt
        }

        attempt += 1;
      }

      // After polling attempts exhausted, return last known status or error
      if (lastFollowup && lastFollowup.data && lastFollowup.data.requestStatus) {
        return res.json({ requestId, requestStatus: lastFollowup.data.requestStatus });
      }

      return res.status(500).json({ error: 'Failed to fetch request status after polling', requestId, followupError: lastFollowup?.error || 'no-followup' });
    } else {
      return res.status(500).json({ error: 'transfer  did not return a requestId', data: response.data });
    }


  } catch (err) {
    console.error('Transfer (contract) request error:', {
      message: err.message,
      status: err.response?.status,
      statusCode: err.response?.statusCode,
      data: err.response?.data,
      fullError: err.response?.data?.error || err.response?.data
    });

    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { error: 'Transfer failed', message: err.message };
    res.status(upstreamStatus).json(upstreamBody);
  }
});

// POST /api/buyTokens
// Call upstream token-service to buy tokens using a configured contract and method
// Expects { params: [...] } in request body
app.post('/api/buyTokens', async (req, res) => {
  const { amount } = req.body || {};
  try {
    const upstreamBase = process.env.WALLET_SERVICE_URL;
    const contractAddress = process.env.TOKEN_SWAP_CONTRACT_ADDRESS;
    const methodName = process.env.BUY_METHOD;

    if (!upstreamBase) {
      return res.status(500).json({ error: 'WALLET_SERVICE_URL not configured on server' });
    }
    if (!contractAddress) {
      return res.status(500).json({ error: 'TOKEN_SWAP_CONTRACT_ADDRESS not configured on server' });
    }
    if (!methodName) {
      return res.status(500).json({ error: 'BUY_METHOD not configured on server' });
    }

    const url = `${upstreamBase}/contract/${encodeURIComponent(contractAddress)}/method/${encodeURIComponent(methodName)}`;
    console.log('Buy tokens URL:', url);

    // Build headers with authorization if present
    const headers = {
      'Content-Type': 'application/json'
    };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    } else if (req.headers['x-access-token']) {
      headers.Authorization = `Bearer ${req.headers['x-access-token']}`;
    }

    // Forward params from request body, default to empty object
    const payload = { "params": [ process.env.WALLET_ADDRESS, process.env.MMF_TOKEN_WALLET_ADDRESS, amount ]};
    console.log('Buy tokens payload:', payload);

    const response = await axios.post(url, payload, { headers });
    console.log('Buy tokens response:', response.data);
    
    // If response is 200, pick requestId and poll the request status repeatedly
    if (response.data && response.data.requestId) {
      const requestId = response.data.requestId;
      // Poll every 40 seconds until terminal state (SUCCESS or FAILURE)
      const POLL_INTERVAL_MS = 20000; // 40 seconds
      const MAX_ATTEMPTS = parseInt(process.env.BUY_POLL_MAX_ATTEMPTS || '15', 10); // configurable via env

      let attempt = 0;
      let lastFollowup = null;

      while (attempt < MAX_ATTEMPTS) {
        // wait before each follow-up (first wait 40s)
        console.log(attempt);
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        try {
          const followupResult = await fetchRequestStatus(upstreamBase, requestId, headers);
          console.log('buyTokens followUpResult', followupResult);
          lastFollowup = followupResult;
          console.log(followupResult);
          if (followupResult && followupResult.data && followupResult.data.requestStatus) {
            const status = String(followupResult.data.requestStatus).toUpperCase();
            if (status === 'SUCCESS' || status === 'FAILURE') {
              return res.json({ requestId, requestStatus: followupResult.data.requestStatus });
            }
          }
        } catch (pollErr) {
          console.error('Error while polling buyTokens status:', pollErr);
          // continue to next attempt
        }

        attempt += 1;
      }

      // After polling attempts exhausted, return last known status or error
      if (lastFollowup && lastFollowup.data && lastFollowup.data.requestStatus) {
        return res.json({ requestId, requestStatus: lastFollowup.data.requestStatus });
      }

      return res.status(500).json({ error: 'Failed to fetch request status after polling', requestId, followupError: lastFollowup?.error || 'no-followup' });
    } else {
      return res.status(500).json({ error: 'Buy tokens did not return a requestId', data: response.data });
    }
  } catch (err) {
    console.error('Buy tokens request error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { error: 'Buy tokens failed', message: err.message };
    res.status(upstreamStatus).json(upstreamBody);
  }
});

// POST /api/redeemTokens
// Call upstream token-service to redeem tokens using a configured contract and method
// Expects { amount } in request body
app.post('/api/redeemTokens', async (req, res) => {
  const { amount } = req.body || {};
  try {
    const upstreamBase = process.env.WALLET_SERVICE_URL;
    const contractAddress = process.env.TOKEN_SWAP_CONTRACT_ADDRESS;
    const methodName = process.env.REDEEM_METHOD;

    if (!upstreamBase) {
      return res.status(500).json({ error: 'WALLET_SERVICE_URL not configured on server' });
    }
    if (!contractAddress) {
      return res.status(500).json({ error: 'TOKEN_SWAP_CONTRACT_ADDRESS not configured on server' });
    }
    if (!methodName) {
      return res.status(500).json({ error: 'REDEEM_METHOD not configured on server' });
    }

    const url = `${upstreamBase}/contract/${encodeURIComponent(contractAddress)}/method/${encodeURIComponent(methodName)}`;
    console.log('Redeem tokens URL:', url);

    // Build headers with authorization if present
    const headers = {
      'Content-Type': 'application/json'
    };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    } else if (req.headers['x-access-token']) {
      headers.Authorization = `Bearer ${req.headers['x-access-token']}`;
    }

    // Build payload similar to buyTokens (wallet, token wallet, amount)
    const payload = { params: [ process.env.WALLET_ADDRESS, process.env.MMF_TOKEN_WALLET_ADDRESS, amount ] };
    console.log('Redeem tokens payload:', payload);

    const response = await axios.post(url, payload, { headers });
    console.log('Redeem tokens response:', response.data);

    // If response has requestId, poll status until terminal
    if (response.data && response.data.requestId) {
      const requestId = response.data.requestId;
      const POLL_INTERVAL_MS = 20000; // 40 seconds
      const MAX_ATTEMPTS = parseInt(process.env.BUY_POLL_MAX_ATTEMPTS || '15', 10);

      let attempt = 0;
      let lastFollowup = null;

      while (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        try {
          const followupResult = await fetchRequestStatus(upstreamBase, requestId, headers);
          console.log('redeemTokens followUpResult', followupResult);
          lastFollowup = followupResult;
          if (followupResult && followupResult.data && followupResult.data.requestStatus) {
            const status = String(followupResult.data.requestStatus).toUpperCase();
            if (status === 'SUCCESS' || status === 'FAILURE') {
              return res.json({ requestId, requestStatus: followupResult.data.requestStatus });
            }
          }
        } catch (pollErr) {
          console.error('Error while polling redeemTokens status:', pollErr);
        }
        attempt += 1;
      }

      if (lastFollowup && lastFollowup.data && lastFollowup.data.requestStatus) {
        return res.json({ requestId, requestStatus: lastFollowup.data.requestStatus });
      }

      return res.status(500).json({ error: 'Failed to fetch request status after polling', requestId, followupError: lastFollowup?.error || 'no-followup' });
    } else {
      return res.status(500).json({ error: 'Redeem tokens did not return a requestId', data: response.data });
    }
  } catch (err) {
    console.error('Redeem tokens request error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { error: 'Redeem tokens failed', message: err.message };
    res.status(upstreamStatus).json(upstreamBody);
  }
});

app.get('/api/wallets/balance', async (req, res) => {
  try {
    const upstreamBase = process.env.WALLET_SERVICE_URL;

    // The server cannot access browser sessionStorage. The client must send
    // the token (which it may read from sessionStorage) to this proxy.
    // Accept token from multiple places for flexibility:
    // - Authorization header (preferred)
    // - x-access-token header
    // - access_token in query string
    // - access_token in request body
    const headers = {};

    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    } else if (req.headers['x-access-token']) {
      headers.Authorization = `Bearer ${req.headers['x-access-token']}`;
    } else if (req.query && req.query.access_token) {
      headers.Authorization = `Bearer ${req.query.access_token}`;
    } else if (req.body && req.body.access_token) {
      headers.Authorization = `Bearer ${req.body.access_token}`;
    }

    if (upstreamBase) {
      const url = `${upstreamBase.replace(/\/$/, '')}/wallets/balance`;
      console.log('Proxying balance request to:', url);
      const response = await axios.get(url, { headers });
      return res.json(response.data);
    }

    // Fallback mock response (development friendly)
    return res.json({ balance: 0, currency: 'ETH' });
  } catch (err) {
    console.error('Balance request error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { error: 'Balance request failed', message: err.message };
    res.status(upstreamStatus).json(upstreamBody);
  }
});

// GET /api/getTokens - request token balance for a single contract (contract from env)
app.get('/api/wallet/tokens', async (req, res) => {
  try {
    
    const apiBase = process.env.ETHERSCAN_API_BASE || 'https://api.etherscan.io/v2/api';
    const apiKey = process.env.ETHERSCAN_API_KEY;
    const chainId = process.env.ETHERSCAN_CHAINID || '11155111';
    const tag = process.env.ETHERSCAN_TAG || 'latest';
  const address = req.query.address || process.env.WALLET_ADDRESS; // wallet address to query
  const contractAddress1 = process.env.LBG_CONTRACT_ADDRESS;
  const contractAddress2 = process.env.MMF_CONTRACT_ADDRESS;
 

    if (!apiKey) {
      return res.status(500).json({ error: 'ETHERSCAN_API_KEY not configured on server' });
    }
    if (!address) {
      return res.status(500).json({ error: 'WALLET_ADDRESS not configured on server or provided as query' });
    }
    if (!contractAddress1 && !contractAddress2) {
      return res.status(500).json({ error: 'No token contract addresses configured in env (LBG_CONTRACT_ADDRESS or MMF_CONTRACT_ADDRESS)' });
    }

    // Fire token balance requests in parallel for all configured contract addresses using Promise.allSettled
    const contractAddresses = [contractAddress1, contractAddress2].filter(Boolean);
    const promises = contractAddresses.map((contractAddress) => {
      const url = `${apiBase}?chainid=${encodeURIComponent(chainId)}&tag=${encodeURIComponent(tag)}&apikey=${encodeURIComponent(apiKey)}&module=account&action=tokenbalance&address=${encodeURIComponent(address)}&contractaddress=${encodeURIComponent(contractAddress)}`;

      return axios.get(url);
    });

    const settled = await Promise.allSettled(promises);
    const results = settled.map((r, idx) => {
      const contractAddress = contractAddresses[idx];
      if (r.status === 'fulfilled') {
        const resp = r.value;
        return { success: true, contractaddress: contractAddress, data: resp.data, status: resp.status };
      }
      // rejected
      const reason = r.reason;
      return { success: false, contractaddress: contractAddress, error: reason?.response?.data || reason?.message || String(reason), status: reason?.response?.status };
    });

    return res.json(results);
  } catch (err) {
    console.error('Get tokens request error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { error: 'Get tokens failed', message: err.message };
    res.status(upstreamStatus).json(upstreamBody);
  }
});


// GET /api/wallet/transactions - proxy to Etherscan tokentx endpoint for multiple contracts
app.get('/api/wallet/transactions', async (req, res) => {
  try {
    const apiBase = process.env.ETHERSCAN_API_BASE || 'https://api.etherscan.io/v2/api';
    const apiKey = process.env.ETHERSCAN_API_KEY;
    const chainId = process.env.ETHERSCAN_CHAINID || '11155111';
    const startblock = req.query.startblock || '0';
    const endblock = req.query.endblock || '9999999999';
    const page = req.query.page || '1';
    const offset = req.query.offset || '10';
    const sort = req.query.sort || 'desc';

    // Allow caller to pass address via query, otherwise fallback to env
    const address = req.query.address || process.env.WALLET_ADDRESS;

    // Support a single contract address: prefer query param, fallback to env
    const contractAddress = process.env.LBG_CONTRACT_ADDRESS;

    if (!apiKey) {
      return res.status(500).json({ error: 'ETHERSCAN_API_KEY not configured on server' });
    }
    if (!address) {
      return res.status(400).json({ error: 'address is required (query param or WALLET_ADDRESS env)' });
    }
    if (!contractAddress) {
      return res.status(500).json({ error: 'No token contract address configured (provide ?contractaddress or set TOKENS_CONTRACT_1 / CONTRACT_ADDRESS in env)' });
    }

    const url = `${apiBase}?chainid=${encodeURIComponent(chainId)}&apikey=${encodeURIComponent(apiKey)}&module=account&action=tokentx&startblock=${encodeURIComponent(startblock)}&endblock=${encodeURIComponent(endblock)}&page=${encodeURIComponent(page)}&offset=${encodeURIComponent(offset)}&sort=${encodeURIComponent(sort)}&address=${encodeURIComponent(address)}&contractaddress=${encodeURIComponent(contractAddress)}`;
    console.log('Transactions request URL:', url);

    const response = await axios.get(url);
    console.log('Transactions API response received for contract', contractAddress);
    return res.json({ success: true, contractaddress: contractAddress, data: response.data, status: response.status });
  } catch (err) {
    console.error('Transactions request error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { error: 'Transactions request failed', message: err.message };
    res.status(upstreamStatus).json(upstreamBody);
  }
});

// GET /api/exchangeRate
// Fetch exchange rate by calling the configured contract method
app.get('/api/exchangeRate', async (req, res) => {
  try {
    
    const upstreamBase = process.env.WALLET_SERVICE_URL;
    const contractAddress = process.env.EXCHANGE_RATE_CONTRACT_ADDRESS;
    const methodName = process.env.EXCHANGE_RATE_METHOD;

    if (!upstreamBase) {
      return res.status(500).json({ error: 'WALLET_SERVICE_URL not configured on server' });
    }
    if (!contractAddress) {
      return res.status(500).json({ error: 'EXCHANGE_RATE_CONTRACT_ADDRESS not configured on server' });
    }
    if (!methodName) {
      return res.status(500).json({ error: 'EXCHANGE_RATE_METHOD not configured on server' });
    }

    const url = `${upstreamBase}/contract/${encodeURIComponent(contractAddress)}/method/${encodeURIComponent(methodName)}`;
   

    // Build headers with authorization if present
    const headers = {
      'Content-Type': 'application/json'
    };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    } else if (req.headers['x-access-token']) {
      headers.Authorization = `Bearer ${req.headers['x-access-token']}`;
    }

    const response = await axios.get(url, { headers });
  
    return res.json(response.data);
  } catch (err) {
    console.error('Exchange rate request error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { error: 'Failed to fetch exchange rate', message: err.message };
    res.status(upstreamStatus).json(upstreamBody);
  }
});

app.get('/api/wallet/getAllWalletTransactions', async (req, res) => {
  try {
    console.log("in getAllWalletTransactions");
    const apiBase = process.env.ETHERSCAN_API_BASE || 'https://api.etherscan.io/v2/api';
    const apiKey = process.env.ETHERSCAN_API_KEY;
    const chainId = process.env.ETHERSCAN_CHAINID || '11155111';
    const startblock = req.query.startblock || '0';
    const endblock = req.query.endblock || '9999999999';
    const page = req.query.page || '1';
    const offset = req.query.offset || '10';
    const sort = req.query.sort || 'desc';

    // Contract address to filter transactions for (token transfers)
    const contractAddress = process.env.LBG_CONTRACT_ADDRESS;
    console.log("contractAddress", contractAddress);

    if (!apiKey) {
      return res.status(500).json({ error: 'ETHERSCAN_API_KEY not configured on server' });
    }
    if (!contractAddress) {
      return res.status(500).json({ error: 'No token contract address configured (set LBG_CONTRACT_ADDRESS in env)' });
    }

    // Read list of wallet addresses from env (comma-separated or JSON array)
    const rawList = process.env.WALLET_ADDRESS_LIST;
    console.log(rawList);
    if (!rawList) {
      return res.status(500).json({ error: 'WALLET_ADDRESS_LIST not configured on server' });
    }
    let addresses = [];
    try {
      if (rawList.trim().startsWith('[')) {
        addresses = JSON.parse(rawList);
      } else {
        addresses = rawList.split(',').map(s => s.trim()).filter(Boolean);
      }
    } catch (e) {
      return res.status(400).json({ error: 'Invalid WALLET_ADDRESS_LIST format. Use JSON array or comma-separated list.' });
    }
    if (addresses.length === 0) {
      return res.status(400).json({ error: 'WALLET_ADDRESS_LIST is empty' });
    }

    console.log(addresses)
    // Build requests in parallel for each wallet address
    const requests = addresses.map((address) => {
      const url = `${apiBase}?chainid=${encodeURIComponent(chainId)}&apikey=${encodeURIComponent(apiKey)}&module=account&action=tokentx&startblock=${encodeURIComponent(startblock)}&endblock=${encodeURIComponent(endblock)}&page=${encodeURIComponent(page)}&offset=${encodeURIComponent(offset)}&sort=${encodeURIComponent(sort)}&address=${encodeURIComponent(address)}&contractaddress=${encodeURIComponent(contractAddress)}`;
      console.log('Transactions request URL:', url);
      return axios.get(url)
        .then(resp => ({ success: true, address, contractaddress: contractAddress, data: resp.data, status: resp.status }))
        .catch(err => ({ success: false, address, contractaddress: contractAddress, error: err.response?.data || err.message, status: err.response?.status }));
    });

    const results = await Promise.all(requests);
    return res.json(results);
  } catch (err) {
    console.error('getAllWalletTransactions request error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { error: 'getAllWalletTransactions failed', message: err.message };
    res.status(upstreamStatus).json(upstreamBody);
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
