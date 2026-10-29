import { APP_NAME } from '../../constants/brand';
import { LegalLayout, type LegalSection } from '../../components/legal/LegalLayout';
import { Biz, List, PacksTable, Review, SupportEmail, SupportPhone, TextLink } from '../../components/legal/LegalText';
import { PACKS, PAYMENT_CLAIM_DAYS, PAYMENT_METHODS, REFUND_BATCH_DAYS, TRIAL, count } from '../../components/legal/facts';

/** "30, 90 or 180" */
const packPeriods = PACKS.map((p) => p.days).join(', ').replace(/, (\d+)$/, ' or $1');

const SECTIONS: LegalSection[] = [
  {
    id: 'what-you-buy',
    title: 'What you buy',
    body: (
      <>
        <p>
          On {APP_NAME} you can buy credits, which pay for AI features. They come in packs, paid for in Bangladeshi taka
          (BDT) through SSLCommerz with {PAYMENT_METHODS}:
        </p>
        <PacksTable caption="Credit packs and prices" />
        <p>
          Credits are a digital service: nothing is shipped. Prices may change; the price shown at checkout is the one
          that applies. This policy is part of our <TextLink to="/terms">Terms of Service</TextLink>.
        </p>
      </>
    ),
  },
  {
    id: 'delivery',
    title: 'Delivery',
    body: (
      <>
        <p>
          Credits are added to your account as soon as SSLCommerz confirms your payment to us. Your account then shows
          the new balance and the date the credits expire: they are valid for the pack&rsquo;s period ({packPeriods}{' '}
          days) from the moment they are added.
        </p>
        <p>
          Free trial credits ({count(TRIAL.credits)}, valid for {TRIAL.days} days) are added once per account, when its
          email address is confirmed. They are free, so there is nothing to refund.
        </p>
      </>
    ),
  },
  {
    id: 'paid-but-no-credits',
    title: 'Paid, but no credits',
    body: (
      <>
        <p>
          If money left your account but the credits didn&rsquo;t appear (for example, the connection dropped during
          checkout), contact us within {PAYMENT_CLAIM_DAYS} days of the payment, with the details listed under{' '}
          <TextLink to="#how-to-ask">How to ask for a refund</TextLink>.
        </p>
        <p>
          We&rsquo;ll check the payment with SSLCommerz. If it went through, we&rsquo;ll either add the credits or, if you
          prefer, refund the payment in full to the method you paid with, within <Biz k="refundTime" />.
        </p>
        <Review>
          Confirm the {PAYMENT_CLAIM_DAYS}-day window for reporting a problem, and that the customer may choose a refund
          instead of the credits.
        </Review>
      </>
    ),
  },
  {
    id: 'charged-twice',
    title: 'Charged twice, or the wrong amount',
    body: (
      <p>
        If you were charged more than once for the same purchase, or charged more than the price shown at checkout, tell
        us. Once we have confirmed it with SSLCommerz, we refund the extra amount in full, to the method you paid with,
        within <Biz k="refundTime" />.
      </p>
    ),
  },
  {
    id: 'failed-actions',
    title: 'Failed AI actions',
    body: (
      <>
        <p>
          You don&rsquo;t need to ask: if an AI action fails (for example, the AI service doesn&rsquo;t answer, or returns
          something unusable), the credits it took are returned to your balance automatically. If those credits expired
          while the action was running, they come back as new credits valid for {REFUND_BATCH_DAYS} days.
        </p>
        <p>
          Credits are not returned for an action that worked but whose suggestion you didn&rsquo;t like or didn&rsquo;t
          use.
        </p>
      </>
    ),
  },
  {
    id: 'unused-and-expired',
    title: 'Unused and expired credits',
    body: (
      <>
        <p>
          Once credits have been delivered, they are not refundable, including credits you haven&rsquo;t used yet,
          except:
        </p>
        <List>
          <li>where the law requires a refund; or</li>
          <li>
            where a technical fault on our side stopped you from using them, for example if AI features were unavailable
            for a long part of their validity. We then refund the unused credits or give you replacement credits.
          </li>
        </List>
        <Review>
          Decide how a &ldquo;technical fault on our side&rdquo; is judged, and whether you refund money or replace
          credits in that case.
        </Review>
        <p>
          Expired credits can&rsquo;t be used, refunded or restored, except under the technical-fault rule above. Your
          account shows when your credits expire, and we email you a reminder before unused credits expire.
        </p>
        <p>
          Free trial credits, and credits we give away, have no cash value and are never refunded. Deleting your account
          deletes any credits left in it; they are not refunded, so use them first.
        </p>
        <Review>
          Confirm that deleting an account gives up its unused paid credits, and consider saying so in the
          delete-account dialog as well.
        </Review>
      </>
    ),
  },
  {
    id: 'cancellation',
    title: 'Cancellation',
    body: (
      <>
        <p>
          There are no subscriptions. Each purchase is a one-off payment, so there is nothing to cancel later and nothing
          renews.
        </p>
        <p>
          You can cancel a purchase during checkout: if you close or cancel the SSLCommerz payment page before confirming
          the payment, you are not charged. If money left your account anyway, see{' '}
          <TextLink to="#paid-but-no-credits">Paid, but no credits</TextLink>. Once credits have been delivered, the
          purchase can&rsquo;t be cancelled (see <TextLink to="#unused-and-expired">Unused and expired credits</TextLink>
          ).
        </p>
        <Review>
          Many services refund a pack if none of its credits have been used within a few days of purchase. Decide whether
          to offer that; if you do, describe it here.
        </Review>
      </>
    ),
  },
  {
    id: 'how-to-ask',
    title: 'How to ask for a refund',
    body: (
      <>
        <p>
          Email <SupportEmail /> or call <SupportPhone />, with:
        </p>
        <List>
          <li>the email address of your {APP_NAME} account;</li>
          <li>the date and time of the payment, and the amount;</li>
          <li>the payment method (bKash, Nagad, Rocket or card);</li>
          <li>the transaction ID from SSLCommerz&rsquo;s confirmation, or from the message your bank or wallet sent.</li>
        </List>
        <p>
          We reply <Biz k="responseTime" />. Approved refunds are sent back to the method you paid with, within{' '}
          <Biz k="refundTime" />; how quickly the money then appears depends on your bank or wallet provider. A refunded
          purchase&rsquo;s credits are removed from your account.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        <Biz k="legalName" />, <Biz k="address" />, <Biz k="country" />. All the ways to reach us are on our{' '}
        <TextLink to="/contact">Contact page</TextLink>.
      </p>
    ),
  },
];

export function RefundPage() {
  return (
    <LegalLayout
      page="refunds"
      lede={
        <>
          How payments, cancellations and refunds work for credit packs on {APP_NAME}. If something goes wrong on our
          side, we put it right.
        </>
      }
      summary={[
        <>Credits are added to your account as soon as SSLCommerz confirms your payment.</>,
        <>
          Paid but got no credits? Tell us within {PAYMENT_CLAIM_DAYS} days: we&rsquo;ll add them, or refund you in full.
        </>,
        <>Charged twice? We refund the extra payment in full.</>,
        <>Failed AI actions give their credits back automatically.</>,
        <>Otherwise, delivered credits aren&rsquo;t refundable, and expired credits can&rsquo;t be restored.</>,
      ]}
      sections={SECTIONS}
    />
  );
}
