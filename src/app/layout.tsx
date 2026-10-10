import type { Metadata } from "next";
import { Instrument_Sans, Newsreader, DM_Mono } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";
import { SavedProvider } from "@/components/saved-provider";
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif" });
const mono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
});
export const metadata: Metadata = {
  metadataBase: new URL("https://haggle-blue.vercel.app"),
  icons: { icon: "/icon.svg" },
  title: {
    default: "Haggle — Good finds. Less spending.",
    template: "%s · Haggle",
  },
  description:
    "A calmer way to find a good deal. Browse sourced offers, save your favorites, and get a little help comparing your options.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SavedProvider>
          <Header />
          <main id="main" className="main-wrap">
            {children}
          </main>
          <Footer />
        </SavedProvider>
      </body>
    </html>
  );
}
