import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { LandingPage } from './pages/LandingPage'
import { ScanPage } from './pages/ScanPage'
import { DarkScanPage } from './pages/DarkScanPage'
import { PricingPage } from './pages/PricingPage'
import { ProfilePage } from './pages/ProfilePage'
import { MarketingKitPage } from './pages/MarketingKitPage'

export function App() {
  return (
    <Routes>
      {/* Public / marketing routes — no bottom nav */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/marketing" element={<MarketingKitPage />} />

      {/* In-app routes — with bottom nav */}
      <Route element={<AppLayout />}>
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/scan/dark" element={<DarkScanPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}
