"use client";

import { useState, useEffect, useRef } from "react";

interface UserAnalytics {
  overallStats: {
    totalSessions: number;
    totalTimeSpent: number;
    averageScore: number;
    recentScore: number;
  };
  weakAreas: Array<{ category: string; successRate: number }>;
  strongAreas: Array<{ category: string; successRate: number }>;
  streakData: { streakDays: number };
  recommendations: Array<{ title: string; description: string }>;
  recentActivity?: Array<{
    id: string;
    activityType: string;
    createdAt: string;
    applicationName: string;
  }>;
  showInsights?: boolean;
}

// Default welcome data
const welcomeData: UserAnalytics = {
  overallStats: { totalSessions: 0, totalTimeSpent: 0, averageScore: 0, recentScore: 0 },
  weakAreas: [],
  strongAreas: [],
  streakData: { streakDays: 0 },
  recommendations: [
    { 
      title: "👋 Welcome to AceMedix!", 
      description: "Start your first session to see personalized insights and track your progress." 
    }
  ],
  recentActivity: []
};

export default function FloatingInsightsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [analytics, setAnalytics] = useState<UserAnalytics>(welcomeData);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  
  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  // Button dimensions
  const BUTTON_WIDTH = 140;
  const BUTTON_HEIGHT = 60;
  const POPUP_WIDTH = 380;
  const POPUP_HEIGHT = 500;

  // Check if mobile and get window size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set initial position based on device
  useEffect(() => {
    if (windowSize.width === 0) return;
    
    if (isMobile) {
      // Mobile: bottom center
      const savedPosition = localStorage.getItem('insightsWidgetPosition_mobile');
      const centerX = (windowSize.width - BUTTON_WIDTH) / 2;
      const bottomY = windowSize.height - BUTTON_HEIGHT - 20;
      
      if (savedPosition) {
        try {
          const pos = JSON.parse(savedPosition);
          const validX = Math.min(Math.max(pos.x, 0), windowSize.width - BUTTON_WIDTH);
          const validY = Math.min(Math.max(pos.y, 0), windowSize.height - BUTTON_HEIGHT - 20);
          setPosition({ x: validX, y: validY });
        } catch (e) {
          setPosition({ x: centerX, y: bottomY });
        }
      } else {
        setPosition({ x: centerX, y: bottomY });
      }
    } else {
      // Desktop: bottom right corner
      const savedPosition = localStorage.getItem('insightsWidgetPosition_desktop');
      const rightX = windowSize.width - BUTTON_WIDTH;
      const bottomY = windowSize.height - BUTTON_HEIGHT;
      
      if (savedPosition) {
        try {
          const pos = JSON.parse(savedPosition);
          const validX = Math.min(Math.max(pos.x, 0), windowSize.width - BUTTON_WIDTH);
          const validY = Math.min(Math.max(pos.y, 0), windowSize.height - BUTTON_HEIGHT);
          setPosition({ x: validX, y: validY });
        } catch (e) {
          setPosition({ x: rightX, y: bottomY });
        }
      } else {
        setPosition({ x: rightX, y: bottomY });
      }
    }
  }, [isMobile, windowSize]);

  // Save position when dragging ends
  useEffect(() => {
    if (!isDragging && position.x >= 0 && position.y >= 0 && !loading && windowSize.width > 0) {
      const storageKey = isMobile ? 'insightsWidgetPosition_mobile' : 'insightsWidgetPosition_desktop';
      localStorage.setItem(storageKey, JSON.stringify(position));
    }
  }, [position, isDragging, isMobile, loading, windowSize]);

  // Update position on window resize
  useEffect(() => {
    const handleResize = () => {
      if (!isDragging && windowSize.width > 0) {
        let newX = position.x;
        let newY = position.y;
        
        const maxX = windowSize.width - BUTTON_WIDTH;
        const maxY = windowSize.height - BUTTON_HEIGHT - (isMobile ? 20 : 0);
        
        newX = Math.min(Math.max(position.x, 0), maxX);
        newY = Math.min(Math.max(position.y, 0), maxY);
        
        if (newX !== position.x || newY !== position.y) {
          setPosition({ x: newX, y: newY });
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, isDragging, isMobile, windowSize]);

  // Drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;
      
      const maxX = windowSize.width - BUTTON_WIDTH;
      const maxY = windowSize.height - BUTTON_HEIGHT - (isMobile ? 20 : 0);
      
      newX = Math.min(Math.max(newX, 0), maxX);
      newY = Math.min(Math.max(newY, 0), maxY);
      
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging && !isMobile) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, isMobile]);

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragOffset({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && isMobile) {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      let newX = touch.clientX - dragOffset.x;
      let newY = touch.clientY - dragOffset.y;
      
      const maxX = windowSize.width - BUTTON_WIDTH;
      const maxY = windowSize.height - BUTTON_HEIGHT - 20;
      
      newX = Math.min(Math.max(newX, 0), maxX);
      newY = Math.min(Math.max(newY, 0), maxY);
      
      setPosition({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging && isMobile) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset, isMobile]);

  // Fetch analytics data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/user/analytics");
        if (res.ok) {
          const data = await res.json();
          
          const formattedData = {
            ...data,
            overallStats: {
              totalSessions: Number(data.overallStats?.totalSessions) || 0,
              totalTimeSpent: Number(data.overallStats?.totalTimeSpent) || 0,
              averageScore: Number(data.overallStats?.averageScore) || 0,
              recentScore: Number(data.overallStats?.recentScore) || 0,
            },
            streakData: {
              streakDays: Number(data.streakData?.streakDays) || 0,
              lastActivity: data.streakData?.lastActivity || null,
            },
            weakAreas: data.weakAreas || [],
            strongAreas: data.strongAreas || [],
            recommendations: data.recommendations || [],
            recentActivity: data.recentActivity || [],
          };
          
          if (formattedData.overallStats.totalSessions === 0 && formattedData.recommendations.length === 0) {
            formattedData.recommendations = [
              { 
                title: "👋 Welcome to AceMedix!", 
                description: "Start your first session to see personalized insights and track your progress." 
              }
            ];
          }
          
          setAnalytics(formattedData);
        } else {
          setAnalytics(welcomeData);
        }
      } catch (error) {
        console.error("Error:", error);
        setAnalytics(welcomeData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const avgScore = analytics.overallStats?.averageScore || 0;
  const streakDays = analytics.streakData?.streakDays || 0;
  const hasData = (analytics.overallStats?.totalSessions || 0) > 0;
  const hasRecommendations = (analytics.recommendations?.length || 0) > 0;
  const hasWeakAreas = (analytics.weakAreas?.length || 0) > 0;
  const hasStrongAreas = (analytics.strongAreas?.length || 0) > 0;
  const hasRecentActivity = (analytics.recentActivity?.length || 0) > 0;

  // Calculate popup position
  const getPopupPosition = () => {
    if (windowSize.width === 0) return { left: 20, top: position.y };
    
    if (isMobile) {
      // Mobile: center the popup on screen
      return {
        left: (windowSize.width - POPUP_WIDTH) / 2,
        top: (windowSize.height - POPUP_HEIGHT) / 2,
      };
    } else {
      // Desktop: position to the LEFT and ABOVE the button
      let popupLeft = position.x - POPUP_WIDTH - 15; // 15px gap to the left
      let popupTop = position.y - POPUP_HEIGHT + BUTTON_HEIGHT; // Align with top of button
      
      // If not enough space on left, position to the right
      if (popupLeft < 10) {
        popupLeft = position.x + BUTTON_WIDTH + 15;
      }
      
      // If not enough space above, position below
      if (popupTop < 10) {
        popupTop = position.y + BUTTON_HEIGHT + 15;
      }
      
      // Ensure popup doesn't go off-screen
      if (popupLeft + POPUP_WIDTH > windowSize.width - 10) {
        popupLeft = windowSize.width - POPUP_WIDTH - 10;
      }
      
      if (popupTop + POPUP_HEIGHT > windowSize.height - 10) {
        popupTop = windowSize.height - POPUP_HEIGHT - 10;
      }
      
      // Ensure popup doesn't go off-screen left
      if (popupLeft < 10) {
        popupLeft = 10;
      }
      
      // Ensure popup doesn't go off-screen top
      if (popupTop < 10) {
        popupTop = 10;
      }
      
      return {
        left: popupLeft,
        top: popupTop,
      };
    }
  };

  const popupPosition = getPopupPosition();

  return (
    <>
      {/* FLOATING BUTTON */}
      <div
        ref={buttonRef}
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 999999,
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
          touchAction: "none",
        }}
        onTouchStart={isMobile ? handleTouchStart : undefined}
      >
        <button
          onMouseDown={!isMobile ? handleMouseDown : undefined}
          onClick={(e) => {
            if (!isDragging) {
              setIsOpen(!isOpen);
            }
          }}
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #ec489a)",
            color: "white",
            borderRadius: "9999px",
            padding: "12px 20px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.02)",
            border: "none",
            cursor: isDragging ? "grabbing" : "grab",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: "600",
            transition: "transform 0.2s ease",
            pointerEvents: "auto",
            width: `${BUTTON_WIDTH}px`,
            height: `${BUTTON_HEIGHT}px`,
          }}
          onMouseEnter={(e) => {
            if (!isDragging && !isMobile) {
              e.currentTarget.style.transform = "scale(1.05)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging && !isMobile) {
              e.currentTarget.style.transform = "scale(1)";
            }
          }}
        >
          {loading ? (
            <div style={{
              width: "20px",
              height: "20px",
              border: "2px solid white",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
          ) : (
            <span>📊</span>
          )}
          <span>{loading ? "Loading..." : hasData ? `${avgScore.toFixed(0)}%` : "My Insights"}</span>
          {!loading && streakDays > 0 && (
            <span style={{ fontSize: "12px", opacity: 0.9 }}>🔥 {streakDays}</span>
          )}
          {!loading && hasRecommendations && (
            <span style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              width: "20px",
              height: "20px",
              background: "#ef4444",
              borderRadius: "50%",
              fontSize: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "pulse 1s infinite"
            }}>
              {analytics.recommendations.length}
            </span>
          )}
        </button>
        
        {/* Drag indicator - only on desktop */}
        {!isMobile && !isDragging && (
          <div style={{
            position: "absolute",
            bottom: "-24px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "10px",
            color: "rgba(255,255,255,0.7)",
            background: "rgba(0,0,0,0.6)",
            padding: "2px 8px",
            borderRadius: "12px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}>
            Drag to move
          </div>
        )}
      </div>

      {/* POPUP */}
      {isOpen && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 999998,
            }}
            onClick={() => setIsOpen(false)}
          />
          
          <div
            style={{
              position: "fixed",
              left: `${popupPosition.left}px`,
              top: `${popupPosition.top}px`,
              width: isMobile ? "90%" : `${POPUP_WIDTH}px`,
              maxWidth: isMobile ? "400px" : `${POPUP_WIDTH}px`,
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.02)",
              zIndex: 999999,
              overflow: "hidden",
              maxHeight: isMobile ? "80vh" : "auto",
            }}
          >
            <div style={{
              background: "linear-gradient(135deg, #8b5cf6, #ec489a)",
              padding: "16px",
              color: "white",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📊</span>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Your Insights (Coming Soon)</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ padding: "16px", maxHeight: "500px", overflowY: "auto" }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "32px" }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    border: "3px solid #e2e8f0",
                    borderTopColor: "#8b5cf6",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto"
                  }} />
                  <p style={{ marginTop: "16px", color: "#64748b" }}>Loading insights...</p>
                </div>
              ) : (
                <>
                  {/* Stats Overview */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
                    <div style={{ textAlign: "center", padding: "8px", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Sessions</p>
                      <p style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>{analytics.overallStats.totalSessions}</p>
                    </div>
                    <div style={{ textAlign: "center", padding: "8px", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Avg Score</p>
                      <p style={{ 
                        fontSize: "20px", 
                        fontWeight: "bold", 
                        margin: 0, 
                        color: hasData ? (analytics.overallStats.averageScore >= 70 ? "#22c55e" : analytics.overallStats.averageScore >= 60 ? "#eab308" : "#ef4444") : "#94a3b8"
                      }}>
                        {hasData ? `${analytics.overallStats.averageScore.toFixed(0)}%` : "—"}
                      </p>
                    </div>
                    <div style={{ textAlign: "center", padding: "8px", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Streak</p>
                      <p style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: streakDays > 0 ? "#f97316" : "#94a3b8" }}>
                        {streakDays > 0 ? `${streakDays} 🔥` : "0"}
                      </p>
                    </div>
                  </div>

                  {/* Welcome Message for New Users */}
                  {!hasData && (
                    <div style={{ 
                      marginBottom: "16px", 
                      padding: "16px", 
                      background: "linear-gradient(135deg, #eff6ff, #eef2ff)", 
                      borderRadius: "12px",
                      textAlign: "center"
                    }}>
                      <span style={{ fontSize: "32px" }}>🎓</span>
                      <p style={{ marginTop: "8px", fontSize: "14px", fontWeight: "500" }}>Welcome to AceMedix Academy!</p>
                      <p style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                        Complete your first session to unlock personalized insights and track your progress.
                      </p>
                    </div>
                  )}

                  {/* Time Stats */}
                  {hasData && (
                    <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#faf5ff", borderRadius: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>⏱️</span>
                          <span style={{ fontSize: "14px", color: "#475569" }}>Total Practice Time</span>
                        </div>
                        <span style={{ fontWeight: "600" }}>{formatTime(analytics.overallStats.totalTimeSpent)}</span>
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {hasRecommendations && (
                    <div style={{ marginBottom: "16px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>💡</span> Quick Tips
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {analytics.recommendations.slice(0, 2).map((rec, i) => (
                          <div key={i} style={{ 
                            padding: "12px", 
                            background: "linear-gradient(135deg, #eff6ff, #eef2ff)", 
                            borderRadius: "8px" 
                          }}>
                            <p style={{ fontSize: "14px", fontWeight: "500", margin: "0 0 4px 0" }}>{rec.title}</p>
                            <p style={{ fontSize: "12px", color: "#475569", margin: 0 }}>{rec.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Weak Areas */}
                  {hasWeakAreas && (
                    <div style={{ marginBottom: "16px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>📉</span> Areas to Improve
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {analytics.weakAreas.slice(0, 2).map((area, i) => (
                          <div key={i} style={{ 
                            padding: "8px", 
                            borderLeft: "4px solid #ef4444", 
                            backgroundColor: "#fef2f2", 
                            borderRadius: "4px" 
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "14px", fontWeight: "500" }}>{area.category}</span>
                              <span style={{ fontSize: "12px", color: "#ef4444" }}>{area.successRate.toFixed(0)}%</span>
                            </div>
                            <div style={{ width: "100%", backgroundColor: "#fecaca", borderRadius: "8px", height: "6px" }}>
                              <div style={{ 
                                width: `${area.successRate}%`, 
                                backgroundColor: "#ef4444", 
                                borderRadius: "8px", 
                                height: "6px" 
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strong Areas */}
                  {hasStrongAreas && (
                    <div style={{ marginBottom: "16px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>🏆</span> Your Strengths
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {analytics.strongAreas.slice(0, 2).map((area, i) => (
                          <div key={i} style={{ 
                            padding: "8px", 
                            borderLeft: "4px solid #22c55e", 
                            backgroundColor: "#f0fdf4", 
                            borderRadius: "4px" 
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "14px", fontWeight: "500" }}>{area.category}</span>
                              <span style={{ fontSize: "12px", color: "#22c55e" }}>{area.successRate.toFixed(0)}%</span>
                            </div>
                            <div style={{ width: "100%", backgroundColor: "#bbf7d0", borderRadius: "8px", height: "6px" }}>
                              <div style={{ 
                                width: `${area.successRate}%`, 
                                backgroundColor: "#22c55e", 
                                borderRadius: "8px", 
                                height: "6px" 
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Activity */}
                  {hasRecentActivity && (
                    <div>
                      <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>📋</span> Recent Activity
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {analytics.recentActivity?.slice(0, 3).map((activity, i) => (
                          <div key={i} style={{ 
                            padding: "8px", 
                            backgroundColor: "#f8fafc", 
                            borderRadius: "8px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>✅</span>
                              <span style={{ fontSize: "13px" }}>
                                {activity.activityType === "session_complete" ? "Completed" : "Practiced"}
                              </span>
                              <span style={{ fontSize: "11px", color: "#64748b" }}>
                                {activity.applicationName}
                              </span>
                            </div>
                            <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                              {new Date(activity.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ 
              borderTop: "1px solid #e2e8f0", 
              padding: "12px", 
              backgroundColor: "#f8fafc",
              display: "flex",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={() => {
                  setLoading(true);
                  fetch("/api/user/analytics")
                    .then(res => res.json())
                    .then(data => {
                      const formattedData = {
                        ...data,
                        overallStats: {
                          totalSessions: Number(data.overallStats?.totalSessions) || 0,
                          totalTimeSpent: Number(data.overallStats?.totalTimeSpent) || 0,
                          averageScore: Number(data.overallStats?.averageScore) || 0,
                          recentScore: Number(data.overallStats?.recentScore) || 0,
                        },
                        streakData: {
                          streakDays: Number(data.streakData?.streakDays) || 0,
                        },
                        weakAreas: data.weakAreas || [],
                        strongAreas: data.strongAreas || [],
                        recommendations: data.recommendations || [],
                        recentActivity: data.recentActivity || [],
                      };
                      
                      setAnalytics(formattedData);
                      setLoading(false);
                    })
                    .catch(() => {
                      setAnalytics(welcomeData);
                      setLoading(false);
                    });
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#8b5cf6",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span>🔄</span> Refresh
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </>
  );
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes > 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes}m`;
}