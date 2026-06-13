import { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppProvider } from './lib/store';
import { SettingsProvider } from './components/Settings';
import { audio } from './lib/audio';
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { MenuScreen } from './screens/MenuScreen';
import { SpeedGameScreen } from './screens/SpeedGameScreen';
import { KnowledgeScreen } from './screens/KnowledgeScreen';
import { FashionScreen } from './screens/FashionScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { TeacherScreen } from './screens/TeacherScreen';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div className="app-shell">
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/menu" element={<MenuScreen />} />
          <Route path="/speed" element={<SpeedGameScreen />} />
          <Route path="/knowledge" element={<KnowledgeScreen />} />
          <Route path="/fashion" element={<FashionScreen />} />
          <Route path="/leaderboard" element={<LeaderboardScreen />} />
          <Route path="/teacher" element={<TeacherScreen />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

function MusicStarter() {
  useEffect(() => {
    const start = () => { audio.startMusic(); };
    document.addEventListener('pointerdown', start, { once: true });
    return () => document.removeEventListener('pointerdown', start);
  }, []);
  return null;
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <SettingsProvider>
          <MusicStarter />
          <AnimatedRoutes />
        </SettingsProvider>
      </HashRouter>
    </AppProvider>
  );
}
