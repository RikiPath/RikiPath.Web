import { useMutation, useQuery } from '@tanstack/react-query';

import {
    startMockTest,
    submitMockTestAttempt,
    getMockTestAttempt,
} from '../api/mockTestApi.js';

export const mockTestKeys = {
    attempt: (attemptId) => ['mockTest', 'attempt', attemptId],
};

/**
 * Mutation để bắt đầu làm bài kiểm tra mock test.
 */
export function useStartMockTestMutation() {
    return useMutation({
        mutationFn: (practiceTestId) => startMockTest(practiceTestId),
    });
}

/**
 * Mutation nộp bài thi.
 */
export function useSubmitMockTestMutation() {
    return useMutation({
        mutationFn: ({ attemptId, answers }) =>
            submitMockTestAttempt(attemptId, answers),
    });
}

/**
 * Query lấy kết quả lượt thi.
 */
export function useMockTestAttemptQuery(attemptId) {
    return useQuery({
        queryKey: mockTestKeys.attempt(attemptId),
        queryFn: () => getMockTestAttempt(attemptId),
        enabled: Boolean(attemptId),
    });
}