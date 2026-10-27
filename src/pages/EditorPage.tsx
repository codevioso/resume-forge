import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, Download, FileText, Loader2, ZoomIn, ZoomOut, Eye, Palette } from 'lucide-react';
import { useResume } from '../context/ResumeContext';
import { EditorForm } from '../components/EditorForm';
import { ResumePreview } from '../components/ResumePreview';
import { templates } from '../data/templates';

/**
 * Where the editor posts a resume to get a PDF back.
 *
 * Defaults to `/api/pdf` on the app's own origin, which is how production is
 * deployed: the reverse proxy serves the app and the PDF API under one host,
 * so no CORS is involved at all (see docs/DEPLOY.md). Set
 * `VITE_PDF_SERVICE_URL` only to point a development build at a service on
 * another origin — a full URL ending in `/pdf`, or a base URL.
 */
function resolvePdfExportUrl(): string {
  const raw = import.meta.env.VITE_PDF_SERVICE_URL?.trim();
  if (!raw) return '/api/pdf';
  if (raw.endsWith('/pdf')) return raw;
  return `${raw.replace(/\/$/, '')}/pdf`;
}

/**
 * A filename built from the person's name: `amara-okonkwo-resume.pdf`.
 *
 * Every run of characters outside a-z0-9 collapses to one hyphen, so slashes,
 * colons and trailing dots — anything a filesystem might reject — cannot
 * survive into the name.
 */
function pdfFileName(fullName: string): string {
  const slug = fullName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug ? `${slug}-resume.pdf` : 'resume.pdf';
}

/** What to tell the user when the export fails, by what actually went wrong. */
function exportFailureMessage(status: number | null): string {
  if (status === 429) return 'Too many exports in a short time. Please wait a minute and try again.';
  if (status === 503) return 'The PDF service is busy right now. Please try again in a few seconds.';
  if (status === 413) return 'This resume is too large to export — try a smaller photo.';
  if (status === 400) return 'Some of the resume data could not be exported. Check for unusually long entries.';
  return 'Could not generate the PDF. Please try again in a moment.';
}

export function EditorPage() {
  const navigate = useNavigate();
  const { resumeData, selectedTemplate, setSelectedTemplate, saveStatus } = useResume();
  const resumeRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState(0.5);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  useEffect(() => {
    if (!selectedTemplate) {
      navigate('/templates');
    }
  }, [selectedTemplate, navigate]);

  const handleExportPDF = async () => {
    if (!selectedTemplate) return;

    setIsExporting(true);
    let status: number | null = null;
    try {
      // No print URL is sent. The service renders a URL from its own
      // configuration; it used to take one from this request body, which let
      // any caller point the server's browser at an arbitrary address.
      const response = await fetch(resolvePdfExportUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: { resumeData, selectedTemplate } }),
      });
      status = response.status;

      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const detail = contentType.includes('application/json')
          ? JSON.stringify(await response.json())
          : await response.text();
        throw new Error(detail || `HTTP ${response.status}`);
      }
      if (!contentType.includes('application/pdf')) {
        throw new Error('PDF service did not return a PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFileName(resumeData.personalInfo.fullName);
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(exportFailureMessage(status));
    } finally {
      setIsExporting(false);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 1));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.3));
  };

  if (!selectedTemplate) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-full mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/templates')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Templates</span>
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white hidden sm:inline">ResumeForge</span>
            </div>
            {saveStatus === 'saved' && (
              <span
                className="hidden md:flex items-center gap-1.5 text-xs text-slate-500"
                title="Your resume is kept in this browser only. It is not uploaded anywhere until you export a PDF."
              >
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Saved in this browser
              </span>
            )}
            {saveStatus === 'failed' && (
              <span
                className="flex items-center gap-1.5 text-xs text-amber-400"
                title="The browser refused to store the resume (storage full, or disabled in private mode). Export a PDF before closing this tab."
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Not saved — export before closing
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Template Selector */}
            <div className="relative">
              <button
                onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
              >
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">{selectedTemplate.name}</span>
              </button>
              {showTemplateSelector && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-2 z-50">
                  <p className="text-xs text-slate-400 px-3 py-2">Switch Template</p>
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowTemplateSelector(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        selectedTemplate.id === template.id
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: template.colors.primary }}
                      />
                      <span className="text-sm">{template.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Zoom Controls */}
            <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-xl">
              <button
                onClick={handleZoomOut}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-400 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-65px)]">
        {/* Left Panel - Form */}
        <div className="w-full lg:w-[480px] xl:w-[520px] overflow-y-auto border-r border-white/5 bg-slate-900/30">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Build Your Resume</h2>
              <p className="text-slate-400">Fill in your information below. Changes appear instantly in the preview.</p>
            </div>
            <EditorForm />
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="hidden lg:flex flex-1 flex-col bg-slate-800/20">
          {/* Preview Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
            <div className="flex items-center gap-2 text-slate-400">
              <Eye className="w-4 h-4" />
              <span className="text-sm">Live Preview</span>
            </div>
            <span className="text-xs text-slate-500">A4 Format (210 × 297 mm)</span>
          </div>

          {/* Preview Container */}
          <div className="flex-1 overflow-auto p-8 bg-slate-700/30">
            <div className="flex justify-center">
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                }}
                className="transition-transform duration-200"
              >
                <div className="shadow-2xl shadow-black/50 rounded-sm overflow-hidden">
                  <ResumePreview ref={resumeRef} showPageGuides />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Preview Toggle */}
      <div className="lg:hidden fixed bottom-6 right-6">
        <button
          onClick={() => {
            const previewModal = document.getElementById('preview-modal');
            if (previewModal) {
              previewModal.classList.toggle('hidden');
            }
          }}
          className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          <Eye className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Preview Modal */}
      <div
        id="preview-modal"
        className="hidden lg:hidden fixed inset-0 z-50 bg-slate-950/95 overflow-auto"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/5">
          <span className="text-white font-medium">Preview</span>
          <button
            onClick={() => {
              const previewModal = document.getElementById('preview-modal');
              if (previewModal) {
                previewModal.classList.add('hidden');
              }
            }}
            className="text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="p-4 flex justify-center">
          <div style={{ transform: 'scale(0.4)', transformOrigin: 'top center' }}>
            <ResumePreview ref={resumeRef} showPageGuides />
          </div>
        </div>
      </div>
    </div>
  );
}
