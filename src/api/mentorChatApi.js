import { api } from './client.js';

const root = '/mentor-chat/threads';
export const getChatThreads = async () => (await api.get(root)).result;
export const getChatThread = async (id) => (await api.get(`${root}/${id}`)).result;
export const getChatMessages = async (id, beforeMessageId) => (await api.get(`${root}/${id}/messages`, {
  params: { pageSize: 50, beforeMessageId },
})).result;
