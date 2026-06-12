import { toast } from 'react-toastify';

export const showActionToast = (type, message, options = {}) => {
  const {
    path,
    toastId,
    replace = false,
    onClick,
    ...restOptions
  } = options;

  const handleClick = () => {
    if (typeof onClick === 'function') {
      onClick();
      return;
    }

    if (!path || typeof window === 'undefined') return;

    if (replace) {
      window.location.replace(path);
      return;
    }

    window.location.assign(path);
  };

  const toastOptions = {
    toastId,
    closeOnClick: true,
    onClick: handleClick,
    ...restOptions
  };

  if (typeof toast[type] === 'function') {
    toast[type](message, toastOptions);
    return;
  }

  toast(message, toastOptions);
};
