import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './components/landingPage'
import PublishPage from './components/PublishPage'
import DealersPage from './components/DealersPage'
import DealerDetailPage from './components/DealerDetailPage'
import ProfileTypePage from './components/ProfileTypePage'
import PrivateProfilePage from './components/PrivateProfilePage'
import BusinessProfilePage from './components/BusinessProfilePage'
import SettingsPage from './components/SettingsPage'
import AuthPage from './components/AuthPage'
import VerifyEmailPage from './components/VerifyEmailPage'
import ForgotPasswordPage from './components/ForgotPasswordPage'
import ResetPasswordPage from './components/ResetPasswordPage'
import MyAdsPage from './components/MyAdsPage'
import SearchPage from './components/SearchPage'
import Footer from './components/footer'
import AdminPage from './components/AdminPage'
import { useAuth } from './context/AuthContext'

const VehicleDetailsPage = lazy(() => import('./components/details/VehicleDetailsPage'))

const resolvePageTitle = (pathname: string): string => {
  if (pathname === '/') return 'Kar.bg | Начало'
  if (pathname === '/search') return 'Kar.bg | Търсене'
  if (pathname === '/publish') return 'Kar.bg | Публикуване'
  if (pathname === '/dealers') return 'Kar.bg | Дилъри'
  if (pathname.startsWith('/dealers/')) return 'Kar.bg | Дилър'
  if (pathname === '/profile') return 'Kar.bg | Тип Профил'
  if (pathname === '/profile/private') return 'Kar.bg | Профил Частно Лице'
  if (pathname === '/profile/business') return 'Kar.bg | Профил Бизнес'
  if (pathname === '/settings') return 'Kar.bg | Настройки'
  if (pathname === '/auth') return 'Kar.bg | Вход / Регистрация'
  if (pathname === '/verify-email') return 'Kar.bg | Потвърждение на Имейл'
  if (pathname === '/forgot-password') return 'Kar.bg | Забравена Парола'
  if (pathname === '/reset-password') return 'Kar.bg | Нулиране на Парола'
  if (pathname === '/my-ads') return 'Kar.bg | Моите Обяви'
  if (pathname.startsWith('/details/')) return 'Kar.bg | Детайли на Обява'
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'Kar.bg | Админ Панел'
  return 'Kar.bg'
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { authTransition, sessionExpiredMessage, clearSessionExpiredMessage } = useAuth()
  const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
  const showSharedFooter = !isAdminRoute
  const showAuthTransitionScreen = authTransition !== null
  const showSessionExpiredScreen = Boolean(sessionExpiredMessage) && !showAuthTransitionScreen

  useEffect(() => {
    document.title = resolvePageTitle(location.pathname)
  }, [location.pathname])

  const transitionTitle =
    authTransition === 'logout' ? 'Излизане от профила...' : 'Влизане в профила...'
  const transitionSubtitle =
    authTransition === 'logout'
      ? 'Моля, изчакайте секунда.'
      : 'Подготвяме вашата сесия.'

  return (
    <>
      {!isAdminRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/publish" element={<PublishPage />} />
        <Route path="/dealers" element={<DealersPage />} />
        <Route path="/dealers/:id" element={<DealerDetailPage />} />
        <Route path="/profile" element={<ProfileTypePage />} />
        <Route path="/profile/private" element={<PrivateProfilePage />} />
        <Route path="/profile/business" element={<BusinessProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/my-ads" element={<MyAdsPage />} />
        <Route
          path="/details/:slug"
          element={
            <Suspense fallback={null}>
              <VehicleDetailsPage />
            </Suspense>
          }
        />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      {showSharedFooter && <Footer />}
      {showAuthTransitionScreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 5000,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(248, 250, 252, 0.94)',
            backdropFilter: 'blur(4px)',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '24px 22px',
              textAlign: 'center',
              boxShadow: '0 14px 36px rgba(15, 23, 42, 0.14)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                margin: '0 auto 12px',
                border: '3px solid #ccfbf1',
                borderTopColor: '#0f766e',
                animation: 'auth-transition-spin 0.9s linear infinite',
              }}
            />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              {transitionTitle}
            </h2>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#475569' }}>
              {transitionSubtitle}
            </p>
          </div>
          <style>{`
            @keyframes auth-transition-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      {showSessionExpiredScreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 5200,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(248, 250, 252, 0.96)',
            backdropFilter: 'blur(4px)',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 430,
              background: '#ffffff',
              border: '1px solid #fecaca',
              borderRadius: 14,
              padding: '24px 22px',
              textAlign: 'center',
              boxShadow: '0 14px 36px rgba(15, 23, 42, 0.14)',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#7f1d1d' }}>
              Сесията изтече
            </h2>
            <p style={{ margin: '10px 0 0', fontSize: 14, color: '#475569', lineHeight: 1.45 }}>
              {sessionExpiredMessage}
            </p>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  clearSessionExpiredMessage()
                  navigate('/auth')
                }}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 12,
                  border: '1px solid #0f766e',
                  background: '#0f766e',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Влез отново
              </button>
              <button
                onClick={clearSessionExpiredMessage}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 12,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#0f172a',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Затвори
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
