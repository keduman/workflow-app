import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type { Role, User, Page } from '../../types';

export const roleApi = createApi({
    reducerPath: 'roleApi',
    baseQuery: fetchBaseQuery({
        baseUrl: '/api',
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as RootState).auth.accessToken;
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return headers;
        },
    }),
    tagTypes: ['Role', 'User'],
    endpoints: (builder) => ({
        getRoles: builder.query<Role[], void>({
            query: () => '/admin/roles',
            providesTags: ['Role'],
        }),
        createRole: builder.mutation<Role, Partial<Role>>({
            query: (body) => ({ url: '/admin/roles', method: 'POST', body }),
            invalidatesTags: ['Role'],
        }),
        updateRole: builder.mutation<Role, { id: number; body: Partial<Role> }>({
            query: ({ id, body }) => ({ url: `/admin/roles/${id}`, method: 'PUT', body }),
            invalidatesTags: ['Role'],
        }),
        deleteRole: builder.mutation<void, number>({
            query: (id) => ({ url: `/admin/roles/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Role'],
        }),
        getUsers: builder.query<Page<User>, { page?: number; size?: number }>({
            query: ({ page = 0, size = 50 }) => `/admin/roles/users?page=${page}&size=${size}`,
            providesTags: ['User'],
        }),
        assignRole: builder.mutation<void, { roleId: number; userId: number }>({
            query: ({ roleId, userId }) => ({ url: `/admin/roles/${roleId}/users/${userId}`, method: 'POST' }),
            invalidatesTags: ['User'],
        }),
        removeRole: builder.mutation<void, { roleId: number; userId: number }>({
            query: ({ roleId, userId }) => ({ url: `/admin/roles/${roleId}/users/${userId}`, method: 'DELETE' }),
            invalidatesTags: ['User'],
        }),
    }),
});

export const {
    useGetRolesQuery,
    useCreateRoleMutation,
    useUpdateRoleMutation,
    useDeleteRoleMutation,
    useGetUsersQuery,
    useAssignRoleMutation,
    useRemoveRoleMutation,
} = roleApi;
