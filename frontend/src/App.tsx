import {BrowserRouter as Router, Navigate, Route, Routes} from 'react-router-dom';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import CompleteSignInPage from './pages/CompleteSignInPage';
import FaceRegistrationPage from './pages/FaceRegistrationPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import {LandingPage} from './pages/LandingPage';
import {AdminDashboardPage} from './pages/admin/AdminDashboardPage';
import {InstructorDashboardPage} from './pages/instructor/InstructorDashboardPage';
import {UniversitiesManagePage} from './pages/admin/UniversitiesManagePage';
import {SchedulesManagePage} from './pages/admin/SchedulesManagePage';
import {StudentsManagePage} from './pages/admin/StudentsManagePage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import {RoleProtectedRoute} from './components/auth/RoleProtectedRoute';
import {AuthProvider} from './contexts/AuthProvider';
import {UserRole} from './types/auth';
import './config/amplify';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Landing page with role-based redirect */}
                    <Route path="/" element={<LandingPage />}/>

                    {/* Public routes */}
                    <Route path="/login" element={<LoginPage/>}/>
                    <Route path="/signup" element={<SignupPage/>}/>
                    <Route path="/verify-email" element={<VerifyEmailPage/>}/>
                    <Route path="/complete-signin" element={<CompleteSignInPage/>}/>
                    <Route path="/face-registration" element={<FaceRegistrationPage/>}/>

                    {/* Student routes */}
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

                    {/* Admin routes */}
                    <Route
                        path="/admin/dashboard"
                        element={
                            <RoleProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                                <AdminDashboardPage/>
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/universities"
                        element={
                            <RoleProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                                <UniversitiesManagePage/>
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/students"
                        element={
                            <RoleProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                                <StudentsManagePage/>
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/schedules"
                        element={
                            <RoleProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.INSTRUCTOR]}>
                                <SchedulesManagePage/>
                            </RoleProtectedRoute>
                        }
                    />

                    {/* Instructor routes */}
                    <Route
                        path="/instructor/dashboard"
                        element={
                            <RoleProtectedRoute requiredRoles={[UserRole.INSTRUCTOR]}>
                                <InstructorDashboardPage/>
                            </RoleProtectedRoute>
                        }
                    />

                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to="/" replace/>}/>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
