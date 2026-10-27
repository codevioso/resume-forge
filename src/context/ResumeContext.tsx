import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ResumeData, Template } from '../types/resume';
import { emptyResumeData } from '../data/emptyResume';
import type { ResumePersistence } from './resumeStorage';

/** Whether the latest change reached storage. `off` when nothing persists. */
export type SaveStatus = 'saved' | 'failed' | 'off';

interface ResumeContextType {
  resumeData: ResumeData;
  setResumeData: React.Dispatch<React.SetStateAction<ResumeData>>;
  selectedTemplate: Template | null;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<Template | null>>;
  saveStatus: SaveStatus;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export function ResumeProvider({
  children,
  initialResumeData,
  initialTemplate = null,
  persistence,
}: {
  children: ReactNode;
  /** Used by template gallery / tests; app shell omits this. */
  initialResumeData?: ResumeData;
  initialTemplate?: Template | null;
  /**
   * Where the resume is kept between visits. Only the app shell passes this:
   * the gallery thumbnails and the print page render fixed data and must
   * never overwrite what the user saved.
   */
  persistence?: ResumePersistence;
}) {
  const [restored] = useState(() => persistence?.load() ?? null);
  const [resumeData, setResumeData] = useState<ResumeData>(
    () => initialResumeData ?? restored?.resumeData ?? emptyResumeData()
  );
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    () => initialTemplate ?? restored?.selectedTemplate ?? null
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(persistence ? 'saved' : 'off');

  // Saved on every change, not debounced: a debounce loses the last edit when
  // the tab is closed inside the window, and the write is small (photos are
  // downscaled on upload).
  useEffect(() => {
    if (!persistence) return;
    setSaveStatus(persistence.save(resumeData, selectedTemplate) ? 'saved' : 'failed');
  }, [persistence, resumeData, selectedTemplate]);

  return (
    <ResumeContext.Provider value={{ resumeData, setResumeData, selectedTemplate, setSelectedTemplate, saveStatus }}>
      {children}
    </ResumeContext.Provider>
  );
}

export function useResume() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
}
