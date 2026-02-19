import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../../types';

const baseQuery = fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.accessToken;
        if (token) headers.set('Authorization', `Bearer ${token}`);
        return headers;
    },
});

export const authApi = createApi({
    reducerPath: 'authApi',
    baseQuery,
    endpoints: (builder) => ({
        login: builder.mutation<AuthResponse, LoginRequest>({
            query: (body) => ({ url: '/auth/login', method: 'POST', body }),
        }),
        register: builder.mutation<AuthResponse, RegisterRequest>({
            query: (body) => ({ url: '/auth/register', method: 'POST', body }),
        }),
        refreshToken: builder.mutation<AuthResponse, string>({
            query: (refreshToken) => ({ url: '/auth/refresh', method: 'POST', body: { refreshToken } }),
        }),
    }),
});

export const { useLoginMutation, useRegisterMutation, useRefreshTokenMutation } = authApi;
