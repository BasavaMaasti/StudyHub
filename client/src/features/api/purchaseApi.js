import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const COURSE_PURCHASE_API = "http://localhost:8080/api/v1/purchase";

export const purchaseApi = createApi({
  reducerPath: "purchaseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: COURSE_PURCHASE_API,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    createCheckoutSession: builder.mutation({
      query: (courseId) => ({
        url: "/checkout/create-checkout-session",
        method: "POST",
        body: { courseId },
      }),
    }),
    getCourseDetailWithStatus: builder.query({
      query: (courseId) => ({
        url: `/course/${courseId}/detail-with-status`,
        method: "GET",
      }),
    }),
    // ✅ Use this for dashboard (admin)
   // In your purchaseApi.js, temporarily modify the endpoint:
getAllPurchasedCourses: builder.query({
  query: () => ({
    url: `/admin/all-purchased-courses`,
    method: "GET",
  }),
  transformResponse: (response) => {
    console.log("Raw API response:", response); // Add this line
    return response;
  },
}),

    // ✅ This is the user's own purchase list (e.g., My Courses page)
    getPurchasedCourses: builder.query({
      query: () => ({
        url: `/`, // Maps to GET /api/v1/purchase/
        method: "GET",
      }),
    }),
  }),
});

export const {
  useCreateCheckoutSessionMutation,
  useGetCourseDetailWithStatusQuery,
  useGetPurchasedCoursesQuery,
  useGetAllPurchasedCoursesQuery,
} = purchaseApi;
