import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import { logout, setCredentials } from '../slices/authSlice';
import type { AuthResponse } from '../../types';

const baseQuery = fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.accessToken;
        if (token) headers.set('Authorization', `Bearer ${token}`);
        return headers;
    },
});

export const baseQueryWithReauth: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    let result = await baseQuery(args, api, extraOptions);

    if (result.error?.status === 401) {
        const url = typeof args === 'string' ? args : args.url;
        if (typeof url === 'string' && url.includes('/auth/refresh')) {
            api.dispatch(logout());
            window.location.href = '/login';
            return result;
        }

        const refreshResult = await baseQuery(
            { url: '/auth/refresh', method: 'POST', body: {} },
            api,
            extraOptions
        );

        if (refreshResult.data) {
            const data = refreshResult.data as AuthResponse;
            api.dispatch(setCredentials({
                accessToken: data.accessToken,
                refreshToken: null,
                username: data.username,
                email: data.email,
                roles: data.roles,
            }));
            result = await baseQuery(args, api, extraOptions);
        } else {
            api.dispatch(logout());
            window.location.href = '/login';
        }
    }
    return result;
};
