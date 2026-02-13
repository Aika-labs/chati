import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth, useUser } from '@clerk/clerk-react';

// Pages
import { LandingPage } from './pages/landing/LandingPage';
import { SignInPage } from './pages/auth/SignInPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { PlanSelectionPage } from './pages/onboarding/PlanSelectionPage';
import { CheckoutSuccessPage } from './pages/onboarding/CheckoutSuccessPage';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { ConversationsPage } from './pages/dashboard/ConversationsPage';
import { ContactsPage } from './pages/dashboard/ContactsPage';
import { CalendarPage } from './pages/dashboard/CalendarPage';
import { DocumentsPage } from './pages/dashboard/DocumentsPage';
import { ProductsPage } from './pages/dashboard/ProductsPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { TemplatesPage } from './pages/dashboard/TemplatesPage';

// Layout
import { DashboardLayout } from './components/layout';

// Store
import { useAuthStore } from './stores/auth.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Protected Route wrapper using Clerk
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}

// Public Route wrapper (redirect if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Sync Clerk auth with backend
function AuthSync() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { syncWithClerk, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    async function sync() {
      if (isSignedIn && user) {
        try {
          const token = await getToken();
          if (token) {
            await syncWithClerk(token);
          }
        } catch (error) {
          console.error('Failed to sync with backend:', error);
        }
      } else if (!isSignedIn) {
        logout();
      }
    }
    sync();
  }, [isSignedIn, user, getToken, syncWithClerk, logout, navigate]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <AuthSync />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/sign-in/*"
          element={
            <PublicRoute>
              <SignInPage />
            </PublicRoute>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <PublicRoute>
              <SignUpPage />
            </PublicRoute>
          }
        />
        
        {/* Legacy routes - redirect to new ones */}
        <Route path="/login" element={<Navigate to="/sign-in" replace />} />
        <Route path="/register" element={<Navigate to="/sign-up" replace />} />

        {/* Onboarding routes (protected) */}
        <Route
          path="/onboarding/plan"
          element={
            <ProtectedRoute>
              <PlanSelectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding/success"
          element={
            <ProtectedRoute>
              <CheckoutSuccessPage />
            </ProtectedRoute>
          }
        />

        {/* Protected dashboard routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="conversations" element={<ConversationsPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
