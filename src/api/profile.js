import { api } from './client.js';

export async function getMyProfile() {
  const data = await api.get('/UserProfile/me');
  return data.result;
}

export async function setJlptGoal(payload) {
  const data = await api.post('/UserProfile/me/jlpt-goal', payload);
  return data.result;
}

export async function updateNotificationSettings({ emailNotificationsEnabled, systemNotificationsEnabled }) {
  const data = await api.put('/UserProfile/me/notification-settings', {
    emailNotificationsEnabled,
    systemNotificationsEnabled,
  });
  return data.result;
}
