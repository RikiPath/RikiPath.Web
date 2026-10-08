// src/api/speechApi.js
import { api } from './client.js';

function result(response) {
    return response?.result ?? response;
}

export async function getSpeechToken() {
    return result(await api.get('/Speech/get-token'));
}