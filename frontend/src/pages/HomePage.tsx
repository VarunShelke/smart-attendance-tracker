import React from 'react';
import {Link} from 'react-router-dom';
import Button from '../components/ui/Button';

const HomePage: React.FC = () => {
    return (
        <div
            className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4">
            <div className="text-center">
                <h1 className="text-5xl font-bold text-gray-900 mb-4">
                    Smart Attendance Tracker
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                    Efficiently manage and track attendance with ease
                </p>

                <div className="flex gap-4 justify-center">
                    <Link to="/signup">
                        <Button variant="primary">Get Started</Button>
                    </Link>
                    <Link to="/login">
                        <Button variant="outline">Sign In</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
