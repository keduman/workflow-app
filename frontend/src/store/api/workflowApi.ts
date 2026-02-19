import { createApi } from '@reduxjs/toolkit/query/react';
import type { Workflow, Page } from '../../types';
import { baseQueryWithReauth } from './baseQueryWithReauth';

export const workflowApi = createApi({
    reducerPath: 'workflowApi',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['Workflow'],
    endpoints: (builder) => ({
        getWorkflows: builder.query<Page<Workflow>, { page?: number; size?: number }>({
            query: ({ page = 0, size = 20 }) => `/admin/workflows?page=${page}&size=${size}`,
            providesTags: ['Workflow'],
        }),
        getWorkflow: builder.query<Workflow, number>({
            query: (id) => `/admin/workflows/${id}`,
            providesTags: (_r, _e, id) => [{ type: 'Workflow', id }],
        }),
        createWorkflow: builder.mutation<Workflow, Partial<Workflow>>({
            query: (body) => ({ url: '/admin/workflows', method: 'POST', body }),
            invalidatesTags: ['Workflow'],
        }),
        updateWorkflow: builder.mutation<Workflow, { id: number; body: Partial<Workflow> }>({
            query: ({ id, body }) => ({ url: `/admin/workflows/${id}`, method: 'PUT', body }),
            invalidatesTags: (_r, _e, { id }) => [{ type: 'Workflow', id }, 'Workflow'],
        }),
        deleteWorkflow: builder.mutation<void, number>({
            query: (id) => ({ url: `/admin/workflows/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Workflow'],
        }),
        publishWorkflow: builder.mutation<Workflow, number>({
            query: (id) => ({ url: `/admin/workflows/${id}/publish`, method: 'POST' }),
            invalidatesTags: (_r, _e, id) => [{ type: 'Workflow', id }, 'Workflow'],
        }),
    }),
});

export const {
    useGetWorkflowsQuery,
    useGetWorkflowQuery,
    useCreateWorkflowMutation,
    useUpdateWorkflowMutation,
    useDeleteWorkflowMutation,
    usePublishWorkflowMutation,
} = workflowApi;
