import type { Metadata } from "next";
import "./globals.css";
// Icon set shared with website — bundled locally, not a runtime CDN link.
import "@tabler/icons-webfont/dist/tabler-icons.min.css";

export const metadata: Metadata = {
  title: {
    default: "Privi Admin",
    template: "%s · Privi Admin",
  },
  description: "Privi Admin Portal.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-ivory text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
