import { createApi } from '@reduxjs/toolkit/query/react';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../../types';
import { baseQueryWithReauth } from './baseQueryWithReauth';

export const authApi = createApi({
    reducerPath: 'authApi',
    baseQuery: baseQueryWithReauth,
    endpoints: (builder) => ({
        login: builder.mutation<AuthResponse, LoginRequest>({
            query: (body) => ({ url: '/auth/login', method: 'POST', body, credentials: 'include' }),
        }),
        register: builder.mutation<AuthResponse, RegisterRequest>({
            query: (body) => ({ url: '/auth/register', method: 'POST', body, credentials: 'include' }),
        }),
        refreshToken: builder.mutation<AuthResponse, void>({
            query: () => ({ url: '/auth/refresh', method: 'POST', body: {}, credentials: 'include' }),
        }),
        logout: builder.mutation<void, void>({
            query: () => ({ url: '/auth/logout', method: 'POST', credentials: 'include' }),
        }),
    }),
});

export const { useLoginMutation, useRegisterMutation, useRefreshTokenMutation, useLogoutMutation } = authApi;
