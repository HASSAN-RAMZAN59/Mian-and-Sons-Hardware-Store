import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEnvelope, FaLock, FaCheckCircle, FaArrowLeft, FaKey } from 'react-icons/fa';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { createPasswordReset, verifyPasswordResetOtp, completePasswordReset } from '../../utils/authStore';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resetRequestId, setResetRequestId] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    otp: ['', '', '', '', '', ''],
    newPassword: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...formData.otp];
      newOtp[index] = value;
      setFormData(prev => ({ ...prev, otp: newOtp }));
      
      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Validate Step 1
  const validateStep1 = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email or username is required';
    } else if (formData.email.includes('@') && !emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate Step 2
  const validateStep2 = () => {
    const otpValue = formData.otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter complete 6-digit OTP');
      return false;
    }
    return true;
  };

  // Validate Step 3
  const validateStep3 = () => {
    const newErrors = {};
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Step 1 submit (Send OTP)
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    
    if (!validateStep1()) return;
    
    setLoading(true);
    try {
      const result = await createPasswordReset(formData.email);
      if (!result.ok) {
        setErrors({ email: 'No account found with that email or username.' });
        return;
      }

      setResetRequestId(result.requestId);
      toast.success('OTP sent to your email successfully!', {
        position: 'top-right',
        autoClose: 3000,
      });
      toast.info(`Demo OTP: ${result.otp}`, {
        position: 'top-right',
        autoClose: 5000,
      });

      setCurrentStep(2);
    } catch (error) {
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2 submit (Verify OTP)
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) return;
    
    setLoading(true);
    try {
      if (!resetRequestId) {
        toast.error('Please request a new OTP.');
        setCurrentStep(1);
        return;
      }

      const otpValue = formData.otp.join('');
      const result = await verifyPasswordResetOtp(resetRequestId, otpValue);

      if (!result.ok) {
        const message = result.reason === 'expired'
          ? 'OTP expired. Please request a new one.'
          : result.reason === 'locked'
            ? 'Too many attempts. Please request a new OTP.'
            : 'Invalid OTP. Please try again.';
        toast.error(message);
        if (result.reason === 'expired' || result.reason === 'locked') {
          setCurrentStep(1);
        }
        return;
      }

      toast.success('OTP verified successfully!', {
        position: 'top-right',
        autoClose: 2000,
      });

      setCurrentStep(3);
    } catch (error) {
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 3 submit (Reset Password)
  const handleStep3Submit = async (e) => {
    e.preventDefault();
    
    if (!validateStep3()) return;
    
    setLoading(true);
    try {
      if (!resetRequestId) {
        toast.error('Please request a new OTP.');
        setCurrentStep(1);
        return;
      }

      const result = await completePasswordReset(resetRequestId, formData.newPassword);
      if (!result.ok) {
        const message = result.reason === 'expired'
          ? 'Reset request expired. Please start again.'
          : result.reason === 'not_verified'
            ? 'Please verify the OTP first.'
            : 'Failed to reset password. Please try again.';
        toast.error(message);
        if (result.reason === 'expired' || result.reason === 'not_verified') {
          setCurrentStep(1);
        }
        return;
      }

      toast.success('Password reset successfully! Redirecting to login...', {
        position: 'top-right',
        autoClose: 3000,
      });

      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error) {
      toast.error('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const result = await createPasswordReset(formData.email);
      if (!result.ok) {
        toast.error('Unable to resend OTP. Please check your email or username.');
        return;
      }

      setResetRequestId(result.requestId);
      toast.success('OTP resent successfully!');
      toast.info(`Demo OTP: ${result.otp}`, {
        position: 'top-right',
        autoClose: 5000,
      });
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // Progress steps
  const steps = [
    { number: 1, title: 'Enter Email', icon: FaEnvelope },
    { number: 2, title: 'Verify OTP', icon: FaKey },
    { number: 3, title: 'Reset Password', icon: FaLock }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-primary rounded-full items-center justify-center mb-4">
            <FaLock className="text-2xl text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Forgot Password?
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            No worries, we'll help you reset it
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                      ${isActive ? 'bg-primary border-primary text-white' : ''}
                      ${isCompleted ? 'bg-green-500 border-green-500 text-white' : ''}
                      ${!isActive && !isCompleted ? 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500' : ''}
                    `}>
                      {isCompleted ? <FaCheckCircle size={20} /> : <Icon size={18} />}
                    </div>
                    <p className={`mt-2 text-xs font-medium ${
                      isActive ? 'text-primary' : 
                      isCompleted ? 'text-green-500' : 
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  
                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-6 ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}></div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Step 1: Enter Email */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Enter Your Email
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  We'll send you a 6-digit OTP to reset your password
                </p>
                
                <Input
                  label="Email or Username"
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Enter your email or username"
                  icon={<FaEnvelope />}
                  error={errors.email}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          )}

          {/* Step 2: Enter OTP */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Enter Verification Code
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  We've sent a 6-digit code to {formData.email}
                </p>
                
                <div className="flex justify-center gap-3 mb-4">
                  {formData.otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-12 text-center text-xl font-bold border-2 rounded-lg
                        bg-white dark:bg-gray-700
                        border-gray-300 dark:border-gray-600
                        text-gray-900 dark:text-white
                        focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary
                        transition-all"
                    />
                  ))}
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-sm text-primary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors disabled:opacity-50"
                  >
                    Didn't receive code? Resend OTP
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setCurrentStep(1)}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {currentStep === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Create New Password
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Your new password must be different from previously used passwords
                </p>
                
                <div className="space-y-4">
                  <Input
                    label="New Password"
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={(e) => handleChange('newPassword', e.target.value)}
                    placeholder="Enter new password"
                    icon={<FaLock />}
                    error={errors.newPassword}
                    helperText="Must be at least 6 characters"
                    required
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Re-enter new password"
                    icon={<FaLock />}
                    error={errors.confirmPassword}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>
          )}

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <Link 
              to="/admin/login" 
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-colors"
            >
              <FaArrowLeft className="mr-2" size={12} />
              Back to Login
            </Link>
          </div>
        </div>

        {/* Demo Info */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
          <p className="text-sm text-blue-900 dark:text-blue-300">
            <strong>Demo Mode:</strong> Enter any email and use any 6-digit code as OTP
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
