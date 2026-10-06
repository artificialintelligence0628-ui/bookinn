import React from "react";
import { C } from "./theme.js";

/* ---------------------------------------------------------
   LEGAL PAGES — Privacy Policy, Terms & Conditions, Cookie Policy

   Everything business-specific lives in LEGAL below, so you only edit one
   place. Fields left as "" are simply left out of the pages.

   Written to match what the app actually does today (see the comments on
   each section). If you add analytics, ads, payments, a new third-party
   service, or start keeping data differently, update these pages too.
--------------------------------------------------------- */
export const LEGAL = {
  brand: "BookInn",
  site: "bookinngh.com",
  email: "bookinn88@gmail.com",
  whatsapp: "+233 59 771 3233",
  whatsappLink: "https://wa.me/233597713233",
  // TODO: put your registered business / trading name here if it differs from "BookInn".
  operator: "BookInn",
  // TODO: add your registered or postal address (leave "" to hide it).
  address: "",
  // TODO: add your Data Protection Commission (Ghana) registration number once you have it (leave "" to hide it).
  dpcRegistration: "",
  effectiveDate: "6 October 2026",
};

/* ---------- small building blocks ---------- */

function LegalHero({ eyebrow, title, subtitle }) {
  return (
    <div style={{ background: `linear-gradient(180deg, ${C.navy} 0%, ${C.blue} 100%)` }} className="py-14">
      <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
        <p style={{ color: "rgba(255,255,255,0.7)" }} className="text-xs font-bold uppercase tracking-wide mb-2">{eyebrow}</p>
        <h1 className="text-white text-2xl md:text-3xl font-extrabold mb-3">{title}</h1>
        {subtitle && <p style={{ color: "rgba(255,255,255,0.85)" }} className="text-sm md:text-base max-w-2xl mx-auto">{subtitle}</p>}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 style={{ color: C.ink }} className="font-bold text-lg mb-2">{title}</h2>
      <div style={{ color: C.gray600 }} className="text-sm leading-relaxed flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

const P = ({ children }) => <p>{children}</p>;

function UL({ items }) {
  return (
    <ul className="list-disc pl-5 flex flex-col gap-1.5">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
}

function InlineLink({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{ color: C.blue }} className="font-semibold hover:underline">
      {children}
    </button>
  );
}

function ContactLines() {
  return (
    <ul className="list-none flex flex-col gap-1">
      <li>
        Email: <a href={`mailto:${LEGAL.email}`} style={{ color: C.blue }} className="font-semibold hover:underline">{LEGAL.email}</a>
      </li>
      <li>
        WhatsApp: <a href={LEGAL.whatsappLink} target="_blank" rel="noreferrer" style={{ color: C.blue }} className="font-semibold hover:underline">{LEGAL.whatsapp}</a>
      </li>
      {LEGAL.address && <li>Address: {LEGAL.address}</li>}
    </ul>
  );
}

function LegalShell({ eyebrow, title, subtitle, setView, children }) {
  return (
    <div>
      <LegalHero eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-10">
        <p style={{ color: C.gray400 }} className="text-xs mb-6">Last updated: {LEGAL.effectiveDate}</p>
        {children}
        <div style={{ borderColor: C.border }} className="border-t pt-5 mt-10 flex gap-x-5 gap-y-2 flex-wrap text-xs">
          <InlineLink onClick={() => setView("privacy-policy")}>Privacy Policy</InlineLink>
          <InlineLink onClick={() => setView("terms")}>Terms &amp; Conditions</InlineLink>
          <InlineLink onClick={() => setView("cookie-policy")}>Cookie Policy</InlineLink>
          <InlineLink onClick={() => setView("home")}>Back to listings</InlineLink>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PRIVACY POLICY
========================================================= */
export function PrivacyPolicyView({ setView }) {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="What personal information BookInn collects, why, who sees it, and the choices you have."
      setView={setView}
    >
      <Section title="1. Who we are">
        <P>
          {LEGAL.operator} ("BookInn", "we", "us") runs {LEGAL.site}, a website that helps students find hostels, apartments and
          self-contained rooms near university campuses in Ghana, and helps property owners and agents reach those students.
          For the purposes of Ghana's Data Protection Act, 2012 (Act 843), we are the data controller for the personal
          information described in this policy.
        </P>
        {LEGAL.dpcRegistration && <P>Data Protection Commission registration number: {LEGAL.dpcRegistration}.</P>}
        <ContactLines />
      </Section>

      <Section title="2. Information we collect">
        <P><span className="font-semibold">Account information.</span> When you create an account we collect your name, email address, password, account type (student, parent, owner or agent) and, for students, your university. Passwords are stored only as a one-way hash, never as plain text. If you sign in with Google, we receive your name and verified email address from Google; we never see your Google password.</P>
        <P><span className="font-semibold">Booking requests and enquiries.</span> When you contact a property through BookInn we collect your name, phone number and/or email, preferred move-in date, room type and your message. If you create or join a roommate group, we also store the group code and the details you submitted with your request.</P>
        <P><span className="font-semibold">Reviews.</span> If you leave a review we collect the name you enter, your rating and your comments. Reviews are shown publicly on the listing.</P>
        <P><span className="font-semibold">Listing information (owners and agents).</span> Property details, photos, videos, price, location description, and the contact email and WhatsApp number you provide for the listing. Your listing contact details are shown to students so they can reach you.</P>
        <P><span className="font-semibold">Usage information.</span> We count how many times a listing is viewed (a timestamp only, not tied to your identity) so owners can see their profile views. Our hosting provider may also keep standard server logs, such as IP address, browser type and the pages requested, for security and troubleshooting.</P>
        <P><span className="font-semibold">Messages you send us.</span> If you email or WhatsApp us, we keep the conversation so we can help you.</P>
        <P>We do not collect payment card or mobile money details. BookInn does not currently process rent or booking payments.</P>
      </Section>

      <Section title="3. How we use your information, and why">
        <UL items={[
          "To create and run your account, keep you signed in, and let you save and manage things like inquiries and listings (performing our service to you).",
          "To pass your booking request to the property owner or agent you chose to contact, and to let a roommate group leader coordinate one combined request (at your request).",
          "To show reviews and listings on the site.",
          "To send service emails such as email confirmation and password reset links.",
          "To send you news, tips and offers by email, only if you agreed to receive them (see section 7).",
          "To keep BookInn safe: preventing spam, scams and abuse, enforcing our Terms, and fixing problems.",
          "To meet our legal obligations.",
        ]} />
        <P>We process your information on the basis of your consent, because it is needed to provide the service you asked for, to meet legal duties, or for our legitimate interests in running and protecting the platform, in each case in line with Act 843.</P>
      </Section>

      <Section title="4. Who we share it with">
        <UL items={[
          "Property owners and agents. When you send a booking request, they receive the details you submitted (name, phone/email, move-in date, room type, message). If you are in a roommate group, the group leader can see who has joined, and the owner receives the combined request.",
          "The public. Your reviews (with the name you typed), and an owner's or agent's listing details and contact info.",
          "Service providers who help us run BookInn, listed in section 5. They may only use your information to provide their service to us.",
          "Authorities or other parties, where the law requires it, or where needed to protect people or to enforce our Terms.",
        ]} />
        <P>We do not sell your personal information.</P>
        <P>If you click a WhatsApp link, WhatsApp opens with a pre-filled message. From that point your conversation is governed by WhatsApp's own terms and privacy policy.</P>
      </Section>

      <Section title="5. Service providers we use">
        <UL items={[
          "Render: hosts the BookInn website and server.",
          "Neon (or the PostgreSQL database host we use): stores our database, including accounts, inquiries and listings.",
          "Cloudinary: stores and delivers listing photos and videos.",
          "Resend: sends our emails (confirmation, password reset and announcements) and may report delivery, open and click statistics to us.",
          "Google: Google Sign-In (if you choose it) and Google Fonts, which is used to display text on our pages.",
        ]} />
      </Section>

      <Section title="6. Transfers outside Ghana">
        <P>Some of the providers above run servers outside Ghana, so your information may be processed in other countries. We choose reputable providers and expect them to protect your information, but data protection laws in those countries may differ from Ghana's.</P>
      </Section>

      <Section title="7. Emails and marketing">
        <P>We will always send you service emails you need to use your account, such as confirming your email address or resetting your password.</P>
        <P>
          We only send marketing or promotional emails if you opt in, for example by ticking the box when you create your account. You can
          withdraw that consent at any time by using the unsubscribe option in an email or by contacting us, and we will stop.
        </P>
        <P>Emails we send may use standard delivery, open and click tracking provided by our email service, so we can see whether messages arrive and which links are useful.</P>
      </Section>

      <Section title="8. How long we keep your information">
        <P>We keep your account information for as long as your account is open. Booking requests, listings and reviews are kept for as long as they are needed to run the service and handle any disputes. When information is no longer needed we delete or anonymise it. You can ask us to delete your account and personal information at any time (see section 10).</P>
      </Section>

      <Section title="9. Security">
        <P>We use reasonable measures to protect your information, including hashed passwords, encrypted (HTTPS) connections, access controls and rate limiting against abuse. No online service is completely secure, so please use a strong, unique password and keep it private. If you think your account has been compromised, contact us straight away.</P>
      </Section>

      <Section title="10. Your rights">
        <P>Under Ghana's Data Protection Act, 2012 (Act 843) you have rights over your personal information, including to:</P>
        <UL items={[
          "ask whether we hold information about you and get a copy of it;",
          "ask us to correct information that is wrong or incomplete;",
          "ask us to delete information we no longer have a good reason to keep;",
          "withdraw consent you have given us, including for marketing emails;",
          "object to our processing of your information, including for direct marketing.",
        ]} />
        <P>To use any of these rights, contact us using the details in section 1. We may need to confirm it is really you before we act. If you are unhappy with how we handle your information, please contact us first so we can try to put it right. You may also complain to Ghana's Data Protection Commission.</P>
      </Section>

      <Section title="11. Children">
        <P>BookInn is intended for people aged 18 and over. If you are under 18, please use it only together with a parent or guardian. If you believe a child has given us personal information without a parent or guardian's permission, contact us and we will delete it.</P>
      </Section>

      <Section title="12. Cookies and similar technologies">
        <P>
          Read how we use your browser's storage in our <InlineLink onClick={() => setView("cookie-policy")}>Cookie Policy</InlineLink>.
        </P>
      </Section>

      <Section title="13. Changes to this policy">
        <P>We may update this policy from time to time. We will post the new version on this page with a new "last updated" date, and, where a change is significant, tell you by email or on the site.</P>
      </Section>

      <Section title="14. Contact us">
        <P>Questions or requests about your information:</P>
        <ContactLines />
      </Section>
    </LegalShell>
  );
}

/* =========================================================
   TERMS & CONDITIONS
========================================================= */
export function TermsView({ setView }) {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms & Conditions"
      subtitle="The rules for using BookInn as a student, parent, property owner or agent."
      setView={setView}
    >
      <Section title="1. About these Terms">
        <P>
          These Terms govern your use of {LEGAL.site} and any related services (together, "BookInn"), operated by {LEGAL.operator}.
          By creating an account, sending a booking request, leaving a review, listing a property or otherwise using BookInn,
          you agree to these Terms and to our <InlineLink onClick={() => setView("privacy-policy")}>Privacy Policy</InlineLink>.
          If you do not agree, please do not use BookInn.
        </P>
      </Section>

      <Section title="2. What BookInn is, and is not">
        <P>BookInn is an online platform that helps students find hostels, apartments and self-contained rooms near university campuses and helps property owners and agents advertise them.</P>
        <UL items={[
          "BookInn is not the landlord, owner, manager or agent of the properties listed, and is not a party to any tenancy, booking or payment agreement between a student and an owner or agent. Any viewing, agreement or payment is made directly between you and them.",
          "BookInn does not currently take rent, deposits or booking fees. Never assume a payment is protected by BookInn. See our Safety tips for how to protect yourself.",
          "Listings are provided by owners and agents. We do not guarantee that a listing is accurate, complete, available, safe or suitable, or that a property is as described.",
        ]} />
      </Section>

      <Section title="3. Your account">
        <UL items={[
          "You must give accurate information when you sign up and keep it up to date.",
          "You must be at least 18 to hold an account on your own. If you are younger, use BookInn only with a parent or guardian.",
          "You are responsible for keeping your password safe and for everything done through your account. Tell us immediately if you suspect misuse.",
          "You may not share, sell or transfer your account, or create accounts for someone else without their permission.",
        ]} />
      </Section>

      <Section title="4. Students and parents">
        <UL items={[
          "Use booking requests honestly. Only send requests you genuinely intend to follow up, and give contact details that are really yours.",
          "When you send a request, you agree that the details you submit (including your name, phone/email and message) will be shared with the owner or agent, and with roommates if you create or join a group.",
          "Do your own checks before paying anyone: view the property, read reviews, and get agreements and receipts in writing.",
        ]} />
      </Section>

      <Section title="5. Property owners and agents">
        <UL items={[
          "You must have the right to advertise any property you list, and the right to use every photo, video and description you upload.",
          "Keep listings accurate and up to date: price, room types, amenities, availability, location, photos and contact details. Remove or update listings that are no longer available.",
          "Respond honestly and promptly to students, and never take payment for a room you cannot provide.",
          "Do not misuse students' contact details. Use them only to respond to the enquiry or booking, and keep them secure and private.",
          "Agents must have permission from each landlord whose property they list.",
          "Features, listing limits and allowances may differ by account type and may change. At the time of writing, owner and agent features are provided free of charge, and we may introduce fees in future. If we do, we will give notice before any charge applies to you.",
        ]} />
      </Section>

      <Section title="6. Reviews and other content you submit">
        <P>You may leave reviews and submit content such as listing text, photos and videos. You promise that:</P>
        <UL items={[
          "it is truthful, based on your own experience, and not misleading;",
          "it does not defame, harass or discriminate against anyone, or include another person's private information;",
          "you own it or have permission to use it, and it does not infringe anyone's rights.",
        ]} />
        <P>You keep ownership of your content. You give BookInn a free, non-exclusive licence to host, display, reproduce and promote it on and in connection with BookInn, for as long as it is on the platform. We may remove or edit content that breaks these Terms or that we believe is harmful, fake or unlawful.</P>
      </Section>

      <Section title="7. Acceptable use">
        <P>You must not:</P>
        <UL items={[
          "post fake, misleading or fraudulent listings, reviews or requests, or run scams;",
          "impersonate another person or business, or falsely claim to be an official or verified agent;",
          "harass, threaten or abuse other users;",
          "scrape, copy or collect data from BookInn in bulk, or use it to send unsolicited marketing;",
          "interfere with the site's security or operation, or try to get into accounts or systems that are not yours;",
          "use BookInn for anything unlawful.",
        ]} />
      </Section>

      <Section title="8. Badges and verification">
        <P>Labels such as "Official agent" or "Featured" reflect checks or arrangements we describe at the time, and are not a guarantee of any property, person or transaction. They do not replace your own checks.</P>
      </Section>

      <Section title="9. Suspension and termination">
        <P>We may suspend or remove your account, listings or content, with or without notice, if we reasonably believe you broke these Terms, put others at risk or harmed BookInn. You may stop using BookInn at any time, and can ask us to delete your account by contacting us.</P>
      </Section>

      <Section title="10. Disclaimers">
        <P>BookInn is provided "as is" and "as available". To the fullest extent the law allows, we do not promise that the platform will always be available, error-free or secure, or that any listing, review or user is accurate or trustworthy.</P>
      </Section>

      <Section title="11. Limits on our responsibility">
        <P>
          To the fullest extent the law allows, BookInn is not responsible for dealings between users, for the condition, safety or availability of any property,
          for money paid to an owner or agent, or for losses that arise from your use of, or inability to use, the platform. Nothing in these Terms limits any
          liability that cannot lawfully be limited, including for fraud or for death or personal injury caused by our negligence.
        </P>
      </Section>

      <Section title="12. Changes to the platform and these Terms">
        <P>We may change BookInn or these Terms from time to time. We will post the updated Terms here with a new "last updated" date and, for significant changes, tell you by email or on the site. If you keep using BookInn after the change takes effect, you accept the updated Terms.</P>
      </Section>

      <Section title="13. Governing law">
        <P>These Terms are governed by the laws of the Republic of Ghana, and the courts of Ghana will have jurisdiction over any dispute, unless the law requires otherwise.</P>
      </Section>

      <Section title="14. Contact us">
        <P>Questions about these Terms:</P>
        <ContactLines />
      </Section>
    </LegalShell>
  );
}

/* =========================================================
   COOKIE POLICY

   Accurate as of this version of the app: BookInn sets NO cookies of its
   own. It uses the browser's localStorage for keys listed below, and loads
   Google Fonts, Google Sign-In (login screen only) and Cloudinary media.
   There are no analytics, advertising or tracking scripts. If you add any
   (Google Analytics, Meta Pixel, ads…), update this page AND add a consent
   banner that blocks them until the visitor agrees.
========================================================= */
export function CookiePolicyView({ setView }) {
  const rows = [
    {
      name: "bookinn_token",
      purpose: "Keeps you signed in to your account on this device.",
      keeps: "Until you sign out",
      type: "Strictly necessary",
    },
    {
      name: "bookinn_admin_token",
      purpose: "Keeps a BookInn administrator signed in to the admin area (admin accounts only).",
      keeps: "Until sign out",
      type: "Strictly necessary",
    },
    {
      name: "bookinn_groups",
      purpose: "Remembers roommate groups you started or joined on this device (group code, room and listing), so you can return to them.",
      keeps: "Until you clear your browser storage",
      type: "Functionality you asked for",
    },
  ];

  return (
    <LegalShell
      eyebrow="Legal"
      title="Cookie Policy"
      subtitle="How BookInn uses cookies and similar browser storage."
      setView={setView}
    >
      <Section title="1. The short version">
        <UL items={[
          "BookInn does not set any cookies of its own.",
          "We do not use advertising, analytics or cross-site tracking cookies or scripts.",
          "We store a few small items in your browser (\"local storage\") that are needed to keep you signed in and to remember your roommate groups.",
          "A few things on our pages are loaded from other companies (see section 3), and those companies may use cookies or see your IP address.",
        ]} />
      </Section>

      <Section title="2. What we store in your browser">
        <P>Local storage works like a cookie but stays on your device and is not sent with every request to our server. This is what we use it for:</P>
        <div style={{ borderColor: C.border }} className="border rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead style={{ background: C.blueLight, color: C.ink }}>
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">What it does</th>
                <th className="px-3 py-2 font-semibold">How long</th>
                <th className="px-3 py-2 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} style={{ borderColor: C.border }} className="border-t align-top">
                  <td className="px-3 py-2 font-mono whitespace-nowrap">{r.name}</td>
                  <td className="px-3 py-2">{r.purpose}</td>
                  <td className="px-3 py-2">{r.keeps}</td>
                  <td className="px-3 py-2">{r.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>These items are needed to give you the service you asked for, so we do not ask for separate consent to use them. You can still delete them at any time (see section 5), but you will then be signed out.</P>
      </Section>

      <Section title="3. Third-party content on our pages">
        <UL items={[
          "Google Fonts (fonts.googleapis.com, fonts.gstatic.com): loads the typeface used on our pages. Google receives your IP address and browser details when it does so.",
          "Google Sign-In (accounts.google.com): the \"Continue with Google\" button and sign-in prompt load on the sign-in and sign-up screens. Google may set its own cookies when it runs. Whether and how it does so is governed by Google's policies.",
          "Cloudinary (res.cloudinary.com): delivers listing photos and videos, and receives your IP address when your browser requests them.",
          "WhatsApp (wa.me): only when you click a WhatsApp link. You then leave BookInn and WhatsApp's policies apply.",
        ]} />
      </Section>

      <Section title="4. Emails">
        <P>Emails we send may contain standard open and click tracking provided by our email service. This is separate from cookies on this site; see our <InlineLink onClick={() => setView("privacy-policy")}>Privacy Policy</InlineLink>.</P>
      </Section>

      <Section title="5. Managing or deleting stored data">
        <P>You can clear local storage and cookies through your browser settings (usually under Privacy or Site data). You can also block third-party content with your browser or an extension; BookInn will still work, though fonts may look different and Google sign-in will not be available.</P>
      </Section>

      <Section title="6. Changes">
        <P>If we start using other cookies or tracking tools, for example analytics, we will update this policy and ask for your consent first where the law requires it.</P>
      </Section>

      <Section title="7. Contact us">
        <ContactLines />
      </Section>
    </LegalShell>
  );
}
