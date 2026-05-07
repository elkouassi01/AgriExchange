const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const getBrowserHostname = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.hostname;
};

const isLocalBrowser = LOCAL_HOSTS.has(getBrowserHostname());

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const configuredServerUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = trimTrailingSlash(
  isLocalBrowser ? '/api/v1' : configuredApiBaseUrl || '/api/v1'
);

export const SERVER_BASE_URL = trimTrailingSlash(
  isLocalBrowser
    ? ''
    : configuredServerUrl || configuredApiBaseUrl?.replace(/\/api\/v1\/?$/, '') || ''
);

export const buildApiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const buildUploadUrl = (path) => {
  if (!path) {
    return '';
  }

  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }

  if (path.startsWith('/uploads')) {
    return `${SERVER_BASE_URL}${path}`;
  }

  if (path.startsWith('/')) {
    return `${SERVER_BASE_URL}${path}`;
  }

  return `${SERVER_BASE_URL}/uploads/${path}`;
};
