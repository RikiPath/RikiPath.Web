import { useMutation } from '@tanstack/react-query';
import { changePassword, loginAccount, registerAccount, resendVerificationEmail, updateEmail, verifyEmail } from '../api/auth.js';
import { setJlptGoal } from '../api/profile.js';
import { queryClient } from '../api/queryClient.js';
import { learnerKeys } from './useLearnerHome.js';

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
      queryClient.setQueryData([...learnerKeys.profile, 'live'], profile);
      queryClient.invalidateQueries({ queryKey: learnerKeys.profile });
      queryClient.removeQueries({ queryKey: ['placement-assessment'], type: 'inactive' });
      void queryClient.invalidateQueries({ queryKey: ['assessment-roadmap'] });
    },
  });
}
