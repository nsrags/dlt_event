import { isRejectedWithValue } from '@reduxjs/toolkit';

// Error handling middleware
export const rtkQueryErrorLogger = () => (next) => (action) => {
  // RTK Query uses `createAsyncThunk` from redux-toolkit under the hood, so we're able to utilize these matchers
  if (isRejectedWithValue(action)) {
    console.warn('We got a rejected action!', action.error);
    // You can add toast notifications here
    // toast.error(action.error.message);
  }

  return next(action);
};

// Logging middleware (development only)
export const loggerMiddleware = (store) => (next) => (action) => {
  if (import.meta.env.DEV) {
    console.group(action.type);
    console.info('dispatching', action);
    let result = next(action);
    console.log('next state', store.getState());
    console.groupEnd();
    return result;
  }
  return next(action);
};