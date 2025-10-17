import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { useSignupForm } from '../../hooks/useSignupForm';

const SignupForm: React.FC = () => {
  const navigate = useNavigate();
  const {
    formData,
    errors,
    isLoading,
    isSuccess,
    handleChange,
    handleSubmit,
    clearError,
  } = useSignupForm();

  React.useEffect(() => {
    if (isSuccess) {
      // Redirect to a success page or login page after successful signup
      // For now, you can customize this behavior
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
  }, [isSuccess, navigate]);

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Sign up to get started</p>
        </div>

        {errors.general && (
          <div className="mb-6">
            <Alert
              type="error"
              message={errors.general}
              onClose={() => clearError('general')}
            />
          </div>
        )}

        {isSuccess && (
          <div className="mb-6">
            <Alert
              type="success"
              message="Account created successfully! Redirecting to login..."
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              type="text"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              error={errors.firstName}
              disabled={isLoading || isSuccess}
              required
            />
            <Input
              label="Last Name"
              type="text"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              error={errors.lastName}
              disabled={isLoading || isSuccess}
              required
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="john.doe@example.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            disabled={isLoading || isSuccess}
            autoComplete="email"
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={errors.password}
            disabled={isLoading || isSuccess}
            autoComplete="new-password"
            helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            disabled={isLoading || isSuccess}
            autoComplete="new-password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            disabled={isSuccess}
          >
            {isSuccess ? 'Account Created!' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
};

export default SignupForm;
