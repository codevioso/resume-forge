import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ResumeProvider } from './context/ResumeContext';
import { createBrowserPersistence } from './context/resumeStorage';
import { templates } from './data/templates';
import { LandingPage } from './pages/LandingPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { EditorPage } from './pages/EditorPage';
import { PrintPage } from './pages/PrintPage';
import { ResumesPage } from './pages/ResumesPage';
import { AccountPage } from './pages/AccountPage';
import { SignInPage } from './pages/auth/SignInPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { CheckEmailPage } from './pages/auth/CheckEmailPage';
import { TermsPage } from './pages/legal/TermsPage';
import { PrivacyPage } from './pages/legal/PrivacyPage';
import { RefundPage } from './pages/legal/RefundPage';
import { ContactPage } from './pages/legal/ContactPage';
import { GuestResumeImport } from './components/account/GuestResumeImport';

// Module scope: one instance for the app's lifetime, so the provider's save
// effect does not see a new object on every render.
const persistence = createBrowserPersistence(templates);

export function App() {
  return (
    <ResumeProvider persistence={persistence}>
      <BrowserRouter>
        {/* Signing in moves this browser's guest resume into the account. */}
        <GuestResumeImport />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/print" element={<PrintPage />} />
          {/* Guests edit the one resume kept in their browser; signed-in users edit saved resumes by id. */}
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/editor/:resumeId" element={<EditorPage />} />
          <Route path="/resumes" element={<ResumesPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/refunds" element={<RefundPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </BrowserRouter>
    </ResumeProvider>
  );
}
