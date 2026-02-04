import { Routes, Route } from 'react-router-dom'
import LandingPage from './components/landingPage'
import PublishPage from './components/PublishPage'
import DealersPage from './components/DealersPage'
import ProfileTypePage from './components/ProfileTypePage'
import PrivateProfilePage from './components/PrivateProfilePage'
import BusinessProfilePage from './components/BusinessProfilePage'
import AuthPage from './components/AuthPage'
import SavedListingsPage from './components/SavedListingsPage'
import DraftAdsPage from './components/DraftAdsPage'
import MyAdsPage from './components/MyAdsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/publish" element={<PublishPage />} />
      <Route path="/dealers" element={<DealersPage />} />
      <Route path="/profile" element={<ProfileTypePage />} />
      <Route path="/profile/private" element={<PrivateProfilePage />} />
      <Route path="/profile/business" element={<BusinessProfilePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/saved" element={<SavedListingsPage />} />
      <Route path="/drafts" element={<DraftAdsPage />} />
      <Route path="/my-ads" element={<MyAdsPage />} />
    </Routes>
  )
}

export default App
