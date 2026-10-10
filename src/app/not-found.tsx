import Link from "next/link";
export default function NotFound() {
  return (
    <div className="content-narrow empty-state">
      <h1 className="page-title">This find got away.</h1>
      <p>This page doesn’t exist, or you don’t have access to it.</p>
      <Link className="button" href="/">
        Back to the good finds
      </Link>
    </div>
  );
}
