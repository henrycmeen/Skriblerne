export const CONFIG = {
    ANIMATION_DURATION: 1000
};

const MAC_MINI_BASE_PATH = '/skriblerne';
const isMacMiniDeployment =
    window.location.pathname === MAC_MINI_BASE_PATH ||
    window.location.pathname.startsWith(`${MAC_MINI_BASE_PATH}/`);

const API_BASE_URL = isMacMiniDeployment
    ? `${window.location.origin}${MAC_MINI_BASE_PATH}`
    : 'https://skriblerne-api.vercel.app';

export { API_BASE_URL };
