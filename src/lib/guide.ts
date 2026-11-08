// How to use SponsorDesk, written once and used three ways: the Help page (the user manual), the guided tour (Next,
// Next, with pages opening on their own) and the Ask bot's answers to "how do I…". Change a step here and all three
// change together. No imports, so it runs in the browser and on the server. Labels match the screens exactly.

export type Link = { label: string; href: string };
export type HowTo = { id: string; title: string; ask: RegExp; steps: string[]; links: Link[]; tip?: string };
export type TourStep = { path: string; target: string; title: string; text: string };

/** The organiser's day, in the order the menu follows. Sections of the manual and answers of the bot. */
export const HOWTOS: HowTo[] = [
  { id: "start", title: "Start: sign in and set up your event", ask: /\b(start|begin|first time|new here|set ?up|getting started|where do i begin|how does (this|it) work)\b/,
    steps: ["Sign in with your Google account. The first person to sign in on a desk is its owner.", "Open **Event** and describe the event in one line: name, dates, city, footfall. Name and dates are enough to begin.", "Press *Package my event*. The desk prices your tiers and reads your website for past sponsors."],
    links: [{ label: "Open Event", href: "/desk/brief" }], tip: "You can start at any step. Nothing is locked behind another." },
  { id: "dates", title: "Change dates, city, address or your signature", ask: /\b(date|dates|city|venue|address|postal|pin ?code|signature|my name|my title|phone number of mine|footfall|edit (the )?(event|details))\b/,
    steps: ["Open **Event**.", "Under *Details* press *Edit details*.", "Change dates, city, footfall, postal address or your signature, then *Save*."],
    links: [{ label: "Open Event", href: "/desk/brief" }], tip: "The postal address and signature go under every email." },
  { id: "past", title: "Add past sponsors (they set the level)", ask: /\b(past sponsors?|previous sponsors?|last year'?s? sponsors?|old sponsors?|returning sponsors?|level)\b/,
    steps: ["Open **Event** and find *Past sponsors*.", "Type the names, comma separated (for example: Marsh McLennan, NPCI, L&T), and press *Add*.", "The next search aims at companies of the same size and industries, and writes to past sponsors first."],
    links: [{ label: "Open Event", href: "/desk/brief" }] },
  { id: "categories", title: "Choose categories and how many sponsors in each", ask: /\b(categor|food|beverage|banking|fintech|how many sponsors|kind of sponsor|type of sponsor|which sponsors|sector|industry)\b/,
    steps: ["Open **Event** and find *Looking for*.", "Click the categories you want, for example Food and beverages or Fintech and banking.", "Type a number next to each one, then press *Save*. The search fills each category to its number."],
    links: [{ label: "Open Event", href: "/desk/brief" }] },
  { id: "people", title: "Set how many people to reach at each company", ask: /\b(how many people|people per company|members|contacts per company|more people|10|12|15|20)\b.*\b(company|companies|people|members|contacts)\b|\bpeople per company\b/,
    steps: ["Open **Event** and find *People to find per company*.", "Type a number (12 is a good start) and press *Save*.", "Only people with a verified work email are kept. Emails go to them 3 at a time, best placed first."],
    links: [{ label: "Open Event", href: "/desk/brief" }] },
  { id: "find", title: "Find companies", ask: /\b(find|search|discover|get|look for) (sponsors|companies|brands|more)\b|\bfind companies\b|\bautopilot\b/,
    steps: ["On **Home**, type how many companies you want in the *Companies* card (or let your category numbers decide).", "Press *Find companies*. A bar at the top shows progress; it takes a few minutes.", "Each company comes with a reason, a suggested offer, and people with email, phone and LinkedIn."],
    links: [{ label: "Open Home", href: "/desk" }] },
  { id: "different", title: "Not happy with the companies? Find different ones", ask: /\b(different|other|new|replace|not happy|don'?t like|re-?run|again)\b.*\b(compan|sponsor|list|brand)|\bfind different\b/,
    steps: ["Open **Companies**.", "Press *Find different companies*.", "The ones you have not written to are set aside (never suggested again) and the same number of new ones is found."],
    links: [{ label: "Open Companies", href: "/desk/companies" }] },
  { id: "add", title: "Add a company you already know", ask: /\badd (a )?(company|sponsor|brand)\b|\bspecific (company|brand)\b|\bmy own (company|list)\b/,
    steps: ["Open **Companies** and press *Add a company*.", "Type the brand and its website and press *Add and score*. The desk finds its people and drafts an offer."],
    links: [{ label: "Open Companies", href: "/desk/companies" }] },
  { id: "contacts", title: "See people, emails, phones and LinkedIn", ask: /\b(email ids?|email address(es)?|phone|mobile|number|linkedin|contact details|decision makers?|who (to|should i) (contact|email|write))\b/,
    steps: ["Open **Companies** and click a company.", "Go to the *People* tab: each person shows the verified email, phone when known, and a LinkedIn link.", "The **People** page lists everyone across companies; *Export CSV* downloads it."],
    links: [{ label: "Open Companies", href: "/desk/companies" }, { label: "Open People", href: "/desk/people" }] },
  { id: "draft", title: "Write your own email", ask: /\b(write|my|own|change|edit)\b.*\b(email|draft|template|mail|message)\b|\btemplate\b|\bblanks?\b/,
    steps: ["Open **Your draft**.", "Write the email the way you would send it. Click the blanks to insert them: First name, Company, Why them, Suggested offer, Event.", "Check *How it reads* for a real person, then press *Save*. Every new email uses it; *Use it for the waiting emails* rewrites the ones not yet sent."],
    links: [{ label: "Open Your draft", href: "/desk/draft" }], tip: "Your signature, postal address and a one-line opt-out are added for you." },
  { id: "deck", title: "Send your sponsorship deck (PPT or PDF)", ask: /\b(deck|ppt|pptx|pdf|presentation|brochure|attach|attachment|proposal file)\b/,
    steps: ["Open **Your draft** and find *Your deck*.", "Press *Upload deck* and pick your PPT, PPTX or PDF (up to 15 MB).", "Choose *Attach the file* or *Share as a link*. It goes with every first email."],
    links: [{ label: "Open Your draft", href: "/desk/draft" }], tip: "Over 15 MB? Export it as a PDF." },
  { id: "send", title: "Approve and send emails", ask: /\b(approve|send|sending|outbox|go out|dispatch)\b/,
    steps: ["Open **Send**. Every email waits here; nothing goes out without your yes.", "Read each one, press *Edit* to change it or *Approve* to say yes.", "Approved emails go out on schedule from your own Gmail, spaced out so they land well."],
    links: [{ label: "Open Send", href: "/desk/outbox" }], tip: "Without Gmail connected, approved emails simply wait." },
  { id: "gmail", title: "Connect Gmail and Calendar", ask: /\b(gmail|google account|calendar|mailbox)\b/,
    steps: ["Open **Connectors** (in the menu, or at the bottom of **Event**).", "On *Gmail and Calendar* press *Connect Google* and allow Gmail and Calendar.", "Emails now go from your mailbox, replies are read, and meetings get Google Meet links."],
    links: [{ label: "Open Connectors", href: "/desk/connectors" }] },
  { id: "connectors", title: "Connect Apollo, Claude, Gemini, Canva or any tool", ask: /\b(connectors?|apollo|claude|anthropic|gemini|canva|notion|hubspot|zoho|airtable|trello|slack|integrat|plug ?in|api key|another tool|other tool)\b/,
    steps: ["Open **Connectors** (in the menu, or at the bottom of **Event**).", "For Crustdata, Apollo, Claude or Gemini press *Connect*, paste your API key and press *Check and save*. The desk tests the key first and stores it encrypted.", "For anything else (Canva, Google Drive, Notion, a CRM) use *Any other tool*: a name, a link, and an optional key. A Canva, Slides or Drive deck link can be sent with every first email."],
    links: [{ label: "Open Connectors", href: "/desk/connectors" }], tip: "Only admins can connect or remove services. Keys are never shown again, only their last 4 characters." },
  { id: "more-people", title: "Write to more people at the same company", ask: /\b(next 3|next three|more people at|other people at|write to more|wave)\b/,
    steps: ["Open the company and go to *People*.", "Press *Write to the next 3*.", "The next 3 best-placed people get the email once the first 3 have had their follow-ups without a reply."],
    links: [{ label: "Open Companies", href: "/desk/companies" }] },
  { id: "replies", title: "Read replies", ask: /\b(reply|replies|respond|answered|inbox|wrote back)\b/,
    steps: ["Open **Replies**.", "Each reply is sorted (interested, not now, wants a call, an offer). Any reply stops cold emails to that company.", "Offers below your lowest price wait here for your call."],
    links: [{ label: "Open Replies", href: "/desk/inbox" }] },
  { id: "followups", title: "Follow-ups", ask: /\b(follow ?up|follow-ups|remind (them|the sponsor)|chase|no reply)\b/,
    steps: ["Follow-ups are automatic: up to 2 short ones after the first email, a few days apart.", "They stop the moment anyone at that company replies.", "You see each one in **Send** and on *Today* the day it goes."],
    links: [{ label: "Open Send", href: "/desk/outbox" }] },
  { id: "meeting", title: "Book a meeting", ask: /\b(meeting|meet|call|schedule|slot)\b/,
    steps: ["Open the company and go to *Next steps*.", "Use *Book a meeting* to draft the scheduling email with your times.", "When they pick a time, confirm it: a Google Meet invite goes to them and it shows on **Meetings** and *Today*."],
    links: [{ label: "Open Meetings", href: "/desk/meetings" }] },
  { id: "mou", title: "Draft and send the MOU", ask: /\b(mou|contract|agreement|sign|deal)\b/,
    steps: ["When a sponsor agrees, open the company and fill the deal: tier, amount, deliverables, payment terms.", "Press *Draft MOU*. Review it under **Deals and MOUs**.", "Press *Email for signature* to send it. Amounts below your lowest price come to you first."],
    links: [{ label: "Open Deals and MOUs", href: "/desk/deals" }] },
  { id: "today", title: "Daily reminder", ask: /\b(remind|reminder|today|daily|every day|morning|forget)\b/,
    steps: ["**Home** starts with *Today*: emails waiting for your yes, what goes out on its own, meetings today or tomorrow, new replies.", "With Gmail connected, tick *Email me this list at 9 am* to get it every morning.", "If nothing needs you, it says so."],
    links: [{ label: "Open Home", href: "/desk" }] },
  { id: "prices", title: "Change prices and your lowest price", ask: /\b(price|prices|tier|tiers|title sponsor|platinum|gold|silver|floor|lowest|minimum|package)\b/,
    steps: ["Open **Event** and find *Prices*.", "Press *Edit tiers* to change amounts and what each tier gets.", "Set *Lowest you would accept* and save. Agents never agree below it; sponsors never see it."],
    links: [{ label: "Open Event", href: "/desk/brief" }] },
  { id: "team", title: "Give your team access", ask: /\b(team|teammate|friend|colleague|invite|access|role|admin|approver|login|log in|sign in)\b/,
    steps: ["Anyone can sign in with their Google account and gets a private desk of their own.", "To work on the same desk, the owner adds them in **Settings** with a role: admin, approver, operator or read-only.", "Only approvers and admins can approve emails."],
    links: [{ label: "Open Settings", href: "/desk/settings" }] },
  { id: "tour", title: "Take the tour again", ask: /\b(tour|walkthrough|walk me through|guide me|teach me|show me how|tutorial|manual|help)\b/,
    steps: ["Open **Help** at the bottom of the menu.", "Press *Start the tour*. It opens each page and points at the button to press; use *Next*, or *Play* to let it run on its own."],
    links: [{ label: "Open Help", href: "/desk/help" }, { label: "Start the tour", href: "/desk?tour=1" }] },
];

/** The guided tour: each step opens its page and points at one thing. */
export const TOUR: TourStep[] = [
  { path: "/desk", target: "today", title: "Today", text: "Each morning, start here: emails waiting for your yes, what goes out on its own, meetings and new replies." },
  { path: "/desk", target: "steps", title: "Four steps", text: "Event, Companies, Your draft, Send. Start with any one; nothing is locked." },
  { path: "/desk/brief", target: "details", title: "Your event", text: "Dates, city, footfall, postal address and your signature. Press Edit details to change any of them." },
  { path: "/desk/brief", target: "past", title: "Past sponsors", text: "Type past sponsors here. They set the level of company the desk aims for, and they are written to first." },
  { path: "/desk/brief", target: "looking", title: "What you are looking for", text: "Click categories and type how many sponsors you want in each. Set how many people to reach at every company." },
  { path: "/desk", target: "find", title: "Find companies", text: "Type a number and press Find companies. A bar at the top shows progress; each company comes with people, emails, phones and LinkedIn." },
  { path: "/desk/companies", target: "companies-actions", title: "Your companies", text: "Not happy with the list? Find different companies. Know a brand already? Add a company." },
  { path: "/desk/draft", target: "draft", title: "Your draft", text: "Write the email once. Click the blanks (First name, Company, Why them…) and the desk fits it to every person." },
  { path: "/desk/draft", target: "deck", title: "Your deck", text: "Upload your PPT or PDF once. It goes with every first email, attached or as a link." },
  { path: "/desk/outbox", target: "send", title: "Send", text: "Every email waits here for your yes. Read, edit or approve; approved emails go out from your Gmail." },
  { path: "/desk/inbox", target: "replies", title: "Replies", text: "What sponsors wrote back. Any reply stops cold emails to that company." },
  { path: "/desk/connectors", target: "connectors", title: "Connectors", text: "Plug in Gmail and Calendar, Apollo, Claude, Gemini, Canva or any tool your team uses. Paste a key once; the desk checks it and keeps it safe." },
  { path: "/desk", target: "ask", title: "Ask anything", text: "Stuck? Press Ask and type a question like “how do I attach my deck?”. The answer comes with a button to the right page." },
  { path: "/desk", target: "help", title: "Help is always here", text: "The full manual and this tour live under Help. That's it: you are ready." },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9& ]+/g, " ").replace(/\s+/g, " ").trim();

/** The best how-to for a question, or null. Matches the topic words; "how", "where" and "can I" make it a how-to. */
export function findHowTo(question: string): HowTo | null {
  const q = norm(question);
  const hits = HOWTOS.filter((h) => h.ask.test(q));
  if (!hits.length) return null;
  // Prefer the most specific topic: the one whose matched words are longest.
  return hits.sort((a, b) => (q.match(b.ask)?.[0].length || 0) - (q.match(a.ask)?.[0].length || 0))[0];
}

/** A how-to as the bot's markdown answer. */
export const howToAnswer = (h: HowTo) => `**${h.title}**\n${h.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}${h.tip ? `\n\n${h.tip}` : ""}`;
