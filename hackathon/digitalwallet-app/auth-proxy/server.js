import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import FormData from 'form-data';
import fs from 'fs';
import { initializeDatabase, saveMintTransaction, getMintTransactions } from './db.js';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

// Initialize database on startup
initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

// Simple in-memory cache for frequently accessed data
const cache = {
  exchangeRate: { data: null, timestamp: 0, ttl: 30000 }, // 30 second TTL
};

function getCachedData(key) {
  const item = cache[key];
  if (item && item.data && (Date.now() - item.timestamp) < item.ttl) {
    console.log(`Cache hit for ${key}`);
    return item.data;
  }
  return null;
}

function setCachedData(key, data) {
  if (cache[key]) {
    cache[key].data = data;
    cache[key].timestamp = Date.now();
    console.log(`Cached ${key} for ${cache[key].ttl}ms`);
  }
}

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
      // const address =  process.env.LBG_CONTRACT_ADDRESS;
      // if (!address) {
      //   return res.status(500).json({ error: 'Contract address not configured on server and not provided as query parameter (address)' });
      // }

      // Get page and size from query params
      const page = req.query.page || 1;
      const size = req.query.size || 15;

      const url = `${upstreamBase.replace(/\/$/, '')}/getContracts`;

      const headers = {};
      
      // Forward authorization header if present
      if (req.headers.authorization) {
        headers.Authorization = req.headers.authorization;
      }

      // Forward query params to upstream service
      const response = await axios.get(url, { 
        headers,
        params: {
          page,
          size,
          ...req.query // Forward any additional query params
        }
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

/**
 * deploy custom contract
 */

app.post('/api/deploy/custom-contract', upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    const { contractToDeploy, comments, contractType, swapContractAddress } = req.body;
    const file = req.file;

    if (!contractToDeploy) {
      return res.status(400).json({ error: 'contractToDeploy is required' });
    }

    if (!file) {
      return res.status(400).json({ error: 'Solidity file is required' });
    }

    const upstreamBase = process.env.WALLET_SERVICE_URL;
    const walletAddress = process.env.WALLET_ADDRESS; // Get wallet address from server env

    if (!walletAddress) {
      return res.status(500).json({ error: 'Wallet address not configured on server' });
    }


    filePath = file.path;
    const formData = new FormData();
    formData.append('contractToDeploy', contractToDeploy);
    formData.append('comments', comments || '');
    
    // For swap contracts, send params as individual strings
    if (contractType === 'swap') {
      console.log('swapContractAddress:', swapContractAddress);
      const mmfContractAddress = process.env.MMF_CONTRACT_ADDRESS;
      const exchangeRateContractAddress = process.env.EXCHANGE_RATE_CONTRACT_ADDRESS;
      
      if (!mmfContractAddress || !exchangeRateContractAddress) {
        return res.status(500).json({ 
          error: 'MMF_CONTRACT_ADDRESS and EXCHANGE_RATE_CONTRACT_ADDRESS must be configured for swap contracts' 
        });
      }
      
      // Send params as comma-separated string: swapContractAddress,MMF_CONTRACT_ADDRESS,EXCHANGE_RATE_CONTRACT_ADDRESS
      const params = `${swapContractAddress},${mmfContractAddress},${exchangeRateContractAddress}`;
      console.log('Swap contract params:', params);
      formData.append('params', params);
    }

    console.log(formData);
    
    formData.append('file', fs.createReadStream(file.path), {
      filename: file.originalname,
      contentType: 'application/octet-stream'
    });

    if (upstreamBase) {
      const url = `${upstreamBase.replace(/\/$/, '')}`;
      const headers = {};
      
      if (req.headers.authorization) {
        headers.Authorization = req.headers.authorization;
      }
      const response = await axios.post(
        `${url}/deploy/custom-contract`,
        formData,
        {
          headers
        }
      );
      console.log('Custom contract deployment response:', response.data);
      fs.unlinkSync(filePath);
      return res.json({ ...response.data, contractType });
    }
    return res.json({ 
      status: 'success',
      message: 'Contract deployment created',
      contractAddress: '0x...',
      contractType
    });

  } catch (err) {
    console.error('Custom contract deployment error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    // Clean up uploaded file in case of error
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.error('Error cleaning up file:', cleanupErr);
      }
    }

    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { 
      error: 'Failed to deploy custom contract', 
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

async function pollRequestStatus(upstreamBase, requestId, headers, maxRetries = 15, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Polling attempt ${attempt}/${maxRetries} for requestId: ${requestId}`);
    
    const result = await fetchRequestStatus(upstreamBase, requestId, headers);
    
    // If there's an error in the fetch itself, return the error
    if (result.error) {
      return result;
    }
    
    const requestStatus = result.data?.requestStatus;
    
    // If SUCCESS or any terminal status (FAILED, ERROR, etc.), return immediately
    if (requestStatus === 'SUCCESS' || 
        requestStatus === 'FAILED' || 
        requestStatus === 'ERROR' ||
        requestStatus === 'REJECTED') {
      console.log(`Terminal status reached: ${requestStatus}`);
      return result;
    }
    
    // If QUEUED or IN_PROGRESS and we haven't exhausted retries, wait and retry
    if (requestStatus === 'QUEUED' || requestStatus === 'IN_PROGRESS') {
      if (attempt < maxRetries) {
        // Use exponential backoff with cap: min(delayMs * attempt, 10000)
        const backoffDelay = Math.min(delayMs * attempt, 10000);
        console.log(`Status is ${requestStatus}, waiting ${backoffDelay}ms before retry (exponential backoff)...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        continue;
      } else {
        console.log(`Max retries reached, returning current status: ${requestStatus}`);
        return result;
      }
    }
    
    // For any other status, return the result
    return result;
  }
}

