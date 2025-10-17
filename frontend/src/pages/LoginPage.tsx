import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          <div className="space-y-4">
            <p className="text-center text-gray-600">Login page - Coming soon!</p>

            <div className="pt-4">
              <Link to="/signup">
                <Button variant="outline" fullWidth>
                  Don't have an account? Sign up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
