import { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout, LegalH2 } from "@/components/legal-page-layout";

export const metadata: Metadata = {
  title: "Refund Policy — ClipForge",
  description: "How refunds, cancellations, and the free trial work on ClipForge.",
};

const LAST_UPDATED = "September 8, 2026";

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout title="Refund & Cancellation Policy" lastUpdated={LAST_UPDATED}>
      <p>
        All ClipForge purchases are made through{" "}
        <a href="https://paddle.com" className="underline" target="_blank" rel="noopener noreferrer">
          Paddle.com Market Limited
        </a>
        , our reseller and merchant of record. Paddle is the seller of record
        for your order, issues your receipt, and handles the actual refund
        transaction. Refund requests are governed by{" "}
        <a
          href="https://www.paddle.com/legal/checkout-buyer-terms"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Paddle&rsquo;s Buyer Terms
        </a>
        , in addition to the policy below.
      </p>

      <LegalH2>Free trial</LegalH2>
      <p>
        Every paid plan includes a 7-day free trial. You won&rsquo;t be charged
        until the trial ends. Cancel any time during the trial from the{" "}
        <Link href="/account" className="underline">
          billing portal
        </Link>{" "}
        to avoid being charged.
      </p>

      <LegalH2>Cancelling a subscription</LegalH2>
      <p>
        You can cancel your subscription at any time from the billing portal.
        Cancelling stops future renewals; you keep access to your current
        plan&rsquo;s features and remaining credits until the end of the billing
        period you&rsquo;ve already paid for. We don&rsquo;t charge cancellation fees.
      </p>

      <LegalH2>Refunds</LegalH2>
      <p>
        Because processing a video consumes real, immediate compute and
        third-party AI costs the moment you run it, we don&rsquo;t offer refunds
        for credits already used to process video. Outside of that:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          If you&rsquo;re charged in error, or a technical issue with the Service
          prevented you from using credits you paid for, email{" "}
          <a href="mailto:support@clickforg.com" className="underline">
            support@clickforg.com
          </a>{" "}
          within 14 days of the charge and we&rsquo;ll make it right.
        </li>
        <li>
          If you cancel shortly after a renewal and haven&rsquo;t used any of that
          period&rsquo;s credits, contact us and we&rsquo;ll consider a full or partial
          refund on a case-by-case basis.
        </li>
        <li>
          Approved refunds are issued to your original payment method by
          Paddle and may take several business days to appear, depending on
          your bank or card issuer.
        </li>
      </ul>

      <LegalH2>Contact</LegalH2>
      <p>
        Questions about a charge or a refund? Email{" "}
        <a href="mailto:support@clickforg.com" className="underline">
          support@clickforg.com
        </a>{" "}
        and include your account email and, if possible, the receipt from
        Paddle. See also our{" "}
        <Link href="/terms" className="underline">
          Terms of Service
        </Link>
        .
      </p>
    </LegalPageLayout>
  );
}
