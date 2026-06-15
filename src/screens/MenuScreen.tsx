import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { PageWrapper } from '../components/PageWrapper';
import { AppleCount } from '../components/AppleCount';
import { SettingsButton } from '../components/Settings';
import { useApp } from '../lib/store';
import { api } from '../lib/api';
import { audio } from '../lib/audio';
import type { MenuItemConfig } from '../types';

const STUDENT_ITEMS = [
  { label: 'Cáo Tia Chớp', sub: 'Toán tốc độ', img: '/assets/fox-job/fast-speed.webp', route: '/speed' },
  { label: 'Cáo Giáo Sư', sub: 'Bộ kiến thức', img: '/assets/fox-job/teacher.webp', route: '/knowledge' },
  { label: 'Cáo Thách Đấu', sub: 'Thi đấu real-time', img: '/assets/fox-job/speed-two.webp', route: '/battle' },
  { label: 'Cáo Thời Trang', sub: 'Mua trang phục', img: '/assets/fox-job/fasion.webp', route: '/fashion' },
  { label: 'Cáo Thành Tích', sub: 'Bảng xếp hạng', img: '/assets/fox-job/graduade.webp', route: '/leaderboard' },
];
const TEACHER_ITEMS = [
  { label: 'Cáo Giáo Sư', sub: 'Bộ kiến thức', img: '/assets/fox-job/teacher.webp', route: '/knowledge' },
  { label: 'Quản lý ứng dụng', sub: 'Câu hỏi, người dùng, menu', img: '/assets/fox-job/graduade.webp', route: '/teacher' },
  { label: 'Cáo Thành Tích', sub: 'Bảng xếp hạng', img: '/assets/fox-job/graduade.webp', route: '/leaderboard' },
];

export function MenuScreen() {
  const navigate = useNavigate();
  const { currentUser, user, loading: authLoading } = useApp();
  const [menuConfig, setMenuConfig] = useState<Record<string, MenuItemConfig>>({});

  useEffect(() => {
    api.getMenuConfig().then(cfg => setMenuConfig(cfg)).catch(() => {});
  }, []);

  if (authLoading) return null;
  if (!currentUser) { navigate('/', { replace: true }); return null; }

  const MENU_ITEMS = user?.role === 'teacher' ? TEACHER_ITEMS : STUDENT_ITEMS.map(item => {
    const key = item.route.replace('/', '');
    const cfg = menuConfig[key];
    return {
      ...item,
      label: cfg?.label?.trim() || item.label,
      sub: cfg?.sub?.trim() || item.sub,
    };
  });

  return (
    <PageWrapper scroll={user?.role !== 'teacher'}>
      <div style={{
        minHeight: '100%',
        backgroundImage: 'url(/assets/background.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column',
        padding: '16px 16px 24px', gap: 14,
      }}>
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <motion.button
            onPointerDown={() => { audio.play('button-back'); navigate('/'); }}
            whileTap={{ scale: 0.92 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(255,255,255,0.85)', border: '2px solid #F5A800',
              borderRadius: 12, padding: '6px 12px',
              fontSize: 14, fontWeight: 700, color: '#7D5A2C',
              fontFamily: "'Baloo 2', cursive",
            }}
          >
            <ArrowLeft size={16} /> Trang chủ
          </motion.button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {user && <AppleCount count={user.apples} size="sm" />}
            <SettingsButton />
          </div>
        </motion.div>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          style={{
            background: 'rgba(255,255,255,0.88)', border: '2px solid #FFD600',
            borderRadius: 16, padding: '10px 16px',
          }}
        >
          <div style={{ fontSize: 19, fontWeight: 800, color: '#3E2000' }}>Hôm nay học gì nhỉ?</div>
          <div style={{ fontSize: 13, color: '#7D5A2C' }}>Chào {currentUser} • Lớp {user?.grade ?? 1}</div>
        </motion.div>

        {/* Menu items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
          {MENU_ITEMS.map((item, i) => {
            const fromLeft = i % 2 === 0;
            const gradient = fromLeft
              ? 'linear-gradient(90deg, #D4960A 0%, #E8B500 30%, #FFD600 58%)'
              : 'linear-gradient(90deg, #FFD600 42%, #E8B500 70%, #D4960A 100%)';
            return (
              <motion.button
                key={item.route}
                initial={{ opacity: 0, x: fromLeft ? -60 : 60 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.09, type: 'spring', stiffness: 260, damping: 24 }}
                onClick={() => { audio.play('button-click'); navigate(item.route); }}
                whileTap={{ scale: 0.97, y: 4, boxShadow: 'none' }}
                style={{
                  display: 'flex',
                  flexDirection: fromLeft ? 'row' : 'row-reverse',
                  alignItems: 'center',
                  gap: 14,
                  background: gradient,
                  border: '3px solid #F5A800',
                  boxShadow: '0 5px 0 #C17F00',
                  borderRadius: 20,
                  padding: '12px 16px',
                  textAlign: fromLeft ? 'left' : 'right',
                  fontFamily: "'Baloo 2', cursive",
                  cursor: 'pointer',
                }}
              >
                <img src={item.img} alt={item.label} style={{ width: 70, height: 70, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 0 3px white)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: '#3E2000' }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: '#7D5A2C', marginTop: 2 }}>{item.sub}</div>
                </div>
                <div style={{ color: '#7D5A2C', transform: fromLeft ? 'none' : 'rotate(180deg)' }}>
                  <ChevronRight size={22} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
}
