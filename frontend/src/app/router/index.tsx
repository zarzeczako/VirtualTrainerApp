import { createBrowserRouter } from 'react-router-dom';
import Login from '../../pages/auth/Login.tsx';
import Register from '../../pages/auth/Register.tsx';
import OnboardingSurvey from '../../pages/auth/OnboardingSurvey.tsx';
import ForgotPassword from '../../pages/auth/ForgotPassword.tsx';
import ResetPassword from '../../pages/auth/ResetPassword.tsx';
import AuthCallback from '../../pages/auth/AuthCallback.tsx';
import App from '../../pages/home/App.tsx';
import HomePage from '../../pages/home/HomePage.tsx';
import PublicRoute from '../../components/PublicRoute.tsx';
import ExerciseAtlasPage from '../../pages/home/pages/ExerciseAtlasPage';
import ProgressPage from '../../pages/ProgressPage';
import ChatAssistantPage from '../../pages/home/pages/ChatAssistantPage';
import Gyms from '../../pages/home/pages/GymsMapPage';
import PlansPage from '../../pages/home/pages/PlansPage';
import PlanDetailPage from '../../pages/home/pages/PlanDetailPage';
import AdminLayout from '../../pages/admin/AdminLayout';
import AdminDashboard from '../../pages/admin/pages/AdminDashboard';
import AdminUsersPage from '../../pages/admin/pages/AdminUsersPage';
import AdminExercisesPage from '../../pages/admin/pages/AdminExercisesPage';
import AdminSettingsPage from '../../pages/admin/pages/AdminSettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/dashboard',
    element: <App />,
  },
  { path: '/plans', element: <PlansPage /> },
  { path: '/plan/:id', element: <PlanDetailPage /> },
  { path: '/atlas', element: <ExerciseAtlasPage /> },
  { path: '/progress', element: <ProgressPage /> },
  { path: '/chat-ai', element: <ChatAssistantPage /> },
  { path: '/gyms', element: <Gyms /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'exercises', element: <AdminExercisesPage /> },
      { path: 'settings', element: <AdminSettingsPage /> },
    ],
  },
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute>
        <Register />
      </PublicRoute>
    ),
  },
  {
    path: '/onboarding',
    element: (
      <PublicRoute>
        <OnboardingSurvey />
      </PublicRoute>
    ),
  },
  {
    path: '/onboarding-survey',
    element: <OnboardingSurvey />,
  },
  {
    path: '/forgot-password',
    element: (
      <PublicRoute>
        <ForgotPassword />
      </PublicRoute>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <PublicRoute>
        <ResetPassword />
      </PublicRoute>
    ),
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },
]);
