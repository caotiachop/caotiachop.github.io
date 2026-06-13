import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Medal, Zap, Shirt, Apple } from 'lucide-react';
import { SettingsButton } from '../components/Settings';
import { motion } from 'framer-motion';
import { PageWrapper } from '../components/PageWrapper';
import { useApp } from '../lib/store';
import { api } from '../lib/api';
import { audio } from '../lib/audio';
import type { User, Score } from '../types';

type Tab = 'apples' | 'speed' | 'fashion';
interface LbUser { name: string; user: User; score: Score }

export function LeaderboardScreen() {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [tab, setTab] = useState<Tab>('apples');
  const [data, setData] = useState<LbUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { navigate('/', { replace: true }); return; }
    api.getData().then(d => {
      setData(
        Object.entries(d.users ?? {})
          .filter(([name, u]) => Boolean(d.scores?.[name]) && u.role !== 'teacher')
          .map(([name, u]) => ({ name, user: u, score: d.scores![name] }))
      );
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const appleRank = [...data].sort((a, b) => b.score.maxApples - a.score.maxApples);
  const speedRank = [...data].sort((a, b) => {
    if (b.score.speedGame.maxLevel !== a.score.speedGame.maxLevel)
      return b.score.speedGame.maxLevel - a.score.speedGame.maxLevel;
    return a.score.speedGame.bestTimeMs - b.score.speedGame.bestTimeMs;
  });
  const fashionRank = [...data]
    .filter(d => Boolean(d.score.fashionCompletedAt))
    .sort((a, b) => (a.score.fashionCompletedAt ?? '').localeCompare(b.score.fashionCompletedAt ?? ''));

  type TabDef = { id: Tab; label: string; icon: ReactNode };
  const TABS: TabDef[] = [
    { id: 'apples', label: 'Táo nhiều nhất', icon: <Apple size={18} /> },
    { id: 'speed', label: 'Tốc độ cao', icon: <Zap size={18} /> },
    { id: 'fashion', label: 'Thời trang', icon: <Shirt size={18} /> },
  ];

  const rankList = tab === 'apples' ? appleRank : tab === 'speed' ? speedRank : fashionRank;

  return (
    <PageWrapper scroll>
      <div style={{ minHeight: '100%', background: '#FFFBEA', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 16px 12px',
          background: '#FFD600', borderBottom: '3px solid #F5A800',
        }}>
          <motion.button
            onPointerDown={() => { audio.play('button-back'); navigate('/menu'); }}
            whileTap={{ scale: 0.9 }}
            style={{ fontSize: 22, background: 'none', color: '#3E2000', fontWeight: 700 }}
          ><ArrowLeft size={22} /></motion.button>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#3E2000', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Medal size={20} /> Cáo Thành Tích
          </div>
          <SettingsButton />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '12px 12px 0', gap: 8 }}>
          {TABS.map(t => (
            <motion.button key={t.id}
              onPointerDown={() => { audio.play('button-click'); setTab(t.id); }}
              animate={{ scale: tab === t.id ? 1.02 : 1 }}
              style={{
                flex: 1, padding: '10px 4px',
                background: tab === t.id ? '#FFD600' : '#FFFFFF',
                border: `2px solid ${tab === t.id ? '#F5A800' : '#FFD600'}`,
                boxShadow: tab === t.id ? '0 3px 0 #C17F00' : 'none',
                borderRadius: 12, fontWeight: 700, color: '#3E2000',
                fontFamily: "'Baloo 2', cursive",
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.icon}</div>
              <div style={{ fontSize: 10 }}>{t.label}</div>
            </motion.button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#7D5A2C', fontWeight: 600 }}>Đang tải...</div>
          ) : rankList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#7D5A2C' }}>Chưa có dữ liệu</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rankList.map((item, i) => (
                <RankRow key={`${tab}-${item.name}`} rank={i + 1} name={item.name} grade={item.user.grade}
                  tab={tab} score={item.score} isMe={item.name === currentUser} delay={i * 0.05} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

function RankRow({ rank, name, grade, tab, score, isMe, delay }: {
  rank: number; name: string; grade: number; tab: Tab;
  score: Score; isMe: boolean; delay: number;
}) {
  const medalColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';
  const showMedal = rank <= 3;
  const sub = tab === 'apples'
    ? `${score.maxApples} táo`
    : tab === 'speed'
    ? `Level ${score.speedGame.maxLevel}${score.speedGame.bestTimeMs > 0 ? ` • ${score.speedGame.bestTimeMs}ms` : ''}`
    : score.fashionCompletedAt ? new Date(score.fashionCompletedAt).toLocaleDateString('vi-VN') : '-';

  return (
    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: isMe ? '#FFF3A3' : '#FFFFFF',
        border: `2px solid ${isMe ? '#FFD600' : '#F5F5F5'}`,
        borderRadius: 16, padding: '12px 14px',
        boxShadow: isMe ? '0 3px 0 #F5A800' : '0 2px 0 #F5F5F5',
      }}
    >
      <div style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {showMedal ? (
          <Medal size={26} color={medalColor} style={{ filter: 'drop-shadow(0 2px 0 rgba(0,0,5px,0.7))' }} />
        ) : (
          <span style={{ fontSize: 16, fontWeight: 800, color: '#7D5A2C' }}>{rank}</span>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#3E2000' }}>
          {name}{isMe && <span style={{ fontSize: 12, fontWeight: 600, color: '#F5A800' }}> (Bạn)</span>}
        </div>
        <div style={{ fontSize: 12, color: '#7D5A2C' }}>Lớp {grade} • {sub}</div>
      </div>
    </motion.div>
  );
}
