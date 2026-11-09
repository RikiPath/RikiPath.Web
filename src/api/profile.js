import { api } from './client.js';

export async function getMyProfile() {
  const data = await api.get('/UserProfile/me');
  return data.result;
}

export async function setJlptGoal(payload) {
  const data = await api.post('/UserProfile/me/jlpt-goal', payload);
  return data.result;
}

export async function updateProfile({ firstName, lastName }) {
  const data = await api.put('/UserProfile/me', { firstName, lastName });
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

export async function setStudyLevel({ currentStudyLevelId }) {
  const data = await api.put('/UserProfile/me/study-level', {
    currentStudyLevelId,
    confirmed: true,
  });
  return data.result;
}

export async function updateNotificationSettings({ emailNotificationsEnabled, systemNotificationsEnabled }) {
  const data = await api.put('/UserProfile/me/notification-settings', {
    emailNotificationsEnabled,
    systemNotificationsEnabled,
  });
  return data.result;
}
