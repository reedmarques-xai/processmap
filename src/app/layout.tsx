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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('grokessmap_theme');
                  // Default to light mode unless explicitly set to "dark"
                  if (theme !== 'dark') {
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}