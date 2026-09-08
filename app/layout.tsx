import type { Metadata } from "next";
import { Space_Grotesk, Manrope } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

// Manrope is used for the body text, while Space Grotesk is used for headings and other UI elements.
const manrope = Manrope({
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
// The metadata object is used to define the metadata for the application, including the title, description, and verification information for Google.
export const metadata: Metadata = {
  title: "Settlr",
  description: "Group trip expense tracker — log payments, settle up in one shot.",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
