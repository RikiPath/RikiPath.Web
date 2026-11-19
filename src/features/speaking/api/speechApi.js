// src/api/speechApi.js
import { api } from '@/api/client.js';

function result(response) {
    return response?.result ?? response;
}

export async function createSpeechStreamingSession() {
    return result(await api.post('/Speech/streaming-session'));
}
