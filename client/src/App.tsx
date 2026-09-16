import { ThemeProvider, CssBaseline } from '@mui/material'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import theme from './theme'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import EnquiryPage from './pages/EnquiryPage'
import EnquiryDetail from './pages/EnquiryDetail'
import SchedulerPage from './pages/SchedulerPage'
import JobDetailPage from './pages/JobDetailPage'
import JobsPage from './pages/JobsPage'
import CustomersPage from './pages/CustomersPage'
import InstallersPage from './pages/InstallersPage'
import QuotesPage from './pages/QuotesPage'
import Auth0ProviderWithNavigate from './auth/Auth0ProviderWithNavigate'
import AuthTokenBridge from './auth/AuthTokenBridge'
import RequireAuth from './auth/RequireAuth'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Auth0ProviderWithNavigate>
          <AuthTokenBridge />
          <Routes>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="enquiries" element={<EnquiryPage />} />
              <Route path="enquiries/:id" element={<EnquiryDetail />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="scheduler" element={<SchedulerPage />} />
              <Route path="jobs" element={<JobsPage />} />
              <Route path="jobs/:id" element={<JobDetailPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="installers" element={<InstallersPage />} />
            </Route>
          </Routes>
        </Auth0ProviderWithNavigate>
      </BrowserRouter>
    </ThemeProvider>
  )
}
