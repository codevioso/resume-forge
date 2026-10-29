import { APP_NAME } from '../../constants/brand';
import { LegalLayout, type LegalSection } from '../../components/legal/LegalLayout';
import { Biz, List, PacksTable, Review, Subhead, SupportEmail, SupportPhone, TextLink } from '../../components/legal/LegalText';
import { PAYMENT_METHODS, REFUND_BATCH_DAYS, TRIAL, count } from '../../components/legal/facts';

const SECTIONS: LegalSection[] = [
  {
    id: 'about',
    title: 'About these terms',
    body: (
      <>
        <p>
          These Terms of Service are an agreement between you and <Biz k="legalName" /> (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;), trade licence <Biz k="tradeLicense" />, <Biz k="address" />, <Biz k="country" />. We run{' '}
          {APP_NAME}, the resume builder on this website and in its apps.
        </p>
        <p>
          By using {APP_NAME}, you agree to these terms. If you don&rsquo;t agree, please don&rsquo;t use it. They work
          together with our <TextLink to="/privacy">Privacy Policy</TextLink>, which explains what we store about you,
          and our <TextLink to="/refunds">Refund &amp; Cancellation Policy</TextLink>, which is part of these terms.
        </p>
        <p>
          Building a resume and downloading it as a PDF is free, with or without an account. Optional AI features are
          paid for with credits (see <TextLink to="#credits">Credits</TextLink>).
        </p>
      </>
    ),
  },
  {
    id: 'without-an-account',
    title: 'Using Paperplane without an account',
    body: (
      <>
        <p>
          You can build and download a resume without an account. Your resume is then saved only in your own browser,
          on your device. It is not on our servers, so we can&rsquo;t recover it for you.
        </p>
        <p>
          Clearing your browser&rsquo;s data, using a private window, or changing browser or device leaves it behind.
          To keep a copy, download the PDF or create a free account.
        </p>
      </>
    ),
  },
  {
    id: 'your-account',
    title: 'Your account',
    body: (
      <>
        <p>
          An account lets you save resumes to our servers, open them on any device, and use AI features. When you
          create one:
        </p>
        <List>
          <li>Use an email address that is yours and that you can read: we send your confirmation and sign-in links there.</li>
          <li>
            Keep your password and your email account secure. You&rsquo;re responsible for what is done in your
            account; tell us straight away if you think someone else has used it.
          </li>
          <li>Accounts are personal. Don&rsquo;t share yours, or create one for someone else without their permission.</li>
        </List>
        <p>
          {APP_NAME} is not meant for children under <Biz k="minimumAge" />, and you must be at least that age to create
          an account.
        </p>
        <Review>
          Choose the minimum age. Buying credits is a contract: consider requiring buyers to be 18 or older, or to have a
          parent&rsquo;s or guardian&rsquo;s permission, and say so here.
        </Review>
        <p>
          You can delete your account at any time from your <TextLink to="/account">Account page</TextLink>. Your saved
          resumes and any credits left in the account are deleted with it.
        </p>
      </>
    ),
  },
  {
    id: 'your-content',
    title: 'Your content',
    body: (
      <>
        <p>Your resumes, and everything you put in them, stay yours. We claim no ownership of them.</p>
        <p>
          You allow us to store, copy and process your content only as far as we need to run {APP_NAME} for you: to save
          it, show it on your devices, turn it into a PDF and, when you ask, send it to our AI provider (see <TextLink to="#ai-features">AI features</TextLink>). This
          ends when you delete the content or your account.
        </p>
        <p>
          You&rsquo;re responsible for what you put in a resume. It should be truthful, and you should have the right to
          use any personal details, photos and links in it. We don&rsquo;t review resume content.
        </p>
      </>
    ),
  },
  {
    id: 'ai-features',
    title: 'AI features',
    body: (
      <>
        <p>
          AI features (such as improving a bullet point, writing a summary, tailoring a resume to a job advert, or
          importing an old resume) are optional, and need an account.
        </p>
        <List>
          <li>
            <strong>You agree first.</strong> Before your first AI action, we ask you to agree that the text you choose
            is sent to our AI provider, Anthropic, to produce suggestions. You can withdraw that agreement at any time
            in your account; AI features then stay off until you agree again. The{' '}
            <TextLink to="/privacy#ai">Privacy Policy</TextLink> explains what is sent and what we keep.
          </li>
          <li>
            <strong>The AI suggests; you decide.</strong> Nothing it writes goes into your resume until you accept it.
          </li>
          <li>
            <strong>AI can be wrong.</strong> Suggestions may contain mistakes, or wording that doesn&rsquo;t fit you.
            Read each one before you accept it, and never accept anything that isn&rsquo;t true about you. The content
            of your resume remains your responsibility.
          </li>
          <li>
            <strong>Uploaded files.</strong> Upload only documents you have the right to use. We read a file on our
            server to take its text out, then discard it straight away; files are never stored.
          </li>
          <li>
            <strong>Fair limits.</strong> To keep {APP_NAME} fast and fair for everyone, we limit how many AI actions
            can be run per minute and per day.
          </li>
        </List>
      </>
    ),
  },
  {
    id: 'credits',
    title: 'Credits',
    body: (
      <>
        <p>
          AI features are paid for with credits. Each AI action shows how many credits it costs before you start it.
          The cost of an action may change, but you always see it first.
        </p>

        <Subhead>Free trial</Subhead>
        <p>
          Every account gets {count(TRIAL.credits)} free trial credits, once, when its email address is confirmed
          (signing in with Google confirms it straight away). Trial credits are valid for {TRIAL.days} days from then.
          The trial is given once per account and never twice.
        </p>

        <Subhead>Credit packs</Subhead>
        <PacksTable caption="Credit packs and prices" />
        <p>
          Prices are in Bangladeshi taka (BDT). Packs and prices may change; the price shown at checkout is the price you
          pay, and a change never affects credits you have already bought.
        </p>
        <Review>
          State whether prices include VAT, once you have confirmed with your accountant how VAT applies to these sales.
        </Review>

        <Subhead>How credits work</Subhead>
        <List>
          <li>
            Each grant of credits (the trial, or a pack) has its own expiry date. Spending always takes the credits that
            expire soonest first, so as few as possible go to waste.
          </li>
          <li>
            Credits expire at the end of their validity period and can&rsquo;t be used after that. Your account shows
            your balance and when your credits expire, and we email you a reminder before unused credits expire.
          </li>
          <li>
            Credits have no cash value. They can&rsquo;t be transferred to another account or person, sold, or exchanged
            back for money, except as our <TextLink to="/refunds">Refund &amp; Cancellation Policy</TextLink> says.
          </li>
          <li>
            If an AI action fails (for example, the AI service doesn&rsquo;t answer, or returns something unusable), its
            credits are returned to you automatically. If those credits expired while the action was running, they come
            back as new credits valid for {REFUND_BATCH_DAYS} days.
          </li>
          <li>
            Credits are not returned for an action that worked but whose suggestion you didn&rsquo;t like or didn&rsquo;t
            use.
          </li>
        </List>
      </>
    ),
  },
  {
    id: 'payments',
    title: 'Payments and refunds',
    body: (
      <>
        <p>
          Credit packs are paid for through SSLCommerz, a payment gateway in Bangladesh, with {PAYMENT_METHODS}. You
          enter your payment details on SSLCommerz&rsquo;s pages: we never see or store your card number, PIN or wallet
          password.
        </p>
        <p>
          Credits are added to your account as soon as SSLCommerz confirms the payment to us. Every purchase is a
          one-off: there is no subscription, and nothing renews or charges you again automatically.
        </p>
        <p>
          If a payment goes wrong (you paid but got no credits, or were charged twice), our{' '}
          <TextLink to="/refunds">Refund &amp; Cancellation Policy</TextLink> explains how we put it right.
        </p>
      </>
    ),
  },
  {
    id: 'fair-use',
    title: 'Fair use',
    body: (
      <>
        <p>When you use {APP_NAME}, please don&rsquo;t:</p>
        <List>
          <li>break the law, or use {APP_NAME} to deceive anyone, for example with a resume in someone else&rsquo;s name;</li>
          <li>put other people&rsquo;s personal information into {APP_NAME} without the right to do so;</li>
          <li>upload malware, or files you don&rsquo;t have the right to use;</li>
          <li>
            try to get into accounts or systems that aren&rsquo;t yours, test or get around our security, or get around
            credit balances and usage limits;
          </li>
          <li>overload {APP_NAME}, or use it through bots or scripts instead of the website and apps;</li>
          <li>resell access to AI features, or create extra accounts to collect more free trial credits;</li>
          <li>use AI features to produce content that is unlawful, hateful or abusive.</li>
        </List>
        <p>If you do, we may remove the content, switch off AI features for your account, or close it (see <TextLink to="#ending">Ending your use of Paperplane</TextLink>).</p>
      </>
    ),
  },
  {
    id: 'changes-to-paperplane',
    title: 'Changes to Paperplane',
    body: (
      <>
        <p>
          We improve {APP_NAME} over time, and may add, change or remove features. We&rsquo;ll give notice on the site
          before a significant change. {APP_NAME} may sometimes be unavailable, for maintenance or for reasons outside our
          control.
        </p>
        <p>
          If we stop offering AI features altogether, we&rsquo;ll tell you in advance and refund the paid credits you
          haven&rsquo;t used.
        </p>
        <Review>
          Decide what happens to unused paid credits if AI features are discontinued. A refund in proportion to the
          unused credits is the fair default.
        </Review>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'Disclaimers and liability',
    body: (
      <>
        <p>
          {APP_NAME} is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We work to make it reliable, but we
          can&rsquo;t promise it will be free of errors or interruptions, or that a resume made with it will get you an
          interview or a job.
        </p>
        <p>
          Keep your own copy of your resume, for example the PDF. We&rsquo;re not responsible for a resume that was kept
          only in your browser and is lost from it.
        </p>
        <p>
          As far as the law allows, we&rsquo;re not liable for indirect losses (such as lost opportunities or income),
          and our total liability to you for any claim is limited to what you paid us in the 12 months before it.
          Nothing in these terms takes away rights you have by law that can&rsquo;t be taken away.
        </p>
        <Review>Have the limitation of liability (what you paid in the last 12 months) checked by a legal adviser.</Review>
      </>
    ),
  },
  {
    id: 'ending',
    title: 'Ending your use of Paperplane',
    body: (
      <>
        <p>
          You can stop using {APP_NAME} at any time, and delete your account from your{' '}
          <TextLink to="/account">Account page</TextLink>.
        </p>
        <p>
          We may suspend or close an account that seriously or repeatedly breaks these terms, or when the law requires
          it. Where we reasonably can, we&rsquo;ll tell you first, so you can download your resumes. If we close an
          account because it broke these terms, its unused credits are not refunded; if we close it for any other
          reason, we refund the paid credits left in it.
        </p>
        <Review>Confirm that unused credits are lost when an account is closed for breaking these terms.</Review>
      </>
    ),
  },
  {
    id: 'changes-to-these-terms',
    title: 'Changes to these terms',
    body: (
      <>
        <p>
          We may update these terms, for example when we add features or the law changes. The date at the top shows when
          they last changed. Before a significant change takes effect, we&rsquo;ll show a notice on the site.
        </p>
        <p>
          If you keep using {APP_NAME} after a change, the new terms apply to you; if you don&rsquo;t accept them, you
          can delete your account. Credits you bought before a change keep the validity they were sold with.
        </p>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Law and disputes',
    body: (
      <>
        <p>
          These terms are governed by the laws of Bangladesh. If something goes wrong, please contact us first: most
          problems can be sorted out quickly. A dispute we can&rsquo;t resolve together will be decided by{' '}
          <Biz k="courts" />, Bangladesh.
        </p>
        <p>If a court finds part of these terms unenforceable, the rest still applies.</p>
        <Review>Have a lawyer confirm the governing-law and jurisdiction wording.</Review>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <>
        <p>
          <Biz k="legalName" />, <Biz k="address" />, <Biz k="country" />.
        </p>
        <p>
          Email <SupportEmail /> or call <SupportPhone />. All the ways to reach us are on our{' '}
          <TextLink to="/contact">Contact page</TextLink>.
        </p>
      </>
    ),
  },
];

export function TermsPage() {
  return (
    <LegalLayout
      page="terms"
      lede={
        <>
          The agreement between you and <Biz k="legalName" />, who run {APP_NAME}. It is written to be read: plain
          words, short sections.
        </>
      }
      summary={[
        <>{APP_NAME} is free to use, and an account is optional.</>,
        <>Your resumes are yours. We store them only if you have an account, and only to run {APP_NAME} for you.</>,
        <>AI features are optional and paid for with credits. AI can be wrong: check every suggestion before you use it.</>,
        <>Credits expire at the end of their validity, have no cash value and can&rsquo;t be transferred.</>,
        <>If an AI action fails, its credits come back automatically.</>,
      ]}
      sections={SECTIONS}
    />
  );
}
