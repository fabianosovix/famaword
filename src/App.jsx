import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SettingsProvider } from '@/lib/SettingsProvider';
// Auth pages (lazy: public visitors don't download auth code)
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const UserNotRegisteredError = lazy(() => import('@/components/UserNotRegisteredError'));
const PageNotFound = lazy(() => import('./lib/PageNotFound'));
// Public site (Home eager = LCP-critical; other pages lazy)
import PublicLayout from '@/components/public/PublicLayout';
import Home from '@/pages/Home';
const ArticlePage = lazy(() => import('@/pages/ArticlePage'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));
const StaticPage = lazy(() => import('@/pages/StaticPage'));
// Admin (lazy-loaded: public visitors don't download admin code)
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminArticles = lazy(() => import('@/pages/admin/AdminArticles'));
const AdminArticleEdit = lazy(() => import('@/pages/admin/AdminArticleEdit'));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'));
const AdminPages = lazy(() => import('@/pages/admin/AdminPages'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminAI = lazy(() => import('@/pages/admin/AdminAI'));
const AdminEditors = lazy(() => import('@/pages/admin/AdminEditors'));

const AdminFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError && authError.type === 'user_not_registered') {
    return <Suspense fallback={<AdminFallback />}><UserNotRegisteredError /></Suspense>;
  }

  return (
    <SettingsProvider>
      <Suspense fallback={<AdminFallback />}>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Public site */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/artigo/:slug" element={<ArticlePage />} />
          <Route path="/categoria/:slug" element={<CategoryPage />} />
          <Route path="/pagina/:slug" element={<StaticPage />} />
        </Route>

        {/* Admin panel */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<Suspense fallback={<AdminFallback />}><AdminLayout /></Suspense>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/artigos" element={<AdminArticles />} />
            <Route path="/admin/artigos/novo" element={<AdminArticleEdit />} />
            <Route path="/admin/artigos/:id" element={<AdminArticleEdit />} />
            <Route path="/admin/categorias" element={<AdminCategories />} />
            <Route path="/admin/paginas" element={<AdminPages />} />
            <Route path="/admin/ia" element={<AdminAI />} />
            <Route path="/admin/editores" element={<AdminEditors />} />
            <Route path="/admin/usuarios" element={<AdminUsers />} />
            <Route path="/admin/configuracoes" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
      </Suspense>
    </SettingsProvider>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App