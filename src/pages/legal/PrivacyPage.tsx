import { APP_NAME } from '../../constants/brand';
import { LegalLayout, type LegalSection } from '../../components/legal/LegalLayout';
import {
  Biz,
  ExternalLink,
  List,
  Review,
  Subhead,
  SupportEmail,
  SupportPhone,
  TextLink,
  Todo,
} from '../../components/legal/LegalText';
import { BACKUP_DAYS } from '../../components/legal/facts';

const SECTIONS: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <>
        <p>
          {APP_NAME} is run by <Biz k="legalName" />, <Biz k="address" />, <Biz k="country" /> (trade licence{' '}
          <Biz k="tradeLicense" />). We are responsible for the personal information described in this policy.
        </p>
        <p>
          Questions about your data: email <SupportEmail /> or call <SupportPhone />.
        </p>
      </>
    ),
  },
  {
    id: 'without-an-account',
    title: 'If you use Paperplane without an account',
    body: (
      <>
        <List>
          <li>
            <strong>Your resume stays in your browser.</strong> It is saved in your browser&rsquo;s local storage, on
            your device, as you type. It is not stored on our servers.
          </li>
          <li>
            <strong>Making a PDF.</strong> When you download a PDF, your resume is sent to our PDF service only to turn
            it into a PDF, which comes straight back to you. Neither the request nor the PDF is stored or logged.
          </li>
          <li>
            <strong>If you then create an account</strong> or sign in, the resume in this browser moves into your
            account, so you can carry on where you left off.
          </li>
        </List>
        <p>
          Like any website, our server sees your device&rsquo;s IP address when your browser connects to it: it needs it
          to send the page back, and uses it to limit abuse, such as too many sign-in attempts. We don&rsquo;t keep logs
          of visits.
        </p>
        <Review>
          If you change the hosting setup, check that the server still keeps no access logs (or describe what it keeps,
          and for how long).
        </Review>
      </>
    ),
  },
  {
    id: 'with-an-account',
    title: 'If you create an account',
    body: (
      <>
        <p>We store, in our database:</p>
        <List>
          <li>
            <strong>Your name and email address.</strong>
          </li>
          <li>
            <strong>Your password, if you set one</strong>, only as a scrypt hash: a one-way scramble that can check a
            password but can&rsquo;t be turned back into it.
          </li>
          <li>
            <strong>Your sign-in sessions:</strong> one for each device you&rsquo;re signed in on, with the IP address and
            browser &ldquo;user agent&rdquo; (which browser and device type) it was started from, as our sign-in
            system records them.
          </li>
          <li>
            <strong>If you sign in with Google:</strong> the link to your Google account, and the name, email address and
            profile picture Google shares with us.
          </li>
          <li>
            <strong>Your saved resumes.</strong>
          </li>
          <li>
            <strong>Your credits:</strong> your balance, each grant with its expiry date, and a history of every change
            (credits granted, used, returned or expired).
          </li>
          <li>
            <strong>A log of your AI actions:</strong> which action, how many credits it cost, how many tokens it used,
            what it cost us, how long it took and whether it worked. Never the text you sent or the text you got back.
          </li>
          <li>
            <strong>When you agreed to AI processing</strong> (the date and time), until you withdraw that agreement.
          </li>
          <li>
            <strong>Your purchases:</strong> for each one, the pack, the amount, its status, the kind of payment method,
            and SSLCommerz&rsquo;s references for the transaction. Never card numbers, PINs or wallet passwords.
          </li>
        </List>
        <p>
          We use this only to run {APP_NAME} for you: to sign you in, keep your resumes on all your devices, keep your
          credits right, answer you when you contact us, and keep the service secure.
        </p>
      </>
    ),
  },
  {
    id: 'ai',
    title: 'AI features and Anthropic',
    body: (
      <>
        <p>
          AI features are optional. Nothing is sent to an AI service unless you use one, and before your first AI action
          we ask you to agree to the following.
        </p>
        <List>
          <li>
            <strong>What is sent.</strong> When you use an AI feature, the text you choose for it (for example a bullet
            point, your resume, or a job advert you paste) is sent to Anthropic, the company that makes the Claude AI
            model, to generate suggestions.
          </li>
          <li>
            <strong>Uploaded files.</strong> If you upload a resume file to import, our server reads the text out of it
            and sends only that text. The file is discarded immediately and never stored.
          </li>
          <li>
            <strong>What we keep.</strong> Not the content. Only the log of the action described above, and when you
            agreed.
          </li>
          <li>
            <strong>Changing your mind.</strong> You can withdraw your agreement at any time on your{' '}
            <TextLink to="/account">Account page</TextLink>. After that, nothing more is sent until you agree again.
          </li>
        </List>
        <Subhead>How Anthropic handles it</Subhead>
        <p>
          Anthropic processes the text on its own systems, which may be outside Bangladesh, to return the suggestion.{' '}
          <Todo>Confirm and describe Anthropic&rsquo;s current retention and training terms for API data before launch</Todo>{' '}
          See also <ExternalLink href="https://www.anthropic.com/legal/privacy">Anthropic&rsquo;s privacy policy</ExternalLink>.
        </p>
      </>
    ),
  },
  {
    id: 'payments',
    title: 'Payments',
    body: (
      <p>
        Credit packs are paid for through SSLCommerz. You enter your payment details on SSLCommerz&rsquo;s pages, and
        SSLCommerz handles them under its own privacy policy. We never see or store your card details. SSLCommerz tells us
        whether the payment succeeded, which is what we keep (see{' '}
        <TextLink to="#with-an-account">If you create an account</TextLink>).
      </p>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and storage on your device',
    body: (
      <>
        <List>
          <li>
            <strong>One cookie, when you&rsquo;re signed in:</strong> a first-party, httpOnly session cookie that keeps
            you signed in. First-party means it belongs to this site alone; httpOnly means scripts on the page
            can&rsquo;t read it.
          </li>
          <li>
            <strong>Local storage in your browser</strong> holds your resume if you don&rsquo;t have an account, edits
            to saved resumes that haven&rsquo;t reached our servers yet (for example while you&rsquo;re offline), and a
            few small settings, such as which sign-in options are available.
          </li>
          <li>
            <strong>If you install {APP_NAME} as an app,</strong> your browser also keeps a copy of the app&rsquo;s own
            files, so the editor works offline.
          </li>
        </List>
        <p>We use no advertising or analytics trackers, and no third-party cookies.</p>
        <Review>Check the live site&rsquo;s cookies once in the browser&rsquo;s developer tools and confirm this list is complete.</Review>
      </>
    ),
  },
  {
    id: 'emails',
    title: 'Emails we send',
    body: (
      <>
        <p>Only emails about your account, never marketing:</p>
        <List>
          <li>a link to confirm your email address;</li>
          <li>password reset links, and sign-in links when you ask for one;</li>
          <li>a reminder before unused credits expire.</li>
        </List>
        <p>
          They are delivered by <Biz k="emailProvider" />, which receives your email address and the email&rsquo;s
          content for that purpose.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    body: (
      <>
        <p>
          We don&rsquo;t sell personal information, and we don&rsquo;t share it for advertising. We use these service
          providers, each only for its part in running {APP_NAME}:
        </p>
        <List>
          <li>
            <strong>Anthropic</strong>: the text you choose for an AI feature (see{' '}
            <TextLink to="#ai">AI features and Anthropic</TextLink>).
          </li>
          <li>
            <strong>SSLCommerz</strong>: payments for credit packs.
          </li>
          <li>
            <strong>Google</strong>: only if you choose to sign in with Google.
          </li>
          <li>
            <strong>
              <Biz k="hostingProvider" />
            </strong>
            : hosts our server and database.
          </li>
          <li>
            <strong>
              <Biz k="emailProvider" />
            </strong>
            : delivers our emails.
          </li>
        </List>
        <p>
          We may also disclose information when the law requires it, for example on a valid order from a court or
          authority, or when needed to protect our users or {APP_NAME} from fraud or abuse.
        </p>
      </>
    ),
  },
  {
    id: 'storage-and-retention',
    title: 'Where it is stored, and for how long',
    body: (
      <>
        <p>
          Our server and database are in <Biz k="serverLocation" />. Anthropic, Google, SSLCommerz and our email provider
          may process data in other countries.
        </p>
        <List>
          <li>We keep your account and saved resumes for as long as you have the account.</li>
          <li>A sign-in session ends when you sign out, or after 30 days without use.</li>
          <li>
            <strong>Deleting your account</strong> (on your <TextLink to="/account">Account page</TextLink>) deletes your
            account, sign-in sessions, saved resumes, credits and their history, AI log and AI agreement, immediately.
          </li>
          <li>
            The database is backed up every night, and backups are kept for up to {BACKUP_DAYS} days. After that, deleted
            data is gone from the backups too. Backups are used only to recover from a failure.
          </li>
        </List>
        <Review>
          Tax and accounting rules may require you to keep payment records for some years, even after an account is
          deleted. Confirm with your accountant, then say here what is kept and for how long.
        </Review>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <>
        <List>
          <li>{APP_NAME} is served only over encrypted connections (HTTPS).</li>
          <li>Passwords are stored only as scrypt hashes, and the session cookie can&rsquo;t be read by scripts.</li>
          <li>Our logs never record resume content, passwords or sign-in tokens.</li>
          <li>The PDF service runs separately, with no access to the internet.</li>
        </List>
        <p>
          No system is perfectly secure. If a breach affects your personal information, we&rsquo;ll tell you without
          undue delay.
        </p>
      </>
    ),
  },
  {
    id: 'your-choices',
    title: 'Your choices',
    body: (
      <List>
        <li>
          <strong>See and correct your details:</strong> your <TextLink to="/account">Account page</TextLink> shows your
          details and lets you change your name; your resumes can be edited or deleted at any time.
        </li>
        <li>
          <strong>Withdraw your agreement to AI processing</strong> on your Account page.
        </li>
        <li>
          <strong>Delete your account</strong> on your Account page, with everything in it.
        </li>
        <li>
          <strong>Get a copy:</strong> download any resume as a PDF, or ask us (<SupportEmail />) for a copy of the data we
          hold about you.
        </li>
        <li>
          <strong>Questions or complaints:</strong> <TextLink to="/contact">contact us</TextLink>; we&rsquo;ll answer{' '}
          <Biz k="responseTime" />.
        </li>
      </List>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        {APP_NAME} is not directed at children under <Biz k="minimumAge" />, and we don&rsquo;t knowingly collect their
        personal information. If you believe a child has created an account, contact us and we&rsquo;ll delete it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        When this policy changes, we update the date at the top. Before a significant change takes effect, we show a
        notice on the site, and we won&rsquo;t use information we already hold in a new way without telling you first.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        <Biz k="legalName" />, <Biz k="address" />, <Biz k="country" />. Email <SupportEmail /> or call{' '}
        <SupportPhone />; all the ways to reach us are on our <TextLink to="/contact">Contact page</TextLink>.
      </p>
    ),
  },
];

export function PrivacyPage() {
  return (
    <LegalLayout
      page="privacy"
      lede={
        <>
          What {APP_NAME} stores about you, why, who else sees it, and how to delete it. The short answer: as little as
          we can.
        </>
      }
      summary={[
        <>Without an account, your resume stays in your browser. It isn&rsquo;t on our servers.</>,
        <>With an account, we store your account details and saved resumes, so you can use them on any device.</>,
        <>AI features send the text you choose to Anthropic, and only after you agree. Uploaded files are never stored.</>,
        <>No ads, no analytics trackers, and we never sell your data.</>,
        <>
          Delete your account at any time: everything goes at once, and from our backups within {BACKUP_DAYS} days.
        </>,
      ]}
      sections={SECTIONS}
    />
  );
}
