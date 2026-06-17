export const STORE_INFO_KEY = 'admin_store_info';
export const DEFAULT_STORE_LOGO_SRC = '/images/store-logo.png';

export const readStoredStoreInfo = () => {
  try {
    const info = JSON.parse(localStorage.getItem(STORE_INFO_KEY) || 'null');
    if (info && info.logoUrl && info.logoUrl.startsWith('data:')) {
      info.logoUrl = DEFAULT_STORE_LOGO_SRC;
    }
    return info;
  } catch {
    return null;
  }
};

export const getStoreLogoUrl = (fallback = DEFAULT_STORE_LOGO_SRC) => {
  const storedStoreInfo = readStoredStoreInfo();
  const url = storedStoreInfo?.logoUrl || fallback;
  return url.startsWith('data:') ? fallback : url;
};
