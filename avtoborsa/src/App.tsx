import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './components/landingPage'
import PublishPage from './components/PublishPage'
import DealersPage from './components/DealersPage'
import DealerDetailPage from './components/DealerDetailPage'
import ProfileTypePage from './components/ProfileTypePage'
import PrivateProfilePage from './components/PrivateProfilePage'
import BusinessProfilePage from './components/BusinessProfilePage'
import AuthPage from './components/AuthPage'
import MyAdsPage from './components/MyAdsPage'
import VehicleDetailsPage from './components/details/VehicleDetailsPage'
import SearchPage from './components/SearchPage'
import Footer from './components/footer'

function App() {
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
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/my-ads" element={<MyAdsPage />} />
        <Route path="/details/:slug" element={<VehicleDetailsPage />} />
      </Routes>
      <Footer />
    </>
  )
}

export default App
