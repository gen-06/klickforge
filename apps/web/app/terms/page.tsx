import { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout, LegalH2 } from "@/components/legal-page-layout";

export const metadata: Metadata = {
  title: "Terms of Service — ClipForge",
  description: "The terms that govern your use of ClipForge.",
};

const LAST_UPDATED = "September 8, 2026";

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of
        ClipForge (the &ldquo;Service&rdquo;), operated by an individual doing business as
        ClipForge (&ldquo;ClipForge,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), reachable at{" "}
        <a href="mailto:support@clickforg.com" className="underline">
          support@clickforg.com
        </a>
        . By creating an account or using the Service, you agree to these Terms. If
        you do not agree, do not use the Service.
      </p>

      <LegalH2>1. What ClipForge does</LegalH2>
      <p>
        ClipForge lets you upload long-form video, and uses automated processing
        (including third-party AI services) to identify segments, generate
        vertical clips, add captions, and optionally generate translated
        voiceovers. Processing consumes credits from your account balance based
        on your plan and the length of video processed.
      </p>

      <LegalH2>2. Accounts</LegalH2>
      <p>
        You must provide accurate information when creating an account and are
        responsible for activity that happens under your account. You must be at
        least 18 years old, or the age of majority in your jurisdiction, to use
        the Service. Authentication is provided by our processor, Clerk; your
        login credentials are managed by Clerk under its own terms and privacy
        policy.
      </p>

      <LegalH2>3. Subscriptions, billing, and Paddle</LegalH2>
      <p>
        Paid plans are billed on a recurring monthly or annual basis and include
        a free trial period as stated at checkout. You can cancel at any time;
        access continues until the end of the current billing period unless
        stated otherwise.
      </p>
      <p>
        All payments are processed by{" "}
        <a href="https://paddle.com" className="underline" target="_blank" rel="noopener noreferrer">
          Paddle.com Market Limited
        </a>
        , our reseller and merchant of record. Paddle handles billing, invoicing,
        sales tax/VAT collection and remittance, and is the merchant of record
        for all orders. Your purchase is subject to{" "}
        <a
          href="https://www.paddle.com/legal/checkout-buyer-terms"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Paddle&rsquo;s Buyer Terms
        </a>
        . See our{" "}
        <Link href="/refund-policy" className="underline">
          Refund Policy
        </Link>{" "}
        for how refunds and cancellations work.
      </p>

      <LegalH2>4. Your content</LegalH2>
      <p>
        You retain all ownership rights to the video, audio, and other content
        you upload (&ldquo;Your Content&rdquo;). You grant us a limited license to store,
        process, and transmit Your Content solely to provide the Service to
        you &mdash; including sending it to third-party AI providers for
        transcription, translation, and voice synthesis as described in our{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        . We do not use Your Content to train AI models, and we do not claim
        ownership over it.
      </p>
      <p>
        You are solely responsible for Your Content and confirm that you have
        all necessary rights to upload it and to have it processed as described
        here. You agree not to upload content that:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>infringes someone else&rsquo;s intellectual property or other rights;</li>
        <li>is unlawful, defamatory, or violates a third party&rsquo;s privacy;</li>
        <li>contains malware or attempts to disrupt the Service; or</li>
        <li>
          depicts child sexual abuse material, non-consensual intimate imagery,
          or otherwise violates applicable law.
        </li>
      </ul>
      <p>
        We may remove content or suspend accounts that violate this section,
        with or without notice.
      </p>

      <LegalH2>5. Acceptable use</LegalH2>
      <p>
        Don&rsquo;t misuse the Service: no attempting to bypass credit limits or
        rate limits, no reverse engineering, no reselling access without our
        written consent, and no using the Service to build a competing product.
      </p>

      <LegalH2>6. Termination</LegalH2>
      <p>
        You may stop using the Service and cancel your subscription at any
        time from your account settings or the{" "}
        <Link href="/account" className="underline">
          billing portal
        </Link>
        . We may suspend or terminate your access if you violate these Terms,
        with notice where reasonably practicable.
      </p>

      <LegalH2>7. Disclaimers</LegalH2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties of any kind, express
        or implied. AI-generated captions, translations, and voiceovers may
        contain errors &mdash; you&rsquo;re responsible for reviewing output before
        publishing it.
      </p>

      <LegalH2>8. Limitation of liability</LegalH2>
      <p>
        To the maximum extent permitted by law, ClipForge will not be liable
        for any indirect, incidental, special, or consequential damages, or for
        any loss of profits or data, arising from your use of the Service. Our
        total liability for any claim relating to the Service will not exceed
        the amount you paid us in the 12 months before the claim arose.
      </p>

      <LegalH2>9. Changes to these Terms</LegalH2>
      <p>
        We may update these Terms from time to time. We&rsquo;ll update the
        &ldquo;Last updated&rdquo; date above; continued use of the Service after a
        change means you accept the revised Terms.
      </p>

      <LegalH2>10. Governing law</LegalH2>
      <p>
        These Terms are governed by the laws of the United States, without
        regard to conflict-of-law principles.
      </p>

      <LegalH2>11. Contact</LegalH2>
      <p>
        Questions about these Terms? Email{" "}
        <a href="mailto:support@clickforg.com" className="underline">
          support@clickforg.com
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}
