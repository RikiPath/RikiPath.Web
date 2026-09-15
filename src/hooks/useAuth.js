import { useMutation } from '@tanstack/react-query';
import { changePassword, loginAccount, registerAccount, updateEmail, verifyEmail } from '../api/auth.js';
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
    mutationFn: ({ targetJlptLevelId, dailyStudyMinutes }) =>
      setJlptGoal({ targetJlptLevelId, dailyStudyMinutes }),
    onSuccess: (profile) => {
      queryClient.setQueryData(learnerKeys.profile, profile);
    },
  });
}
