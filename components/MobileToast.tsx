// components/MobileToast.tsx
'use client';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';

export function MobileToast() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      expand={isMobile}
      visibleToasts={isMobile ? 3 : 4}
      duration={isMobile ? 5000 : 4000}
      offset={isMobile ? 16 : 24}
      toastOptions={{
        className: 'custom-toast',
        style: {
          fontSize: isMobile ? '14px' : '13px',
          padding: isMobile ? '12px 16px' : '10px 14px',
          borderRadius: '12px',
          maxWidth: isMobile ? 'calc(100vw - 32px)' : '380px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
        },
      }}
    />
  );
}