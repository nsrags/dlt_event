import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import walletReducer from './walletSlice';
import contractsReducer from './contractsSlice';
import transactionReducer from './transactionSlice';
import { rtkQueryErrorLogger, loggerMiddleware } from './middleware';

// Persist configuration for wallet slice
const walletPersistConfig = {
  key: 'wallet',
  storage,
  whitelist: ['mintedContractAddress', 'mintedContractInfo'], // Persist both contract address and info
};

// Persist configuration for contracts slice
const contractsPersistConfig = {
  key: 'contracts',
  storage,
  whitelist: ['swapContractAddress', 'contractAddress'], // Persist swap contract address and contract address
};

const persistedWalletReducer = persistReducer(walletPersistConfig, walletReducer);
const persistedContractsReducer = persistReducer(contractsPersistConfig, contractsReducer);

export const store = configureStore({
  reducer: {
    wallet: persistedWalletReducer,
    contracts: persistedContractsReducer,
    transactions: transactionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    })
      .concat(rtkQueryErrorLogger)
      .concat(loggerMiddleware),
  devTools: import.meta.env.DEV,
});

export const persistor = persistStore(store);