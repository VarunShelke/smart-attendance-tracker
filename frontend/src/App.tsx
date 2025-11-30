import {BrowserRouter as Router, Navigate, Route, Routes} from 'react-router-dom';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import FaceRegistrationPage from './pages/FaceRegistrationPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import {AuthProvider} from './contexts/AuthProvider';
import './config/amplify';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Navigate to="/login" replace/>}/>
                    <Route path="/login" element={<LoginPage/>}/>
                    <Route path="/signup" element={<SignupPage/>}/>
                    <Route path="/verify-email" element={<VerifyEmailPage/>}/>
                    <Route path="/face-registration" element={<FaceRegistrationPage/>}/>
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <DashboardPage/>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <ProfilePage/>
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/login" replace/>}/>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
