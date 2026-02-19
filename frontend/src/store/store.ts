import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authApi } from './api/authApi';
import { workflowApi } from './api/workflowApi';
import { roleApi } from './api/roleApi';
import { taskApi } from './api/taskApi';
import authReducer from './slices/authSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        [authApi.reducerPath]: authApi.reducer,
        [workflowApi.reducerPath]: workflowApi.reducer,
        [roleApi.reducerPath]: roleApi.reducer,
        [taskApi.reducerPath]: taskApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(authApi.middleware)
            .concat(workflowApi.middleware)
            .concat(roleApi.middleware)
            .concat(taskApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
