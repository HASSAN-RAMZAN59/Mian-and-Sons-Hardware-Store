import { useEffect, useState } from 'react';
import { DEFAULT_STORE_LOGO_SRC, STORE_INFO_KEY, readStoredStoreInfo } from '../utils/storeBranding';

const readLogoUrl = () => {
  const storedStoreInfo = readStoredStoreInfo();
  return storedStoreInfo?.logoUrl || DEFAULT_STORE_LOGO_SRC;
};

const useStoreLogo = () => {
  const [logoUrl, setLogoUrl] = useState(readLogoUrl);

  useEffect(() => {
    const syncLogo = () => {
      setLogoUrl(readLogoUrl());
    };

    const handleStorage = (event) => {
      if (event.key === STORE_INFO_KEY) {
        syncLogo();
      }
    };

    const handleCustomUpdate = (event) => {
      if (event?.detail?.key === STORE_INFO_KEY || event?.detail?.key === null) {
        syncLogo();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, []);

  return logoUrl;
};

export default useStoreLogo;