app.get('/api/deployment-status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    const upstreamBase = process.env.WALLET_SERVICE_URL;
    const walletAddress = process.env.WALLET_ADDRESS;

    if (!walletAddress) {
      return res.status(500).json({ error: 'Wallet address not configured on server' });
    }

    if (upstreamBase) {
      const headers = {};
      
      if (req.headers.authorization) {
        headers.Authorization = req.headers.authorization;
      }

      // Use polling function instead of single fetch
      const followupResult = await pollRequestStatus(upstreamBase, requestId, headers);
      
      if (followupResult && followupResult.data && followupResult.data.requestStatus) {
        return res.json({ 
          requestId, 
          requestStatus: followupResult.data.requestStatus,
          ...followupResult.data 
        });
      }
      
      // If we get here, something unexpected happened
      return res.status(500).json({ 
        error: 'Unexpected response format from upstream service' 
      });
    }

    return res.status(500).json({ error: 'Upstream service URL not configured' });

  } catch (err) {
    console.error('Deployment status error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { 
      error: 'Failed to fetch deployment status', 
      message: err.message 
    };
    res.status(upstreamStatus).json(upstreamBody);
  }
});

// POST /transfer (and /api/transfer)
// Accepts { amount } from the client, inserts the server-side WALLET_ADDRESS
// as the `to` field and forwards to the upstream transfer endpoint when
// WALLET_SERVICE_URL is configured. Forwards Authorization header if present.
app.post('/api/transfer', async (req, res) => {
  try {

    const upstreamBase = process.env.WALLET_SERVICE_URL;
    // Expect contractAddress, to and amount from client
    const {  amount, contractAddress } = req.body || {};
    // const contractAddress = req.body.contractAddress;
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
      // Poll with exponential backoff starting at 5 seconds
      const INITIAL_POLL_INTERVAL_MS = 5000; // Start at 5 seconds
      const MAX_ATTEMPTS = parseInt(process.env.BUY_POLL_MAX_ATTEMPTS || '15', 10); // configurable via env

      let attempt = 0;
      let lastFollowup = null;
      console.log("attempt", attempt );

      while (attempt < MAX_ATTEMPTS) {
        // Use exponential backoff: 5s, 10s, 15s, 20s (capped at 20s)
        const pollDelay = Math.min(INITIAL_POLL_INTERVAL_MS * (attempt + 1), 20000);
        console.log(attempt);
        await new Promise((r) => setTimeout(r, pollDelay));
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
  const { amount, swapContractAddress } = req.body || {};
  try {
    const upstreamBase = process.env.WALLET_SERVICE_URL;
    // Use swapContractAddress from request if provided, otherwise fall back to env
    const contractAddress = swapContractAddress 
    const methodName = process.env.BUY_METHOD;

    if (!upstreamBase) {
      return res.status(500).json({ error: 'WALLET_SERVICE_URL not configured on server' });
    }
    if (!contractAddress) {
      return res.status(500).json({ error: 'Swap contract address not provided and TOKEN_SWAP_CONTRACT_ADDRESS not configured on server' });
    }
    if (!methodName) {
      return res.status(500).json({ error: 'BUY_METHOD not configured on server' });
    }

    const url = `${upstreamBase}/contract/${encodeURIComponent(contractAddress)}/method/${encodeURIComponent(methodName)}`;
    console.log('Buy tokens URL:', url);
    console.log('Using swap contract address:', contractAddress);

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
      // Poll with exponential backoff starting at 5 seconds
      const INITIAL_POLL_INTERVAL_MS = 5000;
      const MAX_ATTEMPTS = parseInt(process.env.BUY_POLL_MAX_ATTEMPTS || '15', 10); // configurable via env

      let attempt = 0;
      let lastFollowup = null;

      while (attempt < MAX_ATTEMPTS) {
        // Use exponential backoff: 5s, 10s, 15s, 20s (capped at 20s)
        const pollDelay = Math.min(INITIAL_POLL_INTERVAL_MS * (attempt + 1), 20000);
        console.log(attempt);
        await new Promise((r) => setTimeout(r, pollDelay));
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

// POST /api/mint
// Call upstream token-service to mint tokens
// Expects { contractAddress, amount } in request body
// Makes TWO calls: one with WALLET_ADDRESS and another with MMF_TOKEN_WALLET_ADDRESS
app.post('/api/mint', async (req, res) => {
  try {
    const { contractAddress, amount } = req.body || {};
    
    console.log('Mint request received:', { contractAddress, amount });
    
    if (!contractAddress) {
      return res.status(400).json({ error: 'contractAddress is required' });
    }
    if (!amount) {
      return res.status(400).json({ error: 'amount is required' });
    }

    const upstreamBase = process.env.WALLET_SERVICE_URL;
    const walletAddress = process.env.WALLET_ADDRESS;
    const mmfTokenWalletAddress = process.env.MMF_TOKEN_WALLET_ADDRESS;
    const methodName = 'mint';

    console.log('Wallet addresses from env:', { walletAddress, mmfTokenWalletAddress });

    if (!upstreamBase) {
      return res.status(500).json({ error: 'WALLET_SERVICE_URL not configured on server' });
    }
    if (!walletAddress) {
      return res.status(500).json({ error: 'WALLET_ADDRESS not configured on server' });
    }
    if (!mmfTokenWalletAddress) {
      return res.status(500).json({ error: 'MMF_TOKEN_WALLET_ADDRESS not configured on server' });
    }

    const url = `${upstreamBase}/contract/${encodeURIComponent(contractAddress)}/method/${encodeURIComponent(methodName)}`;
    console.log('Mint tokens URL:', url);

    // Build headers with authorization if present
    const headers = {
      'Content-Type': 'application/json'
    };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    } else if (req.headers['x-access-token']) {
      headers.Authorization = `Bearer ${req.headers['x-access-token']}`;
    }

    // FIRST CALL: Mint with WALLET_ADDRESS
    const payload1 = { params: [walletAddress, amount] };
    console.log('Mint tokens payload 1 (WALLET_ADDRESS):', payload1);

    const response1 = await axios.post(url, payload1, { headers });
    console.log('Mint tokens response 1:', response1.data);

    // SECOND CALL: Mint with MMF_TOKEN_WALLET_ADDRESS
    const payload2 = { params: [mmfTokenWalletAddress, amount * 3] };
    console.log('Mint tokens payload 2 (MMF_TOKEN_WALLET_ADDRESS):', payload2);

    const response2 = await axios.post(url, payload2, { headers });
    console.log('Mint tokens response 2:', response2.data);

    // Poll for BOTH requests (we'll poll the first one for final response)
    const requestId1 = response1.data?.requestId;
    const requestId2 = response2.data?.requestId;

    if (!requestId1 || !requestId2) {
      return res.status(500).json({ 
        error: 'One or both mint calls did not return a requestId', 
        response1: response1.data,
        response2: response2.data
      });
    }

    const INITIAL_POLL_INTERVAL_MS = 5000;
    const MAX_ATTEMPTS = parseInt(process.env.MINT_POLL_MAX_ATTEMPTS || '15', 10);

    let attempt = 0;
    let lastFollowup1 = null;
    let lastFollowup2 = null;

    while (attempt < MAX_ATTEMPTS) {
      const pollDelay = Math.min(INITIAL_POLL_INTERVAL_MS * (attempt + 1), 20000);
      await new Promise((r) => setTimeout(r, pollDelay));
      try {
        // Poll both requests
        const followupResult1 = await fetchRequestStatus(upstreamBase, requestId1, headers);
        const followupResult2 = await fetchRequestStatus(upstreamBase, requestId2, headers);
        
        console.log('mint tokens followUpResult 1:', followupResult1);
        console.log('mint tokens followUpResult 2:', followupResult2);
        
        lastFollowup1 = followupResult1;
        lastFollowup2 = followupResult2;
        
        // Check if BOTH requests reached terminal status
        const status1 = String(followupResult1?.data?.requestStatus || '').toUpperCase();
        const status2 = String(followupResult2?.data?.requestStatus || '').toUpperCase();
        
        if ((status1 === 'SUCCESS' || status1 === 'FAILURE') && 
            (status2 === 'SUCCESS' || status2 === 'FAILURE')) {
          
          // Save mint transaction to PostgreSQL database (minimal fields)
          try {
            await saveMintTransaction({
              contractAddress,
              walletAddress,
              tokenSymbol: req.body.contractName || null,
              metadata: {
                mmfTokenWalletAddress,
                timestamp: new Date().toISOString()
              }
            });
            console.log('✅ Mint transaction saved to database');
          } catch (dbError) {
            console.error('❌ Failed to save mint transaction to database:', dbError);
            // Continue even if database save fails - don't block the response
          }
          
          return res.json({ 
            request1: { requestId: requestId1, requestStatus: followupResult1.data.requestStatus },
            request2: { requestId: requestId2, requestStatus: followupResult2.data.requestStatus },
            message: 'Both mint operations completed'
          });
        }
      } catch (pollErr) {
        console.error('Error while polling mint status:', pollErr);
      }
      attempt += 1;
    }

    // Return last known status for both requests
    if (lastFollowup1?.data?.requestStatus && lastFollowup2?.data?.requestStatus) {
      return res.json({ 
        request1: { requestId: requestId1, requestStatus: lastFollowup1.data.requestStatus },
        request2: { requestId: requestId2, requestStatus: lastFollowup2.data.requestStatus },
        message: 'Polling timeout - returning last known status'
      });
    }

    return res.status(500).json({ 
      error: 'Failed to fetch request status after polling', 
      requestId1,
      requestId2,
      followupError: 'no-followup' 
    });
  } catch (err) {
    console.error('Mint tokens request error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { error: 'Mint tokens failed', message: err.message };
    res.status(upstreamStatus).json(upstreamBody);
  }
});

// POST /api/redeemTokens
// Call upstream token-service to redeem tokens using a configured contract and method
// Expects { amount } in request body
app.post('/api/redeemTokens', async (req, res) => {
  const { amount, swapContractAddress } = req.body || {};
  try {
    const upstreamBase = process.env.WALLET_SERVICE_URL;
    // Use swapContractAddress from request if provided, otherwise fall back to env
    const contractAddress = swapContractAddress 
    const methodName = process.env.REDEEM_METHOD;

    if (!upstreamBase) {
      return res.status(500).json({ error: 'WALLET_SERVICE_URL not configured on server' });
    }
    if (!contractAddress) {
      return res.status(500).json({ error: 'Swap contract address not provided and TOKEN_SWAP_CONTRACT_ADDRESS not configured on server' });
    }
    if (!methodName) {
      return res.status(500).json({ error: 'REDEEM_METHOD not configured on server' });
    }

    const url = `${upstreamBase}/contract/${encodeURIComponent(contractAddress)}/method/${encodeURIComponent(methodName)}`;
    console.log('Redeem tokens URL:', url);
    console.log('Using swap contract address:', contractAddress);

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
      const INITIAL_POLL_INTERVAL_MS = 5000;
      const MAX_ATTEMPTS = parseInt(process.env.BUY_POLL_MAX_ATTEMPTS || '15', 10);

      let attempt = 0;
      let lastFollowup = null;

      while (attempt < MAX_ATTEMPTS) {
        const pollDelay = Math.min(INITIAL_POLL_INTERVAL_MS * (attempt + 1), 20000);
        await new Promise((r) => setTimeout(r, pollDelay));
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

app.post('/api/executeTrade', async (req, res) => {
  const { amount, swapContractAddress } = req.body || {};
  
  // Mock mode for testing - set to 'success' or 'failure' to test different scenarios
  const MOCK_MODE = process.env.EXECUTE_TRADE_MOCK_MODE; // 'success', 'failure', or undefined for real API
  
  // if (MOCK_MODE === 'success') {
  //   console.log('Mock success mode enabled for executeTrade');
  //   return res.json({ 
  //     requestId: 'mock-request-' + Date.now(), 
  //     requestStatus: 'SUCCESS',
  //     message: 'Trade executed successfully (mock)'
  //   });
  // }
  
  // if (MOCK_MODE === 'failure') {
  //   console.log('Mock failure mode enabled for executeTrade');
  //   return res.status(500).json({ 
  //     error: 'Trade execution failed (mock)',
  //     message: 'Insufficient balance',
  //     code: 'TRADE_FAILED'
  //   });
  // }
  
  try {
    const upstreamBase = process.env.WALLET_SERVICE_URL;
    // Use swapContractAddress from request if provided, otherwise fall back to env
    const contractAddress = swapContractAddress 
    const methodName = process.env.EXECUTE_TRADE_METHOD;

    if (!upstreamBase) {
      return res.status(500).json({ error: 'WALLET_SERVICE_URL not configured on server' });
    }
    if (!contractAddress) {
      return res.status(500).json({ error: 'Swap contract address not provided' });
    }
    if (!methodName) {
      return res.status(500).json({ error: 'EXECUTE_TRADE_METHOD not configured on server' });
    }

    const url = `${upstreamBase}/contract/${encodeURIComponent(contractAddress)}/method/${encodeURIComponent(methodName)}`;
    console.log('Execute trade URL:', url);
    console.log('Using swap contract address:', contractAddress);

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
    console.log('Execute trade payload:', payload);

    const response = await axios.post(url, payload, { headers });
    console.log('Execute trade response:', response.data);
    
    // If response is 200, pick requestId and poll the request status repeatedly
    if (response.data && response.data.requestId) {
      const requestId = response.data.requestId;
      // Poll with exponential backoff starting at 5 seconds
      const INITIAL_POLL_INTERVAL_MS = 5000;
      const MAX_ATTEMPTS = parseInt(process.env.EXECUTE_TRADE_POLL_MAX_ATTEMPTS || '15', 10);

      let attempt = 0;
      let lastFollowup = null;

      while (attempt < MAX_ATTEMPTS) {
        // Use exponential backoff: 5s, 10s, 15s, 20s (capped at 20s)
        const pollDelay = Math.min(INITIAL_POLL_INTERVAL_MS * (attempt + 1), 20000);
        console.log(`Execute trade polling attempt ${attempt + 1}/${MAX_ATTEMPTS} (waiting ${pollDelay}ms)`);
        await new Promise((r) => setTimeout(r, pollDelay));
        try {
          const followupResult = await fetchRequestStatus(upstreamBase, requestId, headers);
          console.log('Execute trade followUpResult', followupResult);
          lastFollowup = followupResult;
          if (followupResult && followupResult.data && followupResult.data.requestStatus) {
            const status = String(followupResult.data.requestStatus).toUpperCase();
            if (status === 'SUCCESS' || status === 'FAILURE') {
              return res.json({ requestId, requestStatus: followupResult.data.requestStatus });
            }
          }
        } catch (pollErr) {
          console.error('Error while polling execute trade status:', pollErr);
          // continue to next attempt
        }

        attempt += 1;
      }

      // After polling attempts exhausted, return last known status or error
      if (lastFollowup && lastFollowup.data && lastFollowup.data.requestStatus) {
        return res.json({ requestId, requestStatus: lastFollowup.data.requestStatus });
      }

      return res.status(500).json({ error: 'Trade execution polling timeout - request status unknown', requestId, followupError: lastFollowup?.error || 'no-followup' });
    } else {
      return res.status(500).json({ error: 'Execute trade did not return a requestId', data: response.data });
    }
  } catch (err) {
    console.error('Execute trade request error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    const upstreamStatus = err.response?.status || 500;
    const upstreamBody = err.response?.data || { error: 'Trade execution failed', message: err.message };
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

// GET /api/wallet/tokens - request token balance using blockchain API balanceOf method
app.get('/api/wallet/tokens', async (req, res) => {
  try {
    const upstreamBase = process.env.WALLET_SERVICE_URL;
    const walletAddress = process.env.WALLET_ADDRESS;
    const methodName = 'balanceOf';
    
    console.log("in get Tokens");
  
    // Check if minted contract address is provided in query params
    const contractAddress1 = req.query.contractAddress;
    console.log('Contract address from query:', contractAddress1);

    if (!upstreamBase) {
      return res.status(500).json({ error: 'WALLET_SERVICE_URL not configured on server' });
    }
    if (!walletAddress) {
      return res.status(500).json({ error: 'WALLET_ADDRESS not configured on server' });
    }

    // Build contract addresses array
    const contractAddresses = [];
    if (contractAddress1) {
      contractAddresses.push(contractAddress1);
    }
    
    if (contractAddresses.length === 0) {
      return res.status(500).json({ error: 'No token contract addresses provided in request' });
    }

    // Build headers with authorization if present
    const headers = {
      'Content-Type': 'application/json'
    };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    } else if (req.headers['x-access-token']) {
      headers.Authorization = `Bearer ${req.headers['x-access-token']}`;
    }

    // Fire token balance requests in parallel for all configured contract addresses
    const uniqueContractAddresses = [...new Set(contractAddresses)]; // Remove duplicates
    const promises = uniqueContractAddresses.map((contractAddress) => {
      const url = `${upstreamBase}/contract/${encodeURIComponent(contractAddress)}/method/${encodeURIComponent(methodName)}?params=${encodeURIComponent(walletAddress)}`;
      console.log('Tokens request URL:', url);
      return axios.get(url, { headers });
    });

    const settled = await Promise.allSettled(promises);
    const results = settled.map((r, idx) => {
      const contractAddress = uniqueContractAddresses[idx];
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
// app.get('/api/wallet/transactions', async (req, res) => {
//   try {
//     const apiBase = process.env.ETHERSCAN_API_BASE || 'https://api.etherscan.io/v2/api';
//     const apiKey = process.env.ETHERSCAN_API_KEY;
//     const chainId = process.env.ETHERSCAN_CHAINID || '11155111';
//     const startblock = req.query.startblock || '0';
//     const endblock = req.query.endblock || '9999999999';
//     const page = req.query.page || '1';
//     const offset = req.query.offset || '10';
//     const sort = req.query.sort || 'desc';

//     // Allow caller to pass address via query, otherwise fallback to env
//     const address = req.query.address || process.env.WALLET_ADDRESS;

//     // Support a single contract address: prefer query param, fallback to env
//     const contractAddress = process.env.LBG_CONTRACT_ADDRESS;

//     if (!apiKey) {
//       return res.status(500).json({ error: 'ETHERSCAN_API_KEY not configured on server' });
//     }
//     if (!address) {
//       return res.status(400).json({ error: 'address is required (query param or WALLET_ADDRESS env)' });
//     }
//     if (!contractAddress) {
//       return res.status(500).json({ error: 'No token contract address configured (provide ?contractaddress or set TOKENS_CONTRACT_1 / CONTRACT_ADDRESS in env)' });
//     }

//     const url = `${apiBase}?chainid=${encodeURIComponent(chainId)}&apikey=${encodeURIComponent(apiKey)}&module=account&action=tokentx&startblock=${encodeURIComponent(startblock)}&endblock=${encodeURIComponent(endblock)}&page=${encodeURIComponent(page)}&offset=${encodeURIComponent(offset)}&sort=${encodeURIComponent(sort)}&address=${encodeURIComponent(address)}&contractaddress=${encodeURIComponent(contractAddress)}`;
//     // console.log('Transactions request URL:', url);

//     const response = await axios.get(url);
//     // console.log('Transactions API response received for contract', contractAddress);
//     return res.json({ success: true, contractaddress: contractAddress, data: response.data, status: response.status });
//   } catch (err) {
//     console.error('Transactions request error:', {
//       message: err.message,
//       status: err.response?.status,
//       data: err.response?.data,
//     });
//     const upstreamStatus = err.response?.status || 500;
//     const upstreamBody = err.response?.data || { error: 'Transactions request failed', message: err.message };
//     res.status(upstreamStatus).json(upstreamBody);
//   }
// });

// GET /api/wallet/getAllWalletsTokens
// Fetch token balances for all wallet addresses in WALLET_ADDRESS_LIST
// app.get('/api/wallet/getAllWalletsTokens', async (req, res) => {
//   try {
//     const apiBase = process.env.ETHERSCAN_API_BASE || 'https://api.etherscan.io/v2/api';
//     const apiKey = process.env.ETHERSCAN_API_KEY;
//     const chainId = process.env.ETHERSCAN_CHAINID || '11155111';
//     const tag = process.env.ETHERSCAN_TAG || 'latest';
//     const contractAddress1 = process.env.LBG_CONTRACT_ADDRESS;
//     const contractAddress2 = process.env.MMF_CONTRACT_ADDRESS;

//     if (!apiKey) {
//       return res.status(500).json({ error: 'ETHERSCAN_API_KEY not configured on server' });
//     }
//     if (!contractAddress1 && !contractAddress2) {
//       return res.status(500).json({ error: 'No token contract addresses configured in env' });
//     }

//     // Read wallet addresses from env
//     const rawList = process.env.WALLET_ADDRESS_LIST;
//     if (!rawList) {
//       return res.status(500).json({ error: 'WALLET_ADDRESS_LIST not configured on server' });
//     }
//     let addresses = [];
//     try {
//       if (rawList.trim().startsWith('[')) {
//         addresses = JSON.parse(rawList);
//       } else {
//         addresses = rawList.split(',').map(s => s.trim()).filter(Boolean);
//       }
//     } catch (e) {
//       return res.status(400).json({ error: 'Invalid WALLET_ADDRESS_LIST format' });
//     }
//     if (addresses.length === 0) {
//       return res.status(400).json({ error: 'WALLET_ADDRESS_LIST is empty' });
//     }

//     // Build requests for each wallet-contract pair
//     const contractAddresses = [contractAddress1, contractAddress2].filter(Boolean);
//     const requests = addresses.map((address) => {
//       const promises = contractAddresses.map((contractAddress) => {
//         const url = `${apiBase}?chainid=${encodeURIComponent(chainId)}&tag=${encodeURIComponent(tag)}&apikey=${encodeURIComponent(apiKey)}&module=account&action=tokenbalance&address=${encodeURIComponent(address)}&contractaddress=${encodeURIComponent(contractAddress)}`;
//         return axios.get(url)
//           .then(resp => ({ success: true, contractaddress: contractAddress, data: resp.data, status: resp.status }))
//           .catch(err => ({ success: false, contractaddress: contractAddress, error: err.response?.data || err.message, status: err.response?.status }));
//       });
//       return Promise.all(promises).then(tokens => ({ address, tokens }));
//     });

//     const results = await Promise.all(requests);
//     return res.json(results);
//   } catch (err) {
//     console.error('getAllWalletsTokens request error:', {
//       message: err.message,
//       status: err.response?.status,
//       data: err.response?.data,
//     });
//     const upstreamStatus = err.response?.status || 500;
//     const upstreamBody = err.response?.data || { error: 'getAllWalletsTokens failed', message: err.message };
//     res.status(upstreamStatus).json(upstreamBody);
//   }
// });

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

// app.get('/api/wallet/getAllWalletTransactions', async (req, res) => {
//   try {
//     console.log("in getAllWalletTransactions");
//     const apiBase = process.env.ETHERSCAN_API_BASE || 'https://api.etherscan.io/v2/api';
//     const apiKey = process.env.ETHERSCAN_API_KEY;
//     const chainId = process.env.ETHERSCAN_CHAINID || '11155111';
//     const startblock = req.query.startblock || '0';
//     const endblock = req.query.endblock || '9999999999';
//     const page = req.query.page || '1';
//     const offset = req.query.offset || '10';
//     const sort = req.query.sort || 'desc';

//     // Contract address to filter transactions for (token transfers)
//     const contractAddress = process.env.LBG_CONTRACT_ADDRESS;
//     console.log("contractAddress", contractAddress);

//     if (!apiKey) {
//       return res.status(500).json({ error: 'ETHERSCAN_API_KEY not configured on server' });
//     }
//     if (!contractAddress) {
//       return res.status(500).json({ error: 'No token contract address configured (set LBG_CONTRACT_ADDRESS in env)' });
//     }

//     // Read list of wallet addresses from env (comma-separated or JSON array)
//     const rawList = process.env.WALLET_ADDRESS_LIST;
//     console.log(rawList);
//     if (!rawList) {
//       return res.status(500).json({ error: 'WALLET_ADDRESS_LIST not configured on server' });
//     }
//     let addresses = [];
//     try {
//       if (rawList.trim().startsWith('[')) {
//         addresses = JSON.parse(rawList);
//       } else {
//         addresses = rawList.split(',').map(s => s.trim()).filter(Boolean);
//       }
//     } catch (e) {
//       return res.status(400).json({ error: 'Invalid WALLET_ADDRESS_LIST format. Use JSON array or comma-separated list.' });
//     }
//     if (addresses.length === 0) {
//       return res.status(400).json({ error: 'WALLET_ADDRESS_LIST is empty' });
//     }

//     console.log(addresses)
//     // Process wallet addresses sequentially with 10-second delay between each
//     const results = [];
//     for (let i = 0; i < addresses.length; i++) {
//       const address = addresses[i];
//       const url = `${apiBase}?chainid=${encodeURIComponent(chainId)}&apikey=${encodeURIComponent(apiKey)}&module=account&action=tokentx&startblock=${encodeURIComponent(startblock)}&endblock=${encodeURIComponent(endblock)}&page=${encodeURIComponent(page)}&offset=${encodeURIComponent(offset)}&sort=${encodeURIComponent(sort)}&address=${encodeURIComponent(address)}&contractaddress=${encodeURIComponent(contractAddress)}`;
//       console.log(`Transactions request URL (${i + 1}/${addresses.length}):`, url);
      
//       try {
//         const resp = await axios.get(url);
//         results.push({ success: true, address, contractaddress: contractAddress, data: resp.data, status: resp.status });
//       } catch (err) {
//         results.push({ success: false, address, contractaddress: contractAddress, error: err.response?.data || err.message, status: err.response?.status });
//       }
      
//       // Wait 10 seconds before next request (except for the last one)
//       if (i < addresses.length - 1) {
//         console.log(`Waiting 10 seconds before next wallet request...`);
//         await new Promise(resolve => setTimeout(resolve, 10000));
//       }
//     }
    
//     return res.json(results);
//   } catch (err) {
//     console.error('getAllWalletTransactions request error:', {
//       message: err.message,
//       status: err.response?.status,
//       data: err.response?.data,
//     });
//     const upstreamStatus = err.response?.status || 500;
//     const upstreamBody = err.response?.data || { error: 'getAllWalletTransactions failed', message: err.message };
//     res.status(upstreamStatus).json(upstreamBody);
//   }
// });

// app.get('/api/wallet/getAllWalletTransactions', async (req, res) => {
//   try {
//     console.log("in getAllWalletTransactions");
//     const apiBase = process.env.ETHERSCAN_API_BASE || 'https://api.etherscan.io/v2/api';
//     const apiKey = process.env.ETHERSCAN_API_KEY;
//     const chainId = process.env.ETHERSCAN_CHAINID || '11155111';
//     const startblock = req.query.startblock || '0';
//     const endblock = req.query.endblock || '9999999999';
//     const page = req.query.page || '1';
//     const offset = req.query.offset || '10';
//     const sort = req.query.sort || 'desc';
 
//     // Contract address to filter transactions for (token transfers)
//     const contractAddress = process.env.LBG_CONTRACT_ADDRESS;
//     console.log("contractAddress", contractAddress);
 
//     if (!apiKey) {
//       return res.status(500).json({ error: 'ETHERSCAN_API_KEY not configured on server' });
//     }
//     if (!contractAddress) {
//       return res.status(500).json({ error: 'No token contract address configured (set LBG_CONTRACT_ADDRESS in env)' });
//     }
 
//     // Read list of wallet addresses from env (comma-separated or JSON array)
//     const rawList = process.env.WALLET_ADDRESS_LIST;
//     console.log(rawList);
//     if (!rawList) {
//       return res.status(500).json({ error: 'WALLET_ADDRESS_LIST not configured on server' });
//     }
//     let addresses = [];
//     try {
//         addresses = JSON.parse(rawList);
//         //addresses = rawList.map(s => s.wallet_address.trim().filter(Boolean));
//         //console.log("else",addresses);
//     } catch (e) {
//       return res.status(400).json({ error: 'Invalid WALLET_ADDRESS_LIST format. Use JSON array or comma-separated list.' });
//     }
//     if (addresses.length === 0) {
//       return res.status(400).json({ error: 'WALLET_ADDRESS_LIST is empty' });
//     }
 
//     console.log(addresses)
//     // Process wallet addresses with staggered parallel requests (batches of 3 with 2s delay between batches)
//     const BATCH_SIZE = 3;
//     const BATCH_DELAY_MS = 2000;
//     const results = [];
    
//     for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
//       const batch = addresses.slice(i, i + BATCH_SIZE);
//       console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} addresses)`);
      
//       const batchPromises = batch.map((address) => {
//         const url = `${apiBase}?chainid=${encodeURIComponent(chainId)}&apikey=${encodeURIComponent(address.apiKey)}&module=account&action=tokentx&startblock=${encodeURIComponent(startblock)}&endblock=${encodeURIComponent(endblock)}&page=${encodeURIComponent(page)}&offset=${encodeURIComponent(offset)}&sort=${encodeURIComponent(sort)}&address=${encodeURIComponent(address.wallet_address)}&contractaddress=${encodeURIComponent(contractAddress)}`;
//         console.log(`Transactions request URL for ${address.wallet_address}:`, url);
        
//         return axios.get(url)
//           .then(resp => ({ success: true, address, contractaddress: contractAddress, data: resp.data, status: resp.status }))
//           .catch(err => ({ success: false, address, contractaddress: contractAddress, error: err.response?.data || err.message, status: err.response?.status }));
//       });
      
//       const batchResults = await Promise.all(batchPromises);
//       results.push(...batchResults);
      
//       // Wait before next batch (except for the last batch)
//       if (i + BATCH_SIZE < addresses.length) {
//         console.log(`Waiting ${BATCH_DELAY_MS}ms before next batch...`);
//         await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
//       }
//     }
   
//     return res.json(results);
//   } catch (err) {
//     console.error('getAllWalletTransactions request error:', {
//       message: err.message,
//       status: err.response?.status,
//       data: err.response?.data,
//     });
//     const upstreamStatus = err.response?.status || 500;
//     const upstreamBody = err.response?.data || { error: 'getAllWalletTransactions failed', message: err.message };
//     res.status(upstreamStatus).json(upstreamBody);
//   }
// });

// GET /api/swap-contract-config - Get swap contract configuration addresses
app.get('/api/swap-contract-config', async (req, res) => {
  try {
    const mmfContractAddress = process.env.MMF_CONTRACT_ADDRESS;
    const exchangeRateContractAddress = process.env.EXCHANGE_RATE_CONTRACT_ADDRESS;
    
    res.json({
      mmfContractAddress: mmfContractAddress || '',
      exchangeRateContractAddress: exchangeRateContractAddress || ''
    });
  } catch (err) {
    console.error('Error fetching swap contract config:', err);
    res.status(500).json({ error: 'Failed to fetch swap contract configuration' });
  }
});

// GET /api/mint/history - Get mint transaction history from PostgreSQL
app.get('/api/mint/history', async (req, res) => {
  try {
    const filters = {
      contractAddress: req.query.contractAddress,
      walletAddress: req.query.walletAddress,
      limit: req.query.days // Get records from last N days
    };

    const transactions = await getMintTransactions(filters);
    
    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (err) {
    console.error('Error fetching mint history:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch mint transaction history',
      message: err.message 
    });
  }
});
 
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
