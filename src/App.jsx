import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SettingsProvider } from '@/lib/SettingsProvider';
// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// Public site
import PublicLayout from '@/components/public/PublicLayout';
import Home from '@/pages/Home';
import ArticlePage from '@/pages/ArticlePage';
import CategoryPage from '@/pages/CategoryPage';
import StaticPage from '@/pages/StaticPage';
// Admin
import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminArticles from '@/pages/admin/AdminArticles';
import AdminArticleEdit from '@/pages/admin/AdminArticleEdit';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminPages from '@/pages/admin/AdminPages';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminAI from '@/pages/admin/AdminAI';
import AdminEditors from '@/pages/admin/AdminEditors';

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
    return <UserNotRegisteredError />;
  }

  return (
    <SettingsProvider>
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
          <Route element={<AdminLayout />}>
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