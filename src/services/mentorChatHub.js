import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { getSession } from '../auth/session.js';

// Private booking chat has its own connection and never joins a meeting room.
export function createMentorChatConnection() {
  return new HubConnectionBuilder()
    .withUrl(import.meta.env.VITE_MENTOR_CHAT_HUB || '/hubs/mentor-chat', {
      accessTokenFactory: () => getSession()?.accessToken || getSession()?.token || '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
    .build();
}
