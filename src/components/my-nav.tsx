import Link from "next/link";
export function MyNav() {
  return (
    <nav className="account-nav">
      <Link href="/saved">Saved & alerts</Link>
      <Link href="/cart">Cart Agent</Link>
      <Link href="/compare">Final cost</Link>
      <Link href="/checkout">Checkout companion</Link>
      <Link href="/purchases">Purchases & refunds</Link>
      <Link href="/savings">Savings</Link>
      <Link href="/account">Account</Link>
      <Link href="/pricing">How we earn</Link>
    </nav>
  );
}
