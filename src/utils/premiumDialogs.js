import Swal from 'sweetalert2';

const baseDialog = Swal.mixin({
  background: '#111827',
  color: '#f9fafb',
  backdrop: 'rgba(0, 0, 0, 0.7)',
  showClass: {
    popup: 'swal2-show premium-swal-enter',
    backdrop: 'swal2-backdrop-show'
  },
  hideClass: {
    popup: 'swal2-hide premium-swal-exit',
    backdrop: 'swal2-backdrop-hide'
  },
  customClass: {
    popup: 'premium-swal-popup',
    title: 'premium-swal-title',
    htmlContainer: 'premium-swal-text',
    confirmButton: 'premium-swal-confirm',
    cancelButton: 'premium-swal-cancel',
    input: 'premium-swal-input'
  },
  buttonsStyling: false,
  reverseButtons: true,
  focusCancel: true,
  allowOutsideClick: false,
  allowEscapeKey: true,
  scrollbarPadding: false
});

export const showPremiumConfirm = async ({
  title = 'Confirm Action',
  text = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  icon = 'warning'
} = {}) => {
  const result = await baseDialog.fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    iconColor: '#facc15',
    confirmButtonColor: '#facc15',
    cancelButtonColor: '#111827'
  });

  return result.isConfirmed;
};

export const showPremiumPrompt = async ({
  title = 'Enter Value',
  text = '',
  inputValue = '',
  inputPlaceholder = '',
  inputLabel = '',
  confirmText = 'Continue',
  cancelText = 'Cancel',
  inputValidator,
  inputType = 'text'
} = {}) => {
  const result = await baseDialog.fire({
    icon: 'question',
    title,
    text,
    input: inputType,
    inputValue,
    inputPlaceholder,
    inputLabel,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    iconColor: '#facc15',
    confirmButtonColor: '#facc15',
    cancelButtonColor: '#111827',
    preConfirm: (value) => {
      if (typeof inputValidator === 'function') {
        return inputValidator(value);
      }

      return value;
    }
  });

  if (!result.isConfirmed) {
    return null;
  }

  return typeof result.value === 'string' ? result.value.trim() : result.value;
};
