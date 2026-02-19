import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type { WorkflowInstance, Workflow, Page } from '../../types';

export const taskApi = createApi({
    reducerPath: 'taskApi',
    baseQuery: fetchBaseQuery({
        baseUrl: '/api',
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as RootState).auth.accessToken;
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return headers;
        },
    }),
    tagTypes: ['Task'],
    endpoints: (builder) => ({
        getPublishedWorkflows: builder.query<Page<Workflow>, { page?: number; size?: number }>({
            query: ({ page = 0, size = 20 }) => `/tasks/workflows?page=${page}&size=${size}`,
        }),
        getPublishedWorkflow: builder.query<Workflow, number>({
            query: (workflowId) => `/tasks/workflows/${workflowId}`,
        }),
        getMyTasks: builder.query<Page<WorkflowInstance>, { page?: number; size?: number }>({
            query: ({ page = 0, size = 20 }) => `/tasks?page=${page}&size=${size}`,
            providesTags: ['Task'],
        }),
        getTask: builder.query<WorkflowInstance, number>({
            query: (id) => `/tasks/${id}`,
            providesTags: (_r, _e, id) => [{ type: 'Task', id }],
        }),
        startWorkflow: builder.mutation<WorkflowInstance, number>({
            query: (workflowId) => ({ url: `/tasks/start/${workflowId}`, method: 'POST' }),
            invalidatesTags: ['Task'],
        }),
        submitStep: builder.mutation<WorkflowInstance, { id: number; formData: Record<string, unknown> }>({
            query: ({ id, formData }) => ({ url: `/tasks/${id}/submit`, method: 'POST', body: formData }),
            invalidatesTags: (_r, _e, { id }) => [{ type: 'Task', id }, 'Task'],
        }),
        cancelTask: builder.mutation<WorkflowInstance, number>({
            query: (id) => ({ url: `/tasks/${id}/cancel`, method: 'POST' }),
            invalidatesTags: ['Task'],
        }),
    }),
});

export const {
    useGetPublishedWorkflowsQuery,
    useGetPublishedWorkflowQuery,
    useGetMyTasksQuery,
    useGetTaskQuery,
    useStartWorkflowMutation,
    useSubmitStepMutation,
    useCancelTaskMutation,
} = taskApi;
