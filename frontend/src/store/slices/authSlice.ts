import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    username: string | null;
    email: string | null;
    roles: string[];
    isAuthenticated: boolean;
}

const stored = localStorage.getItem('auth');
const initial: AuthState = stored
    ? JSON.parse(stored)
    : { accessToken: null, refreshToken: null, username: null, email: null, roles: [], isAuthenticated: false };

const authSlice = createSlice({
    name: 'auth',
    initialState: initial,
    reducers: {
        setCredentials: (state, action: PayloadAction<{
            accessToken: string; refreshToken: string; username: string; email: string; roles: string[];
        }>) => {
            state.accessToken = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
            state.username = action.payload.username;
            state.email = action.payload.email;
            state.roles = action.payload.roles;
            state.isAuthenticated = true;
            localStorage.setItem('auth', JSON.stringify(state));
        },
        logout: (state) => {
            state.accessToken = null;
            state.refreshToken = null;
            state.username = null;
            state.email = null;
            state.roles = [];
            state.isAuthenticated = false;
            localStorage.removeItem('auth');
        },
    },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
