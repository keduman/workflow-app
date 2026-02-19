import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    username: string | null;
    email: string | null;
    roles: string[];
    isAuthenticated: boolean;
    authCheckComplete: boolean;
}

const initial: AuthState = {
    accessToken: null,
    refreshToken: null,
    username: null,
    email: null,
    roles: [],
    isAuthenticated: false,
    authCheckComplete: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState: initial,
    reducers: {
        setCredentials: (state, action: PayloadAction<{
            accessToken: string; refreshToken: string | null; username: string; email: string; roles: string[];
        }>) => {
            state.accessToken = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken ?? null;
            state.username = action.payload.username;
            state.email = action.payload.email;
            state.roles = action.payload.roles;
            state.isAuthenticated = true;
        },
        logout: (state) => {
            state.accessToken = null;
            state.refreshToken = null;
            state.username = null;
            state.email = null;
            state.roles = [];
            state.isAuthenticated = false;
        },
        setAuthCheckComplete: (state) => {
            state.authCheckComplete = true;
        },
    },
});

export const { setCredentials, logout, setAuthCheckComplete } = authSlice.actions;
export default authSlice.reducer;
