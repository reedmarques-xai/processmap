import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrokessMap — Sales Process Mapping",
  description:
    "Upload Gong transcripts and generate editable process maps with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}