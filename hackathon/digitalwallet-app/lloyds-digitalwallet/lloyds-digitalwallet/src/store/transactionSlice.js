import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { walletAPI } from '../services/api';

// Async thunk for sending a transaction
export const sendTransaction = createAsyncThunk(
  'transactions/sendTransaction',
  async (transactionData, { rejectWithValue }) => {
    try {
      const response = await walletAPI.sendTransaction(transactionData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchTransactions = createAsyncThunk(
  'wallet/fetchTransactions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await walletAPI.getTransactions();
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);
export const allWalletsTransactions = createAsyncThunk(
  'wallet/allWalletsTransactions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await walletAPI.getAllWalletsTransactions();
      console.log(response.data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);




const initialState = {
  isLoading: false,
  error: null,
  transactions: [],
  sendTransaction: null,
  fetchTransactionsLoading: false,
  sendTransactionLoading: false,
  allWalletsTransactions: [],
  allWalletsTransactionsLoading: false,
  allWalletsTransactionsError: null,
};

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentTransaction: (state) => {
      state.sendTransaction = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Send Transaction
      .addCase(sendTransaction.pending, (state) => {
        state.sendTransactionLoading = true;
        state.error = null;
      })
      .addCase(sendTransaction.fulfilled, (state, action) => {
        console.log("send transaction fulfilled");
        state.sendTransactionLoading = false;
        state.sendTransaction = action.payload;
        // state.transactions.unshift(action.payload);
        state.error = null;
      })
      .addCase(sendTransaction.rejected, (state, action) => {
        state.sendTransactionLoading = false;
        state.error = action.payload || 'Transaction failed';
      });
    // Fetch Transactions
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.fetchTransactionsLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.fetchTransactionsLoading = false;
        // Support responses shaped as { transactions: [...] } or an array directly
        console.log(action.payload?.transactions);
        state.transactions = action.payload?.transactions || action.payload || [];
        state.error = null;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.fetchTransactionsLoading = false;
        state.error = action.payload || 'Failed to fetch transactions';
      });
    
    // All Wallets Transactions
    builder
      .addCase(allWalletsTransactions.pending, (state) => {
        state.allWalletsTransactionsLoading = true;
        state.allWalletsTransactionsError = null;
      })
      .addCase(allWalletsTransactions.fulfilled, (state, action) => {
        state.allWalletsTransactionsLoading = false;
        // API returns an array of per-address results
        state.allWalletsTransactions = Array.isArray(action.payload) ? action.payload : (action.payload?.transactions || []);
        state.allWalletsTransactionsError = null;
      })
      .addCase(allWalletsTransactions.rejected, (state, action) => {
        state.allWalletsTransactionsLoading = false;
        state.allWalletsTransactionsError = action.payload || 'Failed to fetch all wallets transactions';
      });
  }
});

// Export actions
export const { clearError, clearCurrentTransaction } = transactionSlice.actions;

// Export selectors
// export const selectTransactionLoading = (state) => state.transactions.isLoading;
export const selectTransactionError = (state) => state.transactions.error;
export const selectSendTransaction = (state) => state.transactions.sendTransaction;
export const selectTransactions = (state) => state.transactions.transactions;
export const selectFetchTransactionsLoading = (state) => state.transactions.fetchTransactionsLoading;
export const selectSendTransactionLoading = (state) => state.transactions.sendTransactionLoading;
export const selectAllWalletsTransactions = (state) => state.transactions.allWalletsTransactions;
export const selectAllWalletsTransactionsLoading = (state) => state.transactions.allWalletsTransactionsLoading;
export const selectAllWalletsTransactionsError = (state) => state.transactions.allWalletsTransactionsError;

export default transactionSlice.reducer;  