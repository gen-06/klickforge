import { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout, LegalH2 } from "@/components/legal-page-layout";

export const metadata: Metadata = {
  title: "Privacy Policy — ClipForge",
  description: "How ClipForge collects, uses, and protects your data.",
};

const LAST_UPDATED = "September 8, 2026";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        This Privacy Policy explains what information ClipForge (&ldquo;we,&rdquo;
        &ldquo;us&rdquo;) collects when you use clickforg.com and the ClipForge service
        (the &ldquo;Service&rdquo;), and how we use it. If you have questions, email{" "}
        <a href="mailto:support@clickforg.com" className="underline">
          support@clickforg.com
        </a>
        .
      </p>

      <LegalH2>1. Information we collect</LegalH2>
      <p>
        <strong>Account information.</strong> When you sign up, our
        authentication provider, Clerk, collects your email address and
        authentication credentials. We store your Clerk user ID and email in
        our own database to associate it with your usage and subscription.
      </p>
      <p>
        <strong>Content you upload.</strong> The video and audio files you
        upload for processing, and the clips, captions, and transcripts
        generated from them.
      </p>
      <p>
        <strong>Billing information.</strong> Subscription and payment data is
        collected and processed by Paddle, our payment processor and merchant
        of record. We do not receive or store your full payment card details
        &mdash; we receive your Paddle customer ID, subscription status, and
        plan information so we can grant access to the Service.
      </p>
      <p>
        <strong>Usage data.</strong> Standard technical data such as IP
        address, browser type, and pages visited, collected for security,
        rate-limiting, and diagnosing issues.
      </p>

      <LegalH2>2. How we use your information</LegalH2>
      <ul className="list-disc space-y-1 pl-6">
        <li>To provide, operate, and maintain the Service;</li>
        <li>To process your video content into clips, captions, and voiceovers;</li>
        <li>To manage your subscription, billing, and credits;</li>
        <li>To communicate with you about your account or the Service; and</li>
        <li>To detect, prevent, and address fraud, abuse, or security issues.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <LegalH2>3. Third parties we share data with</LegalH2>
      <p>
        We use a small number of subprocessors to run the Service. Each only
        receives the data it needs to do its job:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>Clerk</strong> &mdash; authentication and account management.
        </li>
        <li>
          <strong>Paddle</strong> &mdash; billing, subscription management, and
          tax collection as merchant of record.
        </li>
        <li>
          <strong>OpenAI</strong> &mdash; your uploaded audio/video is sent to
          OpenAI&rsquo;s Whisper (transcription), GPT-4o-mini (translation and
          clip scoring), and TTS (voiceover generation) APIs to process your
          content. OpenAI processes this data under its own API terms and
          does not use API-submitted content to train its models.
        </li>
        <li>
          <strong>Cloudflare</strong> &mdash; your uploaded videos and
          generated clips are stored in Cloudflare R2 object storage.
        </li>
        <li>
          <strong>Railway and Vercel</strong> &mdash; our application and
          database hosting providers.
        </li>
      </ul>
      <p>
        We don&rsquo;t share your content or personal data with anyone else
        except as required by law or to protect our rights.
      </p>

      <LegalH2>4. Data retention</LegalH2>
      <p>
        We retain your account data for as long as your account is active. If
        you delete a video or clip, we delete the underlying file from
        storage; account and billing records may be retained longer where
        needed for legal, tax, or fraud-prevention purposes.
      </p>

      <LegalH2>5. Your rights</LegalH2>
      <p>
        Depending on where you live, you may have rights to access, correct,
        delete, or export your personal data. You can delete videos and clips
        directly from your dashboard, or email{" "}
        <a href="mailto:support@clickforg.com" className="underline">
          support@clickforg.com
        </a>{" "}
        to request account deletion or a copy of your data.
      </p>

      <LegalH2>6. Security</LegalH2>
      <p>
        We use industry-standard measures (encryption in transit, access
        controls, presigned URLs for uploads/downloads) to protect your data.
        No method of transmission or storage is 100% secure, and we can&rsquo;t
        guarantee absolute security.
      </p>

      <LegalH2>7. Children&rsquo;s privacy</LegalH2>
      <p>
        The Service is not directed to children under 18, and we do not
        knowingly collect personal information from them.
      </p>

      <LegalH2>8. Changes to this policy</LegalH2>
      <p>
        We may update this Privacy Policy from time to time. We&rsquo;ll update
        the &ldquo;Last updated&rdquo; date above when we do.
      </p>

      <LegalH2>9. Contact</LegalH2>
      <p>
        Questions about this policy or your data? Email{" "}
        <a href="mailto:support@clickforg.com" className="underline">
          support@clickforg.com
        </a>
        . See also our{" "}
        <Link href="/terms" className="underline">
          Terms of Service
        </Link>
        .
      </p>
    </LegalPageLayout>
  );
}
