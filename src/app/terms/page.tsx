// Public terms of service, linked from Google's consent screen.
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of service · SponsorDesk" };

const CONTACT = "patekarvijay262@gmail.com";

export default function Terms() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-sm leading-relaxed text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-medium [&_p]:mt-2">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of service</h1>
      <p className="text-muted-foreground">Last updated 3 November 2026</p>

      <h2>Using SponsorDesk</h2>
      <p>SponsorDesk is a tool for event organisers to research sponsors, draft outreach and track deals. You are responsible for what you send from it and for having the right to contact the people you write to.</p>

      <h2>Your content</h2>
      <p>Your event details, drafts and deals stay yours. You let us store and process them only to run the service. See the <a className="underline" href="/privacy">privacy policy</a>.</p>

      <h2>Suggestions are not promises</h2>
      <p>Sponsor suggestions, prices and scores come from public data and rules. They can be wrong or out of date. Check them before you rely on them, and review every email before it is sent.</p>

      <h2>Fair use</h2>
      <p>Do not use SponsorDesk to send spam, to mislead anyone, or to break the law. We may suspend accounts that do.</p>

      <h2>No warranty</h2>
      <p>The service is provided as it is, without warranties. To the extent the law allows, we are not liable for indirect losses or for deals that do not close.</p>

      <h2>Changes</h2>
      <p>We may update these terms; the date above shows the latest version.</p>

      <h2>Contact</h2>
      <p><a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
    </main>
  );
}
