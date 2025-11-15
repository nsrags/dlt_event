import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './walletSlice';
import contractsReducer from './contractsSlice';
import transactionReducer from './transactionSlice';
import { rtkQueryErrorLogger, loggerMiddleware } from './middleware';

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    contracts: contractsReducer,
    transactions: transactionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(rtkQueryErrorLogger)
      .concat(loggerMiddleware),
  devTools: import.meta.env.DEV,
});