// app/dashboard/components/GamesSection.tsx
'use client';
import { FC, useState, useEffect } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { cn } from "@/utils";
import { AdminGuard } from "./AdminGuard";
import GamePlayer from "./GamePlayer";
import AdminUploadModal from "./admin/AdminUploadModal";

type GamesSectionProps = {
  switchSection: (section: string) => void;
};

const GamesSection: FC<GamesSectionProps> = ({ switchSection }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [games, setGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/games');
      const data = await res.json();
      setGames(data);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast.error('Failed to load games');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayGame = async (game: any) => {
    try {
      const res = await fetch(`/api/games?id=${game.id}`);
      const gameData = await res.json();
      setSelectedGame(gameData);
    } catch (error) {
      console.error('Error loading game:', error);
      toast.error('Failed to load game');
    }
  };

  const handleUpload = async () => {
    await fetchGames();
  };

  if (selectedGame) {
    return (
      <GamePlayer 
        game={selectedGame} 
        onExit={() => setSelectedGame(null)}
        onComplete={async () => {
          await fetchGames();
        }}
      />
    );
  }

  return (
    <div className={cn("rounded-2xl shadow-lg p-4 md:p-8 border backdrop-blur-sm",
      isDark ? "bg-gray-800/95 border-orange-800" : "bg-gradient-to-br from-white/95 to-orange-50/95 border-orange-300"
    )}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <h2 className={cn("text-2xl md:text-3xl font-bold flex items-center", isDark ? "text-gray-100" : "text-slate-800")}>
          <i className="fas fa-gamepad mr-3 md:mr-4 text-orange-500"></i>
          Medical Games
        </h2>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => switchSection('selection')}
            className="flex-1 md:flex-none px-4 md:px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-300 flex items-center justify-center font-bold shadow-lg text-sm md:text-base"
          >
            <i className="fas fa-arrow-left mr-2 md:mr-3"></i>
            Back
          </button>
        </div>
      </div>

      {/* Admin Upload Button */}
      <AdminGuard>
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowUploadModal(true)}
            className="w-full md:w-auto px-4 md:px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 flex items-center justify-center font-semibold shadow-lg text-sm md:text-base"
          >
            <i className="fas fa-upload mr-2 md:mr-3"></i>
            Upload Games (CSV)
          </button>
        </div>
      </AdminGuard>

      {/* Games Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {games.map((game) => (
            <div
              key={game.id}
              className={cn("rounded-xl p-4 md:p-6 border hover:shadow-lg transition-all group",
                isDark ? "bg-gray-700/50 border-orange-800" : "bg-white/80 border-orange-200"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className={`fas fa-${
                      game.type === 'quiz' ? 'question-circle' :
                      game.type === 'matching' ? 'puzzle-piece' :
                      game.type === 'flashcard' ? 'layer-group' : 'clock'
                    } text-white text-lg md:text-xl`}></i>
                  </div>
                  <div>
                    <h3 className={cn("font-bold text-base md:text-lg", isDark ? "text-gray-100" : "text-slate-800")}>{game.title}</h3>
                    <span className={cn("text-xs md:text-sm capitalize", isDark ? "text-gray-400" : "text-slate-500")}>{game.type}</span>
                  </div>
                </div>
                <span className={cn("px-2 py-1 rounded-full text-xs font-semibold",
                  isDark ? "bg-orange-900/50 text-orange-300" : "bg-orange-100 text-orange-800"
                )}>
                  {game.totalQuestions} Qs
                </span>
              </div>

              <div className={cn("flex items-center justify-between text-sm mb-4", isDark ? "text-gray-400" : "text-slate-600")}>
                <span>
                  <i className="fas fa-play-circle text-orange-500 mr-1"></i>
                  {game.totalPlays || 0} plays
                </span>
                {game.timeLimit && (
                  <span>
                    <i className="fas fa-clock text-orange-500 mr-1"></i>
                    {game.timeLimit}s
                  </span>
                )}
              </div>

              <button
                onClick={() => handlePlayGame(game)}
                className="w-full px-4 py-2 md:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 font-semibold text-sm md:text-base transition-all"
              >
                Play Game
              </button>
            </div>
          ))}

          {games.length === 0 && (
            <div className={cn("col-span-full text-center py-8 md:py-12 rounded-2xl border-2 border-dashed",
              isDark ? "bg-orange-950/30 border-orange-800" : "bg-gradient-to-br from-orange-50/80 to-orange-100/80 border-orange-300"
            )}>
              <i className={cn("fas fa-dice-d6 text-4xl md:text-5xl mb-3 md:mb-4", isDark ? "text-orange-600" : "text-orange-400")}></i>
              <p className={isDark ? "text-gray-400 text-base md:text-lg" : "text-slate-500 text-base md:text-lg"}>No games yet. Upload a CSV file to get started!</p>
              <AdminGuard>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-3 md:mt-4 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 text-sm md:text-base"
                >
                  <i className="fas fa-upload mr-2"></i>
                  Upload Games
                </button>
              </AdminGuard>
            </div>
          )}
        </div>
      )}

      {/* Admin Upload Modal */}
      <AdminUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        title="Upload Games (CSV)"
        uploadType="games"
      />
    </div>
  );
};

export default GamesSection;