import Link from "next/link";
export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Link href="/" className="brand">
          haggle<span className="orange">↓</span>
        </Link>
        <p>
          A little less spending.
          <br />A little more living.
        </p>
      </div>
      <div>
        <strong>Find your next good deal</strong>
        <Link href="/">Browse deals</Link>
        <Link href="/guides">Shopping guides</Link>
        <Link href="/extension">Browser extension</Link>
      </div>
      <div>
        <strong>Your Haggle</strong>
        <Link href="/saved">Saved & alerts</Link>
        <Link href="/account">Your account</Link>
        <Link href="/pricing">How we earn</Link>
        <Link href="/privacy">Privacy & sources</Link>
      </div>
      <p className="footer-note">
        Offers are provided by DealNews with attribution. Source links may earn
        the publisher a commission. Prices and availability can change; confirm
        the total at the store. Haggle does not place orders or charge fees in
        this beta.
      </p>
    </footer>
  );
}
