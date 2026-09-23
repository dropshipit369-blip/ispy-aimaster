import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { ScanPage } from './pages/ScanPage'
import { HistoryPage } from './pages/HistoryPage'
import { PricingPage } from './pages/PricingPage'
import { ProfilePage } from './pages/ProfilePage'
import { MarketingKitPage } from './pages/MarketingKitPage'

export function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/marketing" element={<MarketingKitPage />} />

      {/* Protected in-app routes — with bottom nav */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/scan" element={<ScanPage key="scan-any" />} />
        {/* Former "Curator" screen: the same scanner, filtered to pre-owned listings. */}
        <Route path="/scan/dark" element={<ScanPage key="scan-used" initialCondition="used" />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        {/* Stripe Checkout and the billing portal return here (see supabase/functions/_shared/billing.ts). */}
        <Route path="/membership" element={<PricingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
