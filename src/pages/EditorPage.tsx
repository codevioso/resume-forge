import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useResume } from '../context/ResumeContext';
import { useSession } from '../lib/authClient';
import { EditorWorkspace } from '../components/editor/EditorWorkspace';
import { SaveIndicator } from '../components/editor/SaveIndicator';
import { useOnlineStatus } from '../components/editor/useEnvironment';
import { SavedResumeEditor } from '../components/resumes/SavedResumeEditor';

/**
 * The editor.
 *
 * `/editor/:resumeId` edits one of the signed-in user's saved resumes.
 * `/editor` is the guest's: the one resume kept in this browser. A signed-in
 * user has no browser resume (it was moved into the account when they signed
 * in), so they are sent to their list instead.
 */
export function EditorPage() {
  const { resumeId } = useParams();
  if (resumeId) return <SavedResumeEditor key={resumeId} resumeId={resumeId} />;
  return <GuestEditor />;
}

/** How often a failed session check is retried before the visitor is taken to be a guest. */
const SESSION_RETRIES = 3;

function GuestEditor() {
  const navigate = useNavigate();
  const { selectedTemplate, saveStatus } = useResume();
  const { data: session, isPending, error, refetch } = useSession();
  const online = useOnlineStatus();
  const signedIn = Boolean(session?.user);

  // A session check that failed (a busy server, a dropped request) is not an
  // answer: treating it as "signed out" sent signed-in users into the guest
  // flow. Retry it a few times; only offline, or after the retries, is the
  // visitor taken to be a guest.
  const [retries, setRetries] = useState(0);
  useEffect(() => {
    if (!error || signedIn || !online || retries >= SESSION_RETRIES) return;
    const timer = window.setTimeout(() => {
      setRetries((n) => n + 1);
      void refetch();
    }, 600 * (retries + 1));
    return () => window.clearTimeout(timer);
  }, [error, signedIn, online, retries, refetch]);
  const sessionKnown = !isPending && (!error || !online || retries >= SESSION_RETRIES);

  useEffect(() => {
    if (signedIn) navigate('/resumes', { replace: true });
    // No template chosen yet: pick one first. (Once the session is known, so
    // a signed-in user goes to their resumes rather than the gallery.)
    else if (sessionKnown && !selectedTemplate) navigate('/templates', { replace: true });
  }, [signedIn, sessionKnown, selectedTemplate, navigate]);

  if (signedIn || !selectedTemplate) return null;

  return (
    <EditorWorkspace
      renderStatus={(variant) => (
        <SaveIndicator status={saveStatus} online={online} size={variant === 'header' ? 'md' : 'sm'} />
      )}
      offlineExportMessage={
        saveStatus === 'failed'
          ? "Exporting needs a connection. Keep this tab open and export when you're back online."
          : "Your resume is saved on this device. Export the PDF when you're back online."
      }
      onBack={() => navigate('/templates')}
      backLabel="Back to templates"
    />
  );
}
