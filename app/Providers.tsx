// app/Providers.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <SessionProvider>
        <div style={{ visibility: "hidden" }}>{children}</div>
      </SessionProvider>
    );
  }

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem={true}
        disableTransitionOnChange={false}
        storageKey="theme"
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}