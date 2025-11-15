import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI, walletAPI, contractAPI } from '../services/api';

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

export const deployContract = createAsyncThunk(
  'wallet/deployContract',
  async (contractData, { rejectWithValue }) => {
    try {
      const response = await contractAPI.deploy(contractData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchTokens = createAsyncThunk(
  'wallet/fetchTokens',
  async (_, { rejectWithValue }) => {
    try {
      const response = await walletAPI.getTokens();
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








const initialState = {
  balance: 0,
  isLoading: false,
  error: null,
  token: null,
  tokens: [], // store tokens list or response from fetchTokens
  lastUpdated: null,
  buyTokensLoading: false,
  buyTokensError: null,
  currentBuyOperation: null ,
  currentRedeemOperation: null, // store buyTokens response (requestId, status, etc.)
  redeemTokensLoading: false,
  redeemTokensError: null,
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
  clearCurrentRedeemOperation
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

export default walletSlice.reducer;