import { api } from '@/api/client.js';

export async function getMyProfile() {
  const data = await api.get('/UserProfile/me');
  return data.result;
}

export async function setJlptGoal(payload) {
  const data = await api.post('/UserProfile/me/jlpt-goal', payload);
  return data.result;
}

export async function updateProfile({ fullName, phoneNumber, updatePhoneNumber = false, studyTimePreference }) {
  const payload = { fullName };
  if (updatePhoneNumber || phoneNumber !== undefined) {
    payload.phoneNumber = phoneNumber ?? null;
    payload.updatePhoneNumber = Boolean(updatePhoneNumber);
  }
  if (studyTimePreference !== undefined) {
    payload.studyTimePreference = studyTimePreference;
  }
  const data = await api.put('/UserProfile/me', payload);
  return data.result;
}

export async function updateAvatar(file) {
  const body = new FormData();
  body.append('avatarFile', file);
  const data = await api.post('/UserProfile/me/avatar', body, {
    transformRequest: [(payload, headers) => {
      delete headers['Content-Type'];
      return payload;
    }],
  });
  return data.result;
}

export async function deleteAvatar() {
  const data = await api.delete('/UserProfile/me/avatar');
  return data.result;
}

export async function setStudyLevel({ currentStudyLevelId }) {
  const data = await api.put('/UserProfile/me/study-level', {
    currentStudyLevelId,
    confirmed: true,
  });
  return data.result;
}

export async function setRoadmapMode(mode) {
  const data = await api.put('/UserProfile/me/roadmap-mode', { mode });
  return data.result;
}

export async function updateNotificationSettings({
  emailNotificationsEnabled,
  systemNotificationsEnabled,
  notificationCategories,
}) {
  const payload = {
    emailNotificationsEnabled,
    systemNotificationsEnabled,
  };
  if (notificationCategories && typeof notificationCategories === 'object') {
    payload.notificationCategories = notificationCategories;
  }
  const data = await api.put('/UserProfile/me/notification-settings', payload);
  return data.result;
}
