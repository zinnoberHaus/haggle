import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Haggle handles accounts, saved deals, searches, third-party offer links, and the browser companion.",
};

export default function PrivacyPage() {
  return (
    <article
      className="content-narrow prose"
      style={{ paddingBlock: "2rem 4rem" }}
    >
      <p className="eyebrow">Privacy notice · October 10, 2026</p>
      <h1 className="page-title">Your shopping, with clear boundaries.</h1>
      <p>
        This notice describes the current Haggle application and its browser
        search companion.
      </p>
      <h2>Browsing and hosting</h2>
      <p>
        You can browse public deals and guides without creating an account.
        Vercel hosts the application and processes the technical request
        information needed to serve it, such as your IP address, browser
        information, requested URL, and timing. Operational logs may contain
        request details used to diagnose errors and abuse.
      </p>
      <h2>Your account</h2>
      <p>
        Haggle uses Neon Auth for account authentication and Neon’s database for
        application records. When you register or sign in, the authentication
        service processes your email address and authentication information.
        Haggle associates saved deals and account preferences with your user ID.
        Session cookies keep you signed in.
      </p>
      <p>
        You can manage available account settings, export your data, remove
        saved deals, and sign out from <Link href="/account">your account</Link>
        . Signing out removes access to the current session; it does not delete
        stored account records.
      </p>
      <h2>Shopping plans, purchases, and comparisons</h2>
      <p>
        If you save a shopping plan or cost comparison, Haggle stores the
        products, amounts, source links, and eligibility notes you enter with
        your account. Purchase records also store the merchant, purchase date,
        paid and comparison totals, and any price-adjustment status, policy
        link, deadline, or refund amount you record. These are user-reported
        records; Haggle does not verify a receipt or access your retailer
        account. Do not enter payment-card numbers, retailer passwords, or
        sensitive order details in these forms.
      </p>
      <p>
        You can edit or delete purchase records and cost comparisons, and they
        are included in your account export. A shopping-list draft can be kept
        in your current tab’s session storage to preserve it during sign-in;
        saving the plan clears that draft. Copying or downloading a
        price-adjustment request creates text for you to review and submit
        yourself. Haggle does not send it to a retailer.
      </p>
      <h2>Search and optional AI processing</h2>
      <p>
        Search text is sent to Haggle to find relevant offers. When you use an
        AI-powered answer or shopping-list review, your question or entered
        product names and comparison prices, along with relevant offer
        information, are processed by the configured AI provider through
        Vercel AI Gateway. Avoid including payment details, passwords,
        or other sensitive information in a shopping question.
      </p>
      <p>
        Search terms included in a page URL can appear in browser history and
        technical logs. Haggle does not need your retailer login or payment-card
        number to search offers.
      </p>
      <h2>Deal sources, images, and outbound links</h2>
      <p>
        Some deals and product images come from DealNews. Loading a remote image
        can share your IP address and request information with the image host.
        Opening a DealNews or retailer link takes you to a separate service with
        its own privacy terms.
      </p>
      <p>
        Offer links may contain affiliate or referral tracking. A source or
        merchant may use cookies or attribution identifiers when you visit or
        purchase. Haggle does not process your retailer purchase or receive your
        payment-card details through these links.
      </p>
      <h2>The browser companion</h2>
      <p>
        The extension stores your chosen Haggle site address in local browser
        extension storage. On your action, it reads selected text or the current
        tab title and opens a search URL. The popup lets you edit that query. It
        does not continuously read pages, inject content scripts, or send the
        original page URL along with the query.
      </p>
      <p>
        You can remove the extension through your browser’s extensions page.
        Removing it does not remove search URLs already stored in your browser
        history.
      </p>
      <h2>Retention and controls</h2>
      <p>
        Saved deals and preferences remain available across sessions until you
        remove them or they are otherwise deleted from the service.
        Authentication and hosting providers also maintain records under their
        own service practices. This preview does not promise a fixed retention
        period or immediate deletion from provider backups.
      </p>
      <p>
        Use the account controls for the actions currently supported. You can
        also clear browser cookies to end local authentication sessions and
        clear browser history to remove saved search URLs from that browser.
      </p>
      <h2>Provider information</h2>
      <ul>
        <li>
          <a
            href="https://vercel.com/legal/privacy-notice"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel privacy notice
          </a>
        </li>
        <li>
          <a
            href="https://neon.com/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Neon privacy policy
          </a>
        </li>
        <li>
          <a
            href="https://www.dealnews.com/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            DealNews privacy policy
          </a>
        </li>
      </ul>
      <p>
        We will update this notice as the application’s data handling changes.
      </p>
    </article>
  );
}
