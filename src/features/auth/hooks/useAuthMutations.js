import { useMutation } from '@tanstack/react-query';
import {
  changePassword,
  changeUnverifiedEmail,
  loginAccount,
  registerAccount,
  requestPasswordReset,
  resendPendingEmail,
  resendVerificationEmail,
  resetPassword,
  setPassword,
  updateEmail,
  verifyEmail,
} from '@/features/auth/api/authApi.js';
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

export function useChangeUnverifiedEmailMutation() {
  return useMutation({ mutationFn: changeUnverifiedEmail });
}

export function useRequestPasswordResetMutation() {
  return useMutation({ mutationFn: requestPasswordReset });
}

export function useResetPasswordMutation() {
  return useMutation({ mutationFn: resetPassword });
}

export function useUpdateEmailMutation() {
  return useMutation({
    mutationFn: ({ userId, newEmail, currentPassword }) =>
      updateEmail(userId, { newEmail, currentPassword }),
  });
}

export function useResendPendingEmailMutation() {
  return useMutation({
    mutationFn: () => resendPendingEmail(),
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({ userId, currentPassword, newPassword, confirmPassword }) =>
      changePassword(userId, { currentPassword, newPassword, confirmPassword }),
  });
}

export function useSetPasswordMutation() {
  return useMutation({
    mutationFn: ({ newPassword, confirmPassword }) =>
      setPassword({ newPassword, confirmPassword }),
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
