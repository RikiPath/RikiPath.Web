import { useMutation } from '@tanstack/react-query';
import { changePassword, loginAccount, registerAccount, resendVerificationEmail, updateEmail, verifyEmail } from '@/features/auth/api/authApi.js';
import { setJlptGoal } from '@/features/profile/api/profileApi.js';
import { queryClient } from '@/api/queryClient.js';
import { learnerKeys, learnerProfileQueryKey } from '@/features/dashboard/hooks/useLearnerHome.js';

export function useRegisterMutation() {
  return useMutation({ mutationFn: registerAccount });
}

export function useLoginMutation() {
  return useMutation({ mutationFn: loginAccount });
}

export function useVerifyEmailMutation() {
  return useMutation({ mutationFn: verifyEmail });
}

export function useResendVerificationMutation() {
  return useMutation({ mutationFn: resendVerificationEmail });
}

export function useUpdateEmailMutation() {
  return useMutation({
    mutationFn: ({ userId, newEmail }) => updateEmail(userId, { newEmail }),
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({ userId, currentPassword, newPassword, confirmPassword }) =>
      changePassword(userId, { currentPassword, newPassword, confirmPassword }),
  });
}

export function useSetJlptGoalMutation() {
  return useMutation({
    mutationFn: (payload) => setJlptGoal(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(learnerProfileQueryKey(), profile);
      queryClient.invalidateQueries({ queryKey: learnerKeys.profile });
      queryClient.removeQueries({ queryKey: ['placement-assessment'], type: 'inactive' });
      void queryClient.invalidateQueries({ queryKey: ['assessment-roadmap'] });
    },
  });
}
