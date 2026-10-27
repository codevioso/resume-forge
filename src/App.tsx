import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ResumeProvider } from './context/ResumeContext';
import { createBrowserPersistence } from './context/resumeStorage';
import { templates } from './data/templates';
import { LandingPage } from './pages/LandingPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { EditorPage } from './pages/EditorPage';
import { PrintPage } from './pages/PrintPage';

// Module scope: one instance for the app's lifetime, so the provider's save
// effect does not see a new object on every render.
const persistence = createBrowserPersistence(templates);

export function App() {
  return (
    <ResumeProvider persistence={persistence}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/print" element={<PrintPage />} />
          <Route path="/editor" element={<EditorPage />} />
        </Routes>
      </BrowserRouter>
    </ResumeProvider>
  );
}
