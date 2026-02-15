import { Routes, Route } from 'react-router-dom'
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
import VehicleDetailsPage from './components/details/VehicleDetailsPage'
import SearchPage from './components/SearchPage'
import Footer from './components/footer'
import { useAuth } from './context/AuthContext'

function App() {
  const { authTransition } = useAuth()
  const showAuthTransitionScreen = authTransition !== null
  const transitionTitle =
    authTransition === 'logout' ? 'Излизане от профила...' : 'Влизане в профила...'
  const transitionSubtitle =
    authTransition === 'logout'
      ? 'Моля, изчакайте секунда.'
      : 'Подготвяме вашата сесия.'

  return (
    <>
      <Navbar />
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
        <Route path="/details/:slug" element={<VehicleDetailsPage />} />
      </Routes>
      <Footer />
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
    </>
  )
}

export default App
