import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { hubEndpoint } from '../config/backend.js';
import { getSession } from '../auth/session.js';

// Private booking chat has its own connection and never joins a meeting room.
export function createMentorChatConnection() {
  return new HubConnectionBuilder()
    .withUrl(hubEndpoint('/hubs/mentor-chat'), {
      accessTokenFactory: () => getSession()?.accessToken || getSession()?.token || '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
    .build();
}
