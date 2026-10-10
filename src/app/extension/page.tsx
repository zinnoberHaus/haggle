import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Haggle browser companion",
  description:
    "Search Haggle from a product page or selected text with the free, manually installed browser companion.",
};

export default function ExtensionPage() {
  return (
    <div className="content-narrow" style={{ paddingBlock: "2rem 4rem" }}>
      <header>
        <p className="eyebrow">The browser companion</p>
        <h1 className="page-title">
          Spotted something? Give it a second look.
        </h1>
        <p className="muted">
          Search Haggle without copying a product name back and forth. Highlight
          text, use the right-click menu, or open the companion from your
          browser’s toolbar.
        </p>
      </header>
      <section
        className="panel"
        style={{ marginBlock: "2rem", background: "#F2662F" }}
      >
        <h2>Small extension. One useful job.</h2>
        <p>
          It opens a Haggle search using text you choose or the current page’s
          title. You can edit the search first in the popup.
        </p>
        <a className="button" href="/downloads/haggle-extension.zip" download>
          Download the extension ZIP
        </a>
        <p style={{ marginBottom: 0, fontSize: ".85rem" }}>
          Preview release · Chrome and other Chromium browsers · Manual
          installation
        </p>
      </section>
      <section className="prose">
        <h2>Install in Chrome</h2>
        <ol>
          <li>
            Download the ZIP above and extract it to a folder you can keep.
          </li>
          <li>
            Open <code>chrome://extensions</code> in a new browser tab.
          </li>
          <li>
            Turn on <strong>Developer mode</strong>, then select{" "}
            <strong>Load unpacked</strong>.
          </li>
          <li>
            Select the extracted folder containing <code>manifest.json</code>.
          </li>
          <li>
            Pin Haggle from the Extensions menu. Open a product page and click
            the Haggle icon.
          </li>
        </ol>
        <p>
          In Microsoft Edge, start at <code>edge://extensions</code> and use the
          same unpacked-install process. This preview is not listed in the
          Chrome Web Store and does not update automatically. To update, replace
          the files and press Reload on the extensions page.
        </p>
        <h2>Three ways to search</h2>
        <ul>
          <li>
            <strong>Selected text:</strong> highlight a product name,
            right-click, and choose “Search Haggle for…”
          </li>
          <li>
            <strong>Current product:</strong> right-click a page and choose
            “Search this page title on Haggle.”
          </li>
          <li>
            <strong>Your own words:</strong> open the popup, edit the query, and
            select “Search Haggle.”
          </li>
        </ul>
        <h2>What the permissions do</h2>
        <p>
          The companion uses the active tab only when you invoke it, adds the
          right-click search menu, and saves your Haggle site address locally.
          It does not run content scripts, read cart contents, collect card
          details, apply coupons, or place orders.
        </p>
        <p>
          Only the search text you submit is sent to the chosen Haggle site in
          the opened URL. Browser history may retain that URL. The original
          product-page URL is not added to the search.
        </p>
        <h2>Using another Haggle deployment</h2>
        <p>
          Open the popup’s Site settings to change the Haggle address. Use an
          HTTPS address you trust. For local development, a localhost address is
          supported.
        </p>
      </section>
      <p>
        <Link href="/privacy">Read the privacy notice</Link>
      </p>
    </div>
  );
}
