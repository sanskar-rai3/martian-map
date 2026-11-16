import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://martian-map-sz11.vercel.app"),

  title: {
    default: "Mars Survival Guide | Explore and Survive on Mars",
    template: "%s | Mars Survival Guide",
  },

  description:
    "Explore Mars, understand its environment, and discover how humans could survive on the Red Planet through an interactive Mars survival guide.",

  keywords: [
    "Mars survival guide",
    "Mars exploration",
    "Mars mission",
    "Mars environment",
    "NASA Mars data",
    "life on Mars",
    "Mars simulator",
  ],

  authors: [{ name: "Your Team Name" }],

  openGraph: {
    title: "Mars Survival Guide",
    description:
      "Explore the Red Planet and discover what it takes to survive on Mars.",
    url: "https://martian-map-sz11.vercel.app",
    siteName: "Mars Survival Guide",
    images: ["/og-image.png"],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Mars Survival Guide",
    description: "Explore Mars and discover the challenges of human survival.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
