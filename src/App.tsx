import { useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppProvider } from './lib/store';
import { SettingsProvider } from './components/Settings';
import { audio } from './lib/audio';
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { MenuScreen } from './screens/MenuScreen';

const SpeedGameScreen  = lazy(() => import('./screens/SpeedGameScreen').then(m => ({ default: m.SpeedGameScreen })));
const KnowledgeScreen  = lazy(() => import('./screens/KnowledgeScreen').then(m => ({ default: m.KnowledgeScreen })));
const FashionScreen    = lazy(() => import('./screens/FashionScreen').then(m => ({ default: m.FashionScreen })));
const LeaderboardScreen = lazy(() => import('./screens/LeaderboardScreen').then(m => ({ default: m.LeaderboardScreen })));
const TeacherScreen    = lazy(() => import('./screens/TeacherScreen').then(m => ({ default: m.TeacherScreen })));
const BattleScreen     = lazy(() => import('./screens/BattleScreen').then(m => ({ default: m.BattleScreen })));

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div className="app-shell">
      <AnimatePresence mode="wait" initial={false}>
        <Suspense fallback={null}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/menu" element={<MenuScreen />} />
            <Route path="/speed" element={<SpeedGameScreen />} />
            <Route path="/knowledge" element={<KnowledgeScreen />} />
            <Route path="/fashion" element={<FashionScreen />} />
            <Route path="/leaderboard" element={<LeaderboardScreen />} />
            <Route path="/teacher" element={<TeacherScreen />} />
            <Route path="/battle" element={<BattleScreen />} />
            <Route path="/battle/join/:code" element={<BattleScreen />} />
          </Routes>
        </Suspense>
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
