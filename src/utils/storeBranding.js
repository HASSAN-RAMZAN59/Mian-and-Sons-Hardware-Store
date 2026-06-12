export const STORE_INFO_KEY = 'admin_store_info';
export const DEFAULT_STORE_LOGO_SRC = '/images/store-logo.png';

export const readStoredStoreInfo = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_INFO_KEY) || 'null');
  } catch {
    return null;
  }
};

export const getStoreLogoUrl = (fallback = DEFAULT_STORE_LOGO_SRC) => {
  const storedStoreInfo = readStoredStoreInfo();
  return storedStoreInfo?.logoUrl || fallback;
};
