import "./globals.css"; // This line imports the Tailwind styles
import { Inter } from "next/font/google";

// Set up the Inter font
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Jam Room",
  description: "Low-latency music jamming",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* Apply the font className to the body */}
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}