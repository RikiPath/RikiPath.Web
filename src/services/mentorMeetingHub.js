/**
 * Real-time SignalR Hub Client for WebRTC Mentor Meeting
 * Hub URL: /hubs/mentor-meeting
 */

const HUB_ENDPOINT = '/hubs/mentor-meeting';
const DEFAULT_BACKEND_ORIGIN = 'https://localhost:7237';

/**
 * Dynamically loads @microsoft/signalr script if not present in window
 */
export async function loadSignalRLib() {
  if (window.signalR) {
    return window.signalR;
  }

  return new Promise((resolve, reject) => {
    // Check if script is already being loaded
    const existingScript = document.querySelector('script[data-signalr-loader]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.signalR));
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('data-signalr-loader', 'true');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/8.0.7/signalr.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.signalR) {
        resolve(window.signalR);
      } else {
        reject(new Error('SignalR script loaded but window.signalR is not defined'));
      }
    };
    script.onerror = (err) => reject(new Error('Failed to load SignalR library from CDN: ' + err));
    document.head.appendChild(script);
  });
}

/**
 * Creates and starts a SignalR Hub Connection to /hubs/mentor-meeting
 * @param {string} token - Optional JWT Access Token
 * @param {string} [customHubUrl] - Optional full or relative hub URL
 */
export async function createMeetingHubConnection(token, customHubUrl) {
  const signalR = await loadSignalRLib();

  // Determine full target URL (handling direct localhost:7237 or vite proxy)
  let url = customHubUrl;
  if (!url) {
    // If running in dev on port 5173, point to backend 7237 directly or relative /hubs/mentor-meeting
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    url = isLocalhost ? `${DEFAULT_BACKEND_ORIGIN}${HUB_ENDPOINT}` : HUB_ENDPOINT;
  }

  const builder = new signalR.HubConnectionBuilder()
    .withUrl(url, {
      accessTokenFactory: () => token || '',
      skipNegotiation: false,
      transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Information);

  const connection = builder.build();

  return connection;
}
