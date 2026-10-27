import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Set NEXT_PUBLIC_SITE_URL to your custom domain if you add one.
// On Vercel the production URL is picked up automatically.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const title = "Squeeze - Compress PNG & JPG to WebP or SVG";
const description =
  "Batch-compress PNG and JPG images to WebP or SVG right in your browser. Keep original file names, download as a ZIP. Free, private, nothing is uploaded.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s | Squeeze" },
  description,
  applicationName: "Squeeze",
  keywords: [
    "image compressor",
    "png to webp",
    "jpg to webp",
    "jpeg to webp",
    "png to svg",
    "batch image converter",
    "compress images for website",
    "webp converter",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Squeeze",
    title,
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
