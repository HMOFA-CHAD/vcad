import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SearchProvider } from "@/components/Search/SearchProvider";

export const metadata: Metadata = {
  title: {
    default: "vcad docs",
    template: "%s | vcad docs",
  },
  description: "Parametric CAD in Rust. CSG primitives, boolean operators, multi-format export.",
  keywords: ["CAD", "Rust", "CSG", "3D modeling", "parametric", "STL", "GLTF", "STEP"],
  authors: [{ name: "vcad" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://vcad.io/docs",
    siteName: "vcad docs",
    title: "vcad docs",
    description: "Parametric CAD in Rust",
  },
  twitter: {
    card: "summary_large_image",
    title: "vcad docs",
    description: "Parametric CAD in Rust",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#x25E6;</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          <SearchProvider>
            <div className="flex min-h-screen">
              <Navigation />
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </SearchProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
