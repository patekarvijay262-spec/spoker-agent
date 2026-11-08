// Public privacy policy: Google's consent screen links here before the app can be published to every Google user.
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy · SponsorDesk" };

const CONTACT = "patekarvijay262@gmail.com";

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-sm leading-relaxed text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-medium [&_li]:mt-1 [&_p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy policy</h1>
      <p className="text-muted-foreground">Last updated 8 November 2026</p>

      <p>SponsorDesk helps event organisers find sponsors, write to them and track deals. This page explains what it stores and why.</p>

      <h2>What we store</h2>
      <ul>
        <li>Your Google name and email address, so you can sign in. We never see your Google password.</li>
        <li>Your event details, the companies and contacts on your desk, drafts, messages and deals you create.</li>
        <li>If you connect Gmail and Calendar: permission to send the emails you approve, read the replies sponsors send to those emails, and add the meetings you confirm to your calendar. Access tokens are stored encrypted.</li>
        <li>If you connect Instagram: read-only access to your own posts, to find past sponsors.</li>
        <li>Sign-ins and actions on your desk, with IP address and browser, for security and so the workspace owner can see activity.</li>
      </ul>

      <h2>Who processes it</h2>
      <ul>
        <li>Vercel and Neon host the app and its database.</li>
        <li>Crustdata supplies public company, people and web data for sponsor search.</li>
        <li>Apollo (if you connect it) supplies public work contact details for sponsor companies.</li>
        <li>Sarvam AI handles voice and translation; Anthropic (Claude) and Google (Gemini), if your desk connects them, answer open questions. What you type or say to the assistant is sent to the one in use. Your Gmail messages are never sent to them.</li>
        <li>Google and Instagram, only for the accounts you connect.</li>
      </ul>
      <p>We do not sell your data or use it for advertising. Google user data is used only to provide SponsorDesk features you turn on, in line with the Google API Services User Data Policy, including its Limited Use requirements.</p>

      <h2>How SponsorDesk uses Google data</h2>
      <ul>
        <li><b>Sign in</b> (name and email): to create your account and show who is signed in.</li>
        <li><b>Gmail send</b>: to send only the sponsor emails you or your approver have approved, from your own mailbox.</li>
        <li><b>Gmail read</b>, limited to: replies in the threads SponsorDesk started, or new emails from the sponsor contacts you wrote to, so follow-ups stop and you see the reply; your Sent folder, to confirm an approved email went out; and, when you ask, the Google Meet notes email for a sponsor meeting. Other email in your inbox is not read, stored or analysed.</li>
        <li><b>Calendar events</b>: to add a meeting you confirm with a sponsor, with a Google Meet link.</li>
      </ul>
      <p>Google data is not used to train AI or machine learning models, is not transferred to anyone except as needed to provide these features or by law, and no person reads it unless you ask us to for support, it is needed for security, or the law requires it.</p>

      <h2>Who can see it</h2>
      <p>Each person gets a private desk. Teammates you invite see your desk. The workspace owner can view desks read-only and see sign-in activity.</p>

      <h2>Your choices</h2>
      <p>You can disconnect Gmail, Calendar or Instagram in Connectors at any time, and revoke access from your Google account. To delete your account and data, email us and we will do it within 30 days. Disconnecting Google deletes its stored tokens straight away.</p>

      <h2>Contact</h2>
      <p><a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
    </main>
  );
}
