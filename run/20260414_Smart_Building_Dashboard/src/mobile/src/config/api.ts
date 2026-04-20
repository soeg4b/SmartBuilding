import { Platform } from 'react-native';

const API_BASE_URLS: Record<string, string> = {
  android: 'http://10.0.2.2:5000',
  ios: 'http://localhost:5000',
  default: 'http://localhost:5000',
};

export const API_BASE_URL =
  API_BASE_URLS[Platform.OS] ?? API_BASE_URLS.default;

export const API_PREFIX = '/api/v1';

export const getApiUrl = (path: string): string =>
  `${API_BASE_URL}${API_PREFIX}${path}`;

export const WS_URL = API_BASE_URL;
