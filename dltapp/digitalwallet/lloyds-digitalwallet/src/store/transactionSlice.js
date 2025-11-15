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




const initialState = {
  isLoading: false,
  error: null,
  transactions: [],
  currentTransaction: null,
  fetchTransactionsLoading: false
};

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentTransaction: (state) => {
      state.currentTransaction = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Send Transaction
      .addCase(sendTransaction.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendTransaction.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTransaction = action.payload;
        state.transactions.unshift(action.payload);
        state.error = null;
      })
      .addCase(sendTransaction.rejected, (state, action) => {
        state.isLoading = false;
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
  }
});

// Export actions
export const { clearError, clearCurrentTransaction } = transactionSlice.actions;

// Export selectors
export const selectTransactionLoading = (state) => state.transactions.isLoading;
export const selectTransactionError = (state) => state.transactions.error;
export const selectCurrentTransaction = (state) => state.transactions.currentTransaction;
export const selectTransactions = (state) => state.transactions.transactions;
export const selectFetchTransactionsLoading = (state) => state.transactions.fetchTransactionsLoading;

export default transactionSlice.reducer;  