import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { contractAPI } from '../services/api';

// Async thunks
export const  fetchContracts = createAsyncThunk(
  'contracts/fetchContracts',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await contractAPI.list(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const deployContract = createAsyncThunk(
  'contracts/deployContract',
  async (contractData, { rejectWithValue }) => {
    try {
      const response = await contractAPI.deploy(contractData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchContractDetails = createAsyncThunk(
  'contracts/fetchContractDetails',
  async (contractId, { rejectWithValue }) => {
    try {
      const response = await contractAPI.getDetails(contractId);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const initialState = {
  totalCount: 0,
  pageCount: 0,
  pageNumber: 0,
  contracts: [],
  error: null,
  isLoading: false
};

export const contractsSlice = createSlice({
  name: 'contracts',
  initialState,
  reducers: {
    setContracts: (state, action) => {
      state.contracts = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updatePagination: (state, action) => {
      const { totalCount, pageCount, pageNumber } = action.payload;
      if (totalCount !== undefined) state.totalCount = totalCount;
      if (pageCount !== undefined) state.pageCount = pageCount;
      if (pageNumber !== undefined) state.pageNumber = pageNumber;
    }
  },
  extraReducers: (builder) => {
    // Fetch Contracts
    builder.addCase(fetchContracts.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchContracts.fulfilled, (state, action) => {
      state.isLoading = false;
      state.contracts = action.payload.contracts || [];
      state.totalCount = action.payload.totalCount || 0;
      state.pageCount = action.payload.pageCount || 0;
      state.pageNumber = action.payload.pageNumber || 0;
      state.error = null;
    });
    builder.addCase(fetchContracts.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to fetch contracts';
    });

    // Deploy Contract
    builder.addCase(deployContract.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(deployContract.fulfilled, (state, action) => {
      state.isLoading = false;
      state.contracts.unshift(action.payload); // Add new contract to start of list
      state.totalCount += 1;
      state.error = null;
    });
    builder.addCase(deployContract.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Contract deployment failed';
    });

    // Fetch Contract Details
    builder.addCase(fetchContractDetails.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchContractDetails.fulfilled, (state, action) => {
      state.isLoading = false;
      // Update the contract in the list if it exists
      const index = state.contracts.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.contracts[index] = { ...state.contracts[index], ...action.payload };
      }
      state.error = null;
    });
    builder.addCase(fetchContractDetails.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to fetch contract details';
    });
  }
});

// Export actions
export const { setContracts, clearError, updatePagination } = contractsSlice.actions;

// Selectors
export const selectContracts = (state) => state.contracts.contracts;
export const selectContractDetails = (id) => (state) => 
  state.contracts.contracts.find(c => c.id === id);
export const selectContractsLoading = (state) => state.contracts.isLoading;
export const selectContractsError = (state) => state.contracts.error;
export const selectContractsPagination = (state) => ({
  totalCount: state.contracts.totalCount,
  pageCount: state.contracts.pageCount,
  pageNumber: state.contracts.pageNumber
});

export default contractsSlice.reducer;