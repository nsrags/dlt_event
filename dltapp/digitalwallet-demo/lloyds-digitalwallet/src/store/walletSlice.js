import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI, walletAPI } from '../services/api';

// Async thunks for wallet management
export const loginUser = createAsyncThunk(
  'wallet/login',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.login();
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchBalance = createAsyncThunk(
  'wallet/fetchBalance',
  async (_, { rejectWithValue }) => {
    try {
      const response = await walletAPI.getBalance();
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchExchangeRate = createAsyncThunk(
  'wallet/fetchExchangRate',
  async (_, { rejectWithValue }) => {
    try {
      const response = await walletAPI.getExchangeRate();
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchTokens = createAsyncThunk(
  'wallet/fetchTokens',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Get minted contract info array from Redux state
      const state = getState();
      const mintedContractInfo = state.wallet.mintedContractInfo;
      console.log("In fetchTokens, mintedContractInfo:", mintedContractInfo);
      
      // If no contracts, return empty array
      if (!mintedContractInfo || mintedContractInfo.length === 0) {
        return [];
      }
      
      // Fetch tokens for all minted contracts
      const tokenPromises = mintedContractInfo.map(contractInfo => 
        walletAPI.getTokens(contractInfo.contractAddress)
          .then(response => ({
            contractAddress: contractInfo.contractAddress,
            contractName: contractInfo.contractName,
            tokens: response.data
          }))
          .catch(error => ({
            contractAddress: contractInfo.contractAddress,
            contractName: contractInfo.contractName,
            error: error.message,
            tokens: null
          }))
      );
      
      // Add MMF_CONTRACT_ADDRESS call
      const mmfContractAddress = import.meta.env.VITE_MMF_CONTRACT_ADDRESS;
      if (mmfContractAddress) {
        tokenPromises.push(
          walletAPI.getTokens(mmfContractAddress)
            .then(response => ({
              contractAddress: mmfContractAddress,
              contractName: 'MMF Token',
              tokens: response.data
            }))
            .catch(error => ({
              contractAddress: mmfContractAddress,
              contractName: 'MMF Token',
              error: error.message,
              tokens: null
            }))
        );
      }
      
      const results = await Promise.all(tokenPromises);
      console.log("Fetched tokens for all contracts:", results);
      return results;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchAllWalletsTokens = createAsyncThunk(
  'wallet/fetchAllWalletsTokens',
  async (_, { rejectWithValue }) => {
    try {
      const response = await walletAPI.getAllWalletsTokens();
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const buyTokens = createAsyncThunk(
  'wallet/buyTokens',
  async (params, { rejectWithValue }) => {
    try {
      const response = await walletAPI.buyTokens(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const redeemTokens = createAsyncThunk(
  'wallet/redeemTokens',
  async (params, { rejectWithValue }) => {
    try {
      const response = await walletAPI.redeemTokens(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const mintTokens = createAsyncThunk(
  'wallet/mintTokens',
  async (params, { rejectWithValue }) => {
    try {
      const response = await walletAPI.mintTokens(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const initialState = {
  balance: 0,
  isLoading: false,
  error: null,
  token: null,
  tokens: [], // store tokens list or response from fetchTokens
  allWalletsTokens: [], // store all wallets tokens response
  allWalletsTokensLoading: false,
  allWalletsTokensError: null,
  exchangeRate: null, // store exchange rate response
  exchangeRateLoading: false,
  exchangeRateError: null,
  lastUpdated: null,
  buyTokensLoading: false,
  buyTokensError: null,
  currentBuyOperation: null ,
  currentRedeemOperation: null, // store buyTokens response (requestId, status, etc.)
  redeemTokensLoading: false,
  redeemTokensError: null,
  currentMintOperation: null, // store mintTokens response (requestId, status, etc.)
  mintTokensLoading: false,
  mintTokensError: null,
  mintedContractAddress: null, // store the minted contract address
  mintedContractInfo: [], // store array of { contractAddress, contractName } mappings
};

export const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setBalance: (state, action) => {
      state.balance = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentBuyOperation: (state) => {
        state.currentBuyOperation = null;
    },
    clearCurrentRedeemOperation: (state) => {
        state.currentRedeemOperation = null;
    },
    clearCurrentMintOperation: (state) => {
        state.currentMintOperation = null;
    },
    setMintedContractAddress: (state, action) => {
        state.mintedContractAddress = action.payload;
    },
    setMintedContractInfo: (state, action) => {
        // Initialize as array if null or undefined
        if (!Array.isArray(state.mintedContractInfo)) {
          state.mintedContractInfo = [];
        }
        // Add new contract info to array, avoid duplicates
        const exists = state.mintedContractInfo.find(
          info => info.contractAddress === action.payload.contractAddress
        );
        if (!exists) {
          state.mintedContractInfo.push(action.payload);
        }
    },
    clearMintedContractData: (state) => {
        state.mintedContractAddress = null;
        state.mintedContractInfo = [];
    }


  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginUser.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.token = action.payload.access_token;
      state.error = null;
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Login failed';
    });

    // Fetch Balance
    builder.addCase(fetchBalance.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchBalance.fulfilled, (state, action) => {
      state.isLoading = false;
      state.balance = action.payload.balance;
      state.lastUpdated = new Date().toISOString();
      state.error = null;
    });
    builder.addCase(fetchBalance.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to fetch balance';
    });

    // Fetch Tokens
    builder.addCase(fetchTokens.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchTokens.fulfilled, (state, action) => {
      state.isLoading = false;
      // store the full response (could be array or object) in `tokens`
      state.tokens = action.payload;
      state.lastUpdated = new Date().toISOString();
      state.error = null;
    });
    builder.addCase(fetchTokens.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to fetch tokens';
    });

    // Buy Tokens
    builder.addCase(buyTokens.pending, (state) => {
      state.buyTokensLoading = true;
      state.buyTokensError = null;
    });
    builder.addCase(buyTokens.fulfilled, (state, action) => {
      state.buyTokensLoading = false;
      state.currentBuyOperation = action.payload;
      state.buyTokensError = null;
    });
    builder.addCase(buyTokens.rejected, (state, action) => {
      state.buyTokensLoading = false;
      state.buyTokensError = action.payload || 'Failed to buy tokens';
    });
    // Redeem Tokens
    builder.addCase(redeemTokens.pending, (state) => {
      state.redeemTokensLoading = true;
      state.redeemTokensError = null;
    });
    builder.addCase(redeemTokens.fulfilled, (state, action) => {
      state.redeemTokensLoading = false;
      state.currentRedeemOperation = action.payload;
      state.redeemTokensError = null;
    });
    builder.addCase(redeemTokens.rejected, (state, action) => {
      state.redeemTokensLoading = false;
      state.redeemTokensError = action.payload || 'Failed to redeem tokens';
    });

    // Mint Tokens
    builder.addCase(mintTokens.pending, (state) => {
      state.mintTokensLoading = true;
      state.mintTokensError = null;
    });
    builder.addCase(mintTokens.fulfilled, (state, action) => {
      state.mintTokensLoading = false;
      state.currentMintOperation = action.payload;
      state.mintTokensError = null;
    });
    builder.addCase(mintTokens.rejected, (state, action) => {
      state.mintTokensLoading = false;
      state.mintTokensError = action.payload || 'Failed to mint tokens';
    });
    
    // Fetch Exchange Rate
    builder.addCase(fetchExchangeRate.pending, (state) => {
      state.exchangeRateLoading = true;
      state.exchangeRateError = null;
    });
    builder.addCase(fetchExchangeRate.fulfilled, (state, action) => {
      state.exchangeRateLoading = false;
      state.exchangeRate = action.payload;
      state.exchangeRateError = null;
    });
    builder.addCase(fetchExchangeRate.rejected, (state, action) => {
      state.exchangeRateLoading = false;
      state.exchangeRateError = action.payload || 'Failed to fetch exchange rate';
    });

    // Fetch All Wallets Tokens
    builder.addCase(fetchAllWalletsTokens.pending, (state) => {
      state.allWalletsTokensLoading = true;
      state.allWalletsTokensError = null;
    });
    builder.addCase(fetchAllWalletsTokens.fulfilled, (state, action) => {
      state.allWalletsTokensLoading = false;
      state.allWalletsTokens = Array.isArray(action.payload) ? action.payload : [];
      state.allWalletsTokensError = null;
    });
    builder.addCase(fetchAllWalletsTokens.rejected, (state, action) => {
      state.allWalletsTokensLoading = false;
      state.allWalletsTokensError = action.payload || 'Failed to fetch all wallets tokens';
    });
  },
});

// Export actions
export const { 
  setBalance,
  setLoading,
  setError,
  setToken,
  clearError,
  clearCurrentBuyOperation,
  clearCurrentRedeemOperation,
  clearCurrentMintOperation,
  setMintedContractAddress,
  setMintedContractInfo,
  clearMintedContractData
} = walletSlice.actions;

// Selectors
export const selectBalance = (state) => state.wallet.balance;
export const selectWalletLoading = (state) => state.wallet.isLoading;
export const selectWalletError = (state) => state.wallet.error;
export const selectToken = (state) => state.wallet.token;
export const selectTokens = (state) => state.wallet.tokens;
export const selectLastUpdated = (state) => state.wallet.lastUpdated;
export const selectBuyTokensLoading = (state) => state.wallet.buyTokensLoading;
export const selectBuyTokensError = (state) => state.wallet.buyTokensError;
export const selectCurrentBuyOperation = (state) => state.wallet.currentBuyOperation;
export const selectRedeemTokensLoading = (state) => state.wallet.redeemTokensLoading;
export const selectRedeemTokensError = (state) => state.wallet.redeemTokensError;
export const selectCurrentRedeemOperation = (state) => state.wallet.currentRedeemOperation;
export const selectExchangeRate = (state) => state.wallet.exchangeRate;
export const selectExchangeRateLoading = (state) => state.wallet.exchangeRateLoading;
export const selectExchangeRateError = (state) => state.wallet.exchangeRateError;
export const selectAllWalletsTokens = (state) => state.wallet.allWalletsTokens;
export const selectAllWalletsTokensLoading = (state) => state.wallet.allWalletsTokensLoading;
export const selectAllWalletsTokensError = (state) => state.wallet.allWalletsTokensError;
export const selectMintTokensLoading = (state) => state.wallet.mintTokensLoading;
export const selectMintTokensError = (state) => state.wallet.mintTokensError;
export const selectCurrentMintOperation = (state) => state.wallet.currentMintOperation;
export const selectMintedContractAddress = (state) => state.wallet.mintedContractAddress;
export const selectMintedContractInfo = (state) => state.wallet.mintedContractInfo;

export default walletSlice.reducer;