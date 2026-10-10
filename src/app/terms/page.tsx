import Link from "next/link";
export const metadata = { title: "Using Haggle" };
export default function Terms() {
  return (
    <article className="content-narrow prose">
      <span className="eyebrow">How this beta works</span>
      <h1 className="page-title">Using Haggle</h1>
      <p>
        Haggle helps you discover published shopping offers and compare a
        shopping list. Browsing is free. Creating an account adds saved offers,
        price targets, and limited AI assistance.
      </p>
      <h2>You make the purchase</h2>
      <p>
        Offers come from external publishers and retailers. Prices,
        availability, exclusions, shipping, and tax can change. Check the
        retailer’s final checkout total and return terms. Haggle does not sell
        these products, place orders, access your payment cards, apply coupons
        to retailer carts, or file refund claims.
      </p>
      <h2>Comparisons need a second look</h2>
      <p>
        AI answers and cart comparisons are assistance, not guarantees.
        Suggested products may differ in model, size, condition, or eligibility.
        Price history includes only observations actually collected by Haggle. A
        target match is an in-app notification, not a promise that a price is
        still available.
      </p>
      <h2>Fees and affiliate links</h2>
      <p>
        Haggle charges no fees during this beta. The fee calculator describes a
        planned service, not an enabled payment system. External source links
        may contain the publisher’s affiliate tracking and may earn that
        publisher a commission.
      </p>
      <h2>Your account</h2>
      <p>
        Use an email address you control, keep your password private, and do not
        misuse the service or attempt to access another person’s information.
        You can manage your profile and download your app data from your
        account.
      </p>
      <h2>Beta availability</h2>
      <p>
        Features can change or be unavailable during development. Email price
        alerts, checkout automation, and price-drop refund claims are not
        available. See the current interface for which actions are supported.
      </p>
      <p>
        <Link href="/privacy">Privacy and data sources</Link> ·{" "}
        <Link href="/account">Manage your account</Link>
      </p>
    </article>
  );
}
