export const CONFIG = {
    ANIMATION_DURATION: 1000
};

const MAC_MINI_BASE_PATH = '/skriblerne';
const isMacMiniDeployment =
    window.location.pathname === MAC_MINI_BASE_PATH ||
    window.location.pathname.startsWith(`${MAC_MINI_BASE_PATH}/`);
const isLocalDevelopment =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

const API_BASE_URL = isMacMiniDeployment
    ? `${window.location.origin}${MAC_MINI_BASE_PATH}`
    : isLocalDevelopment
        ? window.location.origin
    : 'https://henrymeen.no/skriblerne';

export { API_BASE_URL };
