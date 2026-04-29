'use client';

import { FC, useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/utils';
import { useTheme } from 'next-themes';

interface AdImage {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  order: number;
}

interface AdSliderProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdSlider: FC<AdSliderProps> = ({ isOpen, onClose }) => {
  const [ads, setAds] = useState<AdImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const hasLoadedRef = useRef(false);
  const fetchAttemptedRef = useRef(false);

  // Load cached ads from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedAds = localStorage.getItem('cachedAds');
      if (cachedAds) {
        try {
          const parsedAds = JSON.parse(cachedAds);
          if (Array.isArray(parsedAds) && parsedAds.length > 0) {
            setAds(parsedAds);
            setIsLoading(false);
            hasLoadedRef.current = true;
          }
        } catch (e) {
          console.error('Error parsing cached ads:', e);
        }
      }
    }
  }, []);

  const fetchAds = useCallback(async () => {
    // Prevent multiple fetch attempts
    if (fetchAttemptedRef.current) return;
    fetchAttemptedRef.current = true;

    try {
      const res = await fetch('/api/ads?active=true');
      if (!res.ok) {
        throw new Error('Failed to fetch ads');
      }
      const data = await res.json();
      console.log('Fetched ads:', data);
      
      // Cache the ads
      if (typeof window !== 'undefined' && Array.isArray(data) && data.length > 0) {
        localStorage.setItem('cachedAds', JSON.stringify(data));
      }
      
      setAds(data);
      setCurrentIndex(0);
      setIsLoading(false);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Error fetching ads:', err);
      setError('Failed to load ads');
      // If we have cached ads, keep using them and don't show error
      if (!hasLoadedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen && !hasLoadedRef.current) {
      fetchAds();
    }
  }, [isOpen, fetchAds]);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (!isOpen || ads.length <= 1) return;

    const interval = setInterval(() => {
      handleNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, ads.length, currentIndex]);

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === 0 ? ads.length - 1 : prev - 1));
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === ads.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleDotClick = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleAdClick = (ad: AdImage) => {
    if (ad.linkUrl) {
      window.open(ad.linkUrl, '_blank');
    }
  };

  if (!isOpen) return null;
  
  // Don't show loading spinner - show content immediately if we have cached ads
  // Only show empty state if no ads at all and not loading
  if (!hasLoadedRef.current && isLoading && ads.length === 0) {
    // Still loading but no cached ads - show minimal loading or just return null?
    // Let's show a simple placeholder instead of spinner
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="relative max-w-6xl w-full mx-4 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-800 to-gray-900">
          <div className="relative w-full h-[85vh] max-h-[700px] min-h-[500px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <i className="fas fa-image text-white/40 text-2xl"></i>
              </div>
              <p className="text-white/60">Loading ads...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no ads after loading, close
  if ((error || ads.length === 0) && !isLoading) {
    console.log('No ads to display or error:', error);
    // If we have no ads but were using cached, maybe try to fetch again
    if (!fetchAttemptedRef.current && !isLoading) {
      fetchAds();
    }
    return null;
  }

  console.log('Displaying ad slider with', ads.length, 'ads');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "relative max-w-6xl w-full mx-4 rounded-2xl overflow-hidden shadow-2xl",
          isDark ? "bg-gray-900" : "bg-white"
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
        >
          <i className="fas fa-times text-lg"></i>
        </button>

        {/* Main image container */}
        <div className="relative w-full h-[85vh] max-h-[700px] min-h-[500px] overflow-hidden">
          {ads.map((ad, idx) => (
            <div
              key={ad.id}
              className={cn(
                "absolute inset-0 transition-all duration-500 ease-in-out cursor-pointer",
                idx === currentIndex
                  ? "opacity-100 translate-x-0"
                  : idx < currentIndex
                  ? "opacity-0 -translate-x-full"
                  : "opacity-0 translate-x-full"
              )}
              onClick={() => handleAdClick(ad)}
            >
              <img
                src={ad.imageUrl}
                alt={ad.title}
                className="w-full h-full object-contain bg-gradient-to-b from-gray-900 to-gray-800"
                onError={(e) => {
                  console.error('Failed to load image:', ad.imageUrl);
                  e.currentTarget.src = '/placeholder-image.jpg';
                }}
              />
              
              {/* Enhanced overlay with better styling */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-8">
                <div className="max-w-3xl mx-auto text-center">
                  <h3 className="text-white text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">
                    {ad.title}
                  </h3>
                  {ad.description && (
                    <p className="text-white/90 text-base md:text-lg leading-relaxed max-w-2xl mx-auto drop-shadow">
                      {ad.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        {ads.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
            >
              <i className="fas fa-chevron-left text-xl md:text-2xl"></i>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
            >
              <i className="fas fa-chevron-right text-xl md:text-2xl"></i>
            </button>
          </>
        )}

        {/* Dots indicator */}
        {ads.length > 1 && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-3 pb-4">
            {ads.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleDotClick(idx)}
                className={cn(
                  "transition-all duration-300 rounded-full",
                  idx === currentIndex
                    ? "bg-white w-8 h-3"
                    : "bg-white/50 hover:bg-white/80 w-3 h-3"
                )}
              />
            ))}
          </div>
        )}

       
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 pb-2">
          <button
            onClick={() => {
              localStorage.setItem('dontShowAds', 'true');
              onClose();
            }}
            className="text-white/80 hover:text-white text-sm bg-black/40 hover:bg-black/60 px-4 py-2 rounded-full transition-all duration-200 backdrop-blur-sm"
          >
            Don't show again
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-sm bg-black/40 hover:bg-black/60 px-4 py-2 rounded-full transition-all duration-200 backdrop-blur-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};