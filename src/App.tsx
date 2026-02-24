import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { UserRoleProvider } from "@/contexts/UserRoleContext";
import ScrollToTop from "@/components/ScrollToTop";
import BottomNav from "@/components/BottomNav";
import Index from "./pages/Index";
import Search from "./pages/Search";
import SeriesDetail from "./pages/SeriesDetail";
import EpisodeDetail from "./pages/EpisodeDetail";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import ProfileSettings from "./pages/ProfileSettings";
import Admin from "./pages/Admin";
import AdminAnimeDetail from "./pages/AdminAnimeDetail";
import AdminEpisodeDetail from "./pages/AdminEpisodeDetail";
import AdminMangaDetail from "./pages/AdminMangaDetail";
import AdminChapterDetail from "./pages/AdminChapterDetail";
import Mangas from "./pages/Mangas";
import MangaDetail from "./pages/MangaDetail";
import MangaReader from "./pages/MangaReader";
import Explore from "./pages/Explore";
import AllAnimes from "./pages/AllAnimes";
import Calendario from "./pages/Calendario";
import AdGuard from "./pages/AdGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserRoleProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <div className="animate-fade-in">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<Search />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/settings" element={<ProfileSettings />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/anime/:id" element={<AdminAnimeDetail />} />
              <Route path="/admin/anime/:id/episode/:episodeId" element={<AdminEpisodeDetail />} />
              <Route path="/admin/manga/:id" element={<AdminMangaDetail />} />
              <Route path="/admin/manga/:id/chapter/:chapterId" element={<AdminChapterDetail />} />
              <Route path="/series/:slug" element={<SeriesDetail />} />
              <Route path="/series/:slug/episode/:episodeId" element={<EpisodeDetail />} />
              <Route path="/explorar" element={<Explore />} />
              <Route path="/todos-los-animes" element={<AllAnimes />} />
              <Route path="/mangas" element={<Mangas />} />
              <Route path="/mangas/:slug" element={<MangaDetail />} />
              <Route path="/mangas/:slug/:chapterNumber" element={<MangaReader />} />
              <Route path="/calendario" element={<Calendario />} />
              <Route path="/adguard" element={<AdGuard />} />
              <Route path="/mangas-y-manhwas" element={<ComingSoon />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
          </div>
        </BrowserRouter>
        <Analytics />
      </TooltipProvider>
    </UserRoleProvider>
  </QueryClientProvider>
);

export default App;
