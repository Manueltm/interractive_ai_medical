// app/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { cn } from "@/utils";
import { Toaster } from "sonner";
import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: "Acemedix Academy",
  description: "Acemedix Academy is your companion for MDCN exam success",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme initialization script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  let theme = localStorage.getItem('theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  localStorage.setItem('theme', theme);
                } catch (e) {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={cn(
          GeistSans.variable,
          GeistMono.variable,
          "flex flex-col min-h-screen"
        )}
        suppressHydrationWarning
      >
        <Providers>
          <Nav />
          {children}
          {/* Keep Toaster but customize it */}
          <Toaster 
            position="top-center"
            richColors={false}
            closeButton
            expand={true}
            duration={3000}
            toastOptions={{
              className: 'center-toast',
            }}
          />
        </Providers>
      </body>
    </html>
  );
}