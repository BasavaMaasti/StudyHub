import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
const INTERVIEW_API= "http://localhost:8080/api/v1/aiinterview";

export const interviewApi = createApi({
  reducerPath: "interviewApi",
  baseQuery: fetchBaseQuery({
    baseUrl: INTERVIEW_API,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token || localStorage.getItem("token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
    credentials: 'include' // Add this for cookies
  }),
  tagTypes: ['Interview'],
  endpoints: (builder) => ({
    createInterview: builder.mutation({
      query: (interviewData) => ({
        url: '/',
        method: 'POST',
        body: interviewData
      }),
      invalidatesTags: ['Interview']
    }),
    evaluateInterview: builder.mutation({
      query: ({ interviewId, answers }) => ({
        url: '/evaluate',
        method: 'POST',
        body: { interviewId, answers }
      }),
      invalidatesTags: ['Interview']
    }),
    getInterviews: builder.query({
      query: ({ page = 1, limit = 10 } = {}) => ({
        url: '/',
        method: 'GET',
        params: { page, limit }
      }),
      providesTags: ['Interview'],
      transformResponse: (response) => ({
        interviews: response.interviews,
        pagination: {
          total: response.total,
          page: response.page,
          pages: response.pages
        }
      })
    }),
    getInterviewById: builder.query({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Interview', id }]
    })
  })
});

export const {
  useCreateInterviewMutation,
  useEvaluateInterviewMutation,
  useGetInterviewsQuery,
  useGetInterviewByIdQuery
} = interviewApi;