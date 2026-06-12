import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../../services/api';
import useStoreLogo from '../../../hooks/useStoreLogo';

const CustomerForgotPassword = () => {
  const navigate = useNavigate();
  const storeLogoUrl = useStoreLogo();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetRequestId, setResetRequestId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [timer, setTimer] = useState(59);
  const [timerActive, setTimerActive] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!email.trim()) {
      setErrors({ email: 'Email is required.' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/password-reset/request', {
        email: email.trim(),
      });

      if (!response.data?.ok) {
        throw new Error('Failed to send OTP');
      }

      setResetRequestId(response.data.requestId);
      setCurrentStep(2);
      setTimer(59);
      setTimerActive(true);
      toast.success('OTP sent to your registered email successfully!');
    } catch (error) {
      const resp = error?.response;
      const detail = resp?.data?.detail;
      const message = typeof detail === 'string' ? detail : 'Failed to send OTP. Please try again.';
      if (resp?.status === 404) {
        setErrors({ email: message });
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (timer === 0) {
      toast.error('OTP has expired. Please request a new one.');
      return;
    }
    const enteredOtp = otp.join('');
    
    if (enteredOtp.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP.');
      return;
    }

    if (!resetRequestId) {
      toast.error('Please request a new OTP.');
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/password-reset/verify', {
        requestId: resetRequestId,
        otp: enteredOtp,
      });

      if (!response.data?.ok) {
        const message = response.data?.reason === 'expired'
          ? 'OTP has expired. Please request a new one.'
          : response.data?.reason === 'locked'
            ? 'Too many attempts. Please request a new OTP.'
            : 'Invalid OTP. Please try again.';
        toast.error(message);
        if (response.data?.reason === 'expired' || response.data?.reason === 'locked') {
          setCurrentStep(1);
        }
        return;
      }

      toast.success('OTP verified successfully!');
      setCurrentStep(3);
      setTimerActive(false);
    } catch (error) {
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval = null;
    if (timerActive && currentStep === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timer, currentStep]);

  const handleResendOtp = async () => {
    setLoading(true);
    setOtp(['', '', '', '', '', '']);
    try {
      const response = await api.post('/password-reset/request', {
        email: email.trim(),
      });

      if (!response.data?.ok) {
        throw new Error('Failed to resend OTP');
      }

      setResetRequestId(response.data.requestId);
      toast.success('A new OTP has been sent successfully!');

      setTimer(59);
      setTimerActive(true);

      setTimeout(() => {
        const firstInput = document.getElementById('otp-0');
        if (firstInput) firstInput.focus();
      }, 50);
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrors({});
    const newErrors = {};

    if (!newPassword) {
      newErrors.newPassword = 'Password is required.';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/password-reset/complete', {
        requestId: resetRequestId,
        newPassword
      });

      if (response.data?.ok) {
        toast.success('Password reset successfully!');
        navigate('/customer/login');
      } else {
        toast.error('Failed to reset password. Please try again.');
      }
    } catch (error) {
      const resp = error?.response;
      const detail = resp?.data?.detail;
      const message = typeof detail === 'string' ? detail : 'Failed to reset password. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-yellow-50 to-yellow-100 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-yellow-50 border border-yellow-200 rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-yellow-100 mx-auto flex items-center justify-center mb-3 overflow-hidden">
            <img src={storeLogoUrl} alt="Mian & Sons logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Forgot Password</h1>
          <p className="text-sm text-gray-600 mt-1">
            {currentStep === 1 && "Enter your email to receive an OTP"}
            {currentStep === 2 && "Enter the OTP sent to your email"}
            {currentStep === 3 && "Create a new password"}
          </p>
        </div>

        {/* Step 1: Email */}
        {currentStep === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: '' }));
                }}
                className="mt-1 w-full rounded-md border border-yellow-200 p-2.5 bg-yellow-50"
                placeholder="Enter your registered email"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold hover:from-yellow-500 hover:to-yellow-700 disabled:opacity-70"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* Step 2: Verify OTP */}
        {currentStep === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  disabled={timer === 0}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-10 h-10 sm:w-12 sm:h-12 text-center text-xl font-bold border rounded-md border-yellow-200 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none disabled:bg-yellow-100 disabled:text-gray-400"
                />
              ))}
            </div>

            <div className="text-center">
              {timer > 0 ? (
                <p className="text-sm text-gray-500">
                    OTP expires in <span className="font-semibold text-yellow-600">{timer}s</span>
                  </p>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs text-red-500 font-medium">OTP has expired</p>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-sm font-semibold text-secondary hover:underline"
                  >
                    Resend OTP
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || timer === 0}
              className="w-full py-2.5 rounded-md bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold hover:from-yellow-500 hover:to-yellow-700 disabled:opacity-70"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div className="text-center mt-2">
               <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setTimerActive(false);
                  }}
                  className="text-sm text-primary hover:underline"
               >
                  Change Email
               </button>
            </div>
          </form>
        )}

        {/* Step 3: Reset Password */}
        {currentStep === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, newPassword: '' }));
                }}
                className="mt-1 w-full rounded-md border border-yellow-200 p-2.5 bg-yellow-50"
                placeholder="Enter new password"
              />
              {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                className="mt-1 w-full rounded-md border border-gray-300 p-2.5"
                placeholder="Confirm new password"
              />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold hover:from-yellow-500 hover:to-yellow-700 disabled:opacity-70"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/customer/login" className="text-sm text-gray-600 hover:text-primary font-medium">
            &larr; Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerForgotPassword;
