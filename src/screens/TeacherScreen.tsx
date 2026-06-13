import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Pencil, Trash2, X,
  ChevronRight, GraduationCap, AlertTriangle,
  Users, LayoutList, BookOpen, UserPlus, UserMinus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from '../components/PageWrapper';
import { SettingsButton } from '../components/Settings';
import { useApp } from '../lib/store';
import { api } from '../lib/api';
import { audio } from '../lib/audio';
import type { KnowledgeSet, Question, User, MenuItemConfig } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────
type TopTab = 'questions' | 'teachers' | 'menu';
type QSub   = 'sets' | 'detail';
type Modal  = 'none' | 'set' | 'question' | 'del-set' | 'del-question'
            | 'add-teacher' | 'del-teacher';

interface SetForm { grade: number; topic: string }
interface QForm {
  text: string; difficulty: 'easy' | 'medium' | 'hard';
  a: string; b: string; c: string; d: string;
  correct: 'a' | 'b' | 'c' | 'd';
}

const BLANK_SET: SetForm = { grade: 1, topic: '' };
const BLANK_Q: QForm = { text: '', difficulty: 'easy', a: '', b: '', c: '', d: '', correct: 'a' };

const DIFF_META = {
  easy:   { label: 'Dễ',        color: '#4CAF50', bg: '#E8F5E9' },
  medium: { label: 'Trung bình', color: '#FF8800', bg: '#FFF3E0' },
  hard:   { label: 'Khó',        color: '#FF5722', bg: '#FBE9E7' },
};
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ANS_LABELS = ['A', 'B', 'C', 'D'] as const;
const ANS_KEYS   = ['a', 'b', 'c', 'd'] as const;

const DEFAULT_MENU: Record<string, { label: string; sub: string }> = {
  speed:       { label: 'Cáo Tia Chớp',  sub: 'Toán tốc độ' },
  knowledge:   { label: 'Cáo Giáo Sư',   sub: 'Bộ kiến thức' },
  fashion:     { label: 'Cáo Thời Trang', sub: 'Mua trang phục' },
  leaderboard: { label: 'Cáo Thành Tích', sub: 'Bảng xếp hạng' },
};

// ── Component ─────────────────────────────────────────────────────────────────
export function TeacherScreen() {
  const navigate = useNavigate();
  const { currentUser, user, loading: userLoading } = useApp();

  // ── Top-level state ──
  const [topTab, setTopTab]         = useState<TopTab>('questions');
  const [modal,  setModal]          = useState<Modal>('none');
  const [saving, setSaving]         = useState(false);
  const [pendingDeleteId, setPDI]   = useState('');

  // ── Questions tab ──
  const [qSub,         setQSub]         = useState<QSub>('sets');
  const [sets,         setSets]         = useState<Record<string, KnowledgeSet>>({});
  const [setsLoading,  setSetsLoading]  = useState(true);
  const [filterGrade,  setFilterGrade]  = useState<number | null>(null);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [setForm,      setSetForm]      = useState<SetForm>(BLANK_SET);
  const [qForm,        setQForm]        = useState<QForm>(BLANK_Q);

  // ── Teachers tab ──
  const [allUsers,       setAllUsers]       = useState<Record<string, User>>({});
  const [usersLoading,   setUsersLoading]   = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [teacherMsg,     setTeacherMsg]     = useState('');

  // ── Menu tab ──
  const [menuDraft,   setMenuDraft]   = useState<Record<string, MenuItemConfig>>({});
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuSaved,   setMenuSaved]   = useState(false);

  // ── Load sets on mount ──
  useEffect(() => {
    if (!currentUser) { navigate('/', { replace: true }); return; }
    if (!userLoading && user && user.role !== 'teacher') { navigate('/menu', { replace: true }); return; }
    if (!userLoading && user) {
      api.getData().then(d => {
        setSets(d.knowledgeSets ?? {});
        setSetsLoading(false);
      }).catch(() => setSetsLoading(false));
    }
  }, [currentUser, user, userLoading, navigate]);

  // ── Load users when switching to teachers tab ──
  useEffect(() => {
    if (topTab !== 'teachers' || Object.keys(allUsers).length > 0) return;
    setUsersLoading(true);
    api.getData().then(d => { setAllUsers(d.users ?? {}); setUsersLoading(false); })
      .catch(() => setUsersLoading(false));
  }, [topTab, allUsers]);

  // ── Load menu config when switching to menu tab ──
  useEffect(() => {
    if (topTab !== 'menu') return;
    setMenuLoading(true);
    api.getData().then(d => {
      const cfg = d.menuConfig ?? {};
      // Populate draft with current config
      const draft: Record<string, MenuItemConfig> = {};
      Object.keys(DEFAULT_MENU).forEach(k => {
        draft[k] = { label: cfg[k]?.label ?? '', sub: cfg[k]?.sub ?? '' };
      });
      setMenuDraft(draft);
      setMenuLoading(false);
    }).catch(() => setMenuLoading(false));
  }, [topTab]);

  if (!currentUser || !user) return null;

  // ── Derived ──
  const grades = [...new Set(Object.values(sets).map(s => s.grade))].sort((a, b) => a - b);
  const filteredSets = (filterGrade
    ? Object.entries(sets).filter(([, s]) => s.grade === filterGrade)
    : Object.entries(sets)
  ).sort((a, b) => a[1].grade - b[1].grade || a[1].topic.localeCompare(b[1].topic));

  const selectedSet = sets[selectedSetId];
  const questions   = selectedSet ? Object.entries(selectedSet.questions ?? {}) : [];
  const teachers    = Object.entries(allUsers).filter(([, u]) => u.role === 'teacher');

  const closeModal = () => { if (!saving) { setModal('none'); setTeacherMsg(''); } };

  // ──────────────────────────────────────────────────────────
  // SETS CRUD
  // ──────────────────────────────────────────────────────────
  const openAddSet = () => { setEditingId(null); setSetForm(BLANK_SET); setModal('set'); };
  const openEditSet = (id: string) => {
    const s = sets[id];
    setEditingId(id); setSetForm({ grade: s.grade, topic: s.topic }); setModal('set');
  };
  const saveSet = async () => {
    if (!setForm.topic.trim() || saving) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.put({ knowledgeSets: { [editingId]: { grade: setForm.grade, topic: setForm.topic } } });
        setSets(p => ({ ...p, [editingId]: { ...p[editingId], grade: setForm.grade, topic: setForm.topic } }));
      } else {
        const id = `set_${Date.now()}`;
        const s: KnowledgeSet = { grade: setForm.grade, topic: setForm.topic, createdBy: currentUser, questions: {} };
        await api.put({ knowledgeSets: { [id]: s } });
        setSets(p => ({ ...p, [id]: s }));
      }
      setModal('none');
    } finally { setSaving(false); }
  };
  const confirmDelSet = (id: string) => { setPDI(id); setModal('del-set'); };
  const deleteSet = async () => {
    if (saving) return; setSaving(true);
    try {
      const data = await api.getData();
      const all = { ...data.knowledgeSets }; delete all[pendingDeleteId];
      await api.putFull({ ...data, knowledgeSets: all });
      setSets(all); setModal('none');
    } finally { setSaving(false); }
  };

  // ──────────────────────────────────────────────────────────
  // QUESTIONS CRUD
  // ──────────────────────────────────────────────────────────
  const openAddQ = () => { setEditingId(null); setQForm(BLANK_Q); setModal('question'); };
  const openEditQ = (id: string) => {
    const q = selectedSet.questions[id]; setEditingId(id);
    setQForm({ text: q.question, difficulty: q.difficulty,
      a: q.answers['a'] ?? '', b: q.answers['b'] ?? '',
      c: q.answers['c'] ?? '', d: q.answers['d'] ?? '',
      correct: (q.correctKey as 'a' | 'b' | 'c' | 'd') ?? 'a' });
    setModal('question');
  };
  const saveQuestion = async () => {
    if (!qForm.text.trim() || !qForm.a.trim() || !qForm.b.trim() || saving) return;
    setSaving(true);
    try {
      const q: Question = { question: qForm.text, difficulty: qForm.difficulty,
        answers: { a: qForm.a, b: qForm.b, c: qForm.c, d: qForm.d }, correctKey: qForm.correct };
      const id = editingId ?? `q_${Date.now()}`;
      await api.put({ knowledgeSets: { [selectedSetId]: { questions: { [id]: q } } } });
      setSets(p => ({ ...p, [selectedSetId]: { ...p[selectedSetId],
        questions: { ...p[selectedSetId].questions, [id]: q } } }));
      setModal('none');
    } finally { setSaving(false); }
  };
  const confirmDelQ = (id: string) => { setPDI(id); setModal('del-question'); };
  const deleteQuestion = async () => {
    if (saving) return; setSaving(true);
    try {
      const data = await api.getData();
      const qs = { ...data.knowledgeSets[selectedSetId].questions }; delete qs[pendingDeleteId];
      const updatedSets = { ...data.knowledgeSets, [selectedSetId]: { ...data.knowledgeSets[selectedSetId], questions: qs } };
      await api.putFull({ ...data, knowledgeSets: updatedSets });
      setSets(p => ({ ...p, [selectedSetId]: { ...p[selectedSetId], questions: qs } }));
      setModal('none');
    } finally { setSaving(false); }
  };

  // ──────────────────────────────────────────────────────────
  // TEACHER MANAGEMENT
  // ──────────────────────────────────────────────────────────
  const promoteTeacher = async () => {
    const name = newTeacherName.trim();
    if (!name || saving) return;
    if (!allUsers[name]) { setTeacherMsg('Không tìm thấy người dùng này.'); return; }
    if (allUsers[name].role === 'teacher') { setTeacherMsg('Người này đã là giáo viên.'); return; }
    setSaving(true);
    try {
      await api.put({ users: { [name]: { role: 'teacher' } } });
      setAllUsers(p => ({ ...p, [name]: { ...p[name], role: 'teacher' } }));
      setNewTeacherName(''); setModal('none'); setTeacherMsg('');
    } finally { setSaving(false); }
  };
  const confirmDelTeacher = (name: string) => { setPDI(name); setModal('del-teacher'); };
  const demoteTeacher = async () => {
    if (saving) return; setSaving(true);
    try {
      await api.put({ users: { [pendingDeleteId]: { role: 'student' } } });
      setAllUsers(p => ({ ...p, [pendingDeleteId]: { ...p[pendingDeleteId], role: 'student' } }));
      setModal('none');
    } finally { setSaving(false); }
  };

  // ──────────────────────────────────────────────────────────
  // MENU CONFIG
  // ──────────────────────────────────────────────────────────
  const saveMenuConfig = async () => {
    if (saving) return; setSaving(true);
    try {
      await api.put({ menuConfig: menuDraft });
      setMenuSaved(true); setTimeout(() => setMenuSaved(false), 2000);
    } finally { setSaving(false); }
  };

  // ──────────────────────────────────────────────────────────
  // Header title / back logic
  // ──────────────────────────────────────────────────────────
  const headerTitle =
    topTab === 'teachers' ? 'Giáo viên' :
    topTab === 'menu' ? 'Menu học sinh' :
    qSub === 'detail' ? (selectedSet?.topic ?? 'Câu hỏi') :
    'Quản lý câu hỏi';

  const handleBack = () => {
    audio.play('button-back');
    if (topTab === 'questions' && qSub === 'detail') setQSub('sets');
    else navigate('/menu');
  };

  // ──────────────────────────────────────────────────────────
  // FAB visible logic
  // ──────────────────────────────────────────────────────────
  const showFab = topTab === 'teachers' || topTab === 'questions';

  // ── RENDER ────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div style={{ height: '100%', background: '#FFFBEA', display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '14px 16px 10px',
          background: '#FFD600', borderBottom: '3px solid #F5A800', gap: 8,
        }}>
          <motion.button onPointerDown={handleBack} whileTap={{ scale: 0.9 }}
            style={{ background: 'none', color: '#3E2000', flexShrink: 0 }}>
            <ArrowLeft size={22} />
          </motion.button>
          <div style={{ flex: 1, fontSize: 17, fontWeight: 800, color: '#3E2000',
            display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <GraduationCap size={20} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {headerTitle}
            </span>
          </div>
          {topTab === 'questions' && qSub === 'detail' && (
            <span style={{ background: '#3E2000', color: '#FFD600', borderRadius: 10,
              padding: '2px 10px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
              Lớp {selectedSet?.grade}
            </span>
          )}
          <SettingsButton />
        </div>

        {/* Tab bar — hide when inside set detail */}
        {!(topTab === 'questions' && qSub === 'detail') && (
          <div style={{ display: 'flex', background: '#FFF3A3', borderBottom: '2px solid #F5A800' }}>
            {([
              { id: 'questions', icon: <BookOpen size={15} />, label: 'Câu hỏi' },
              { id: 'teachers',  icon: <Users size={15} />,    label: 'Giáo viên' },
              { id: 'menu',      icon: <LayoutList size={15} />, label: 'Menu HS' },
            ] as { id: TopTab; icon: React.ReactNode; label: string }[]).map(t => (
              <motion.button key={t.id}
                onPointerDown={() => { audio.play('button-click'); setTopTab(t.id); }}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1, padding: '10px 4px',
                  background: topTab === t.id ? '#FFD600' : 'transparent',
                  borderBottom: topTab === t.id ? '3px solid #C17F00' : '3px solid transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  fontFamily: "'Baloo 2', cursive",
                  fontSize: 11, fontWeight: 700, color: topTab === t.id ? '#3E2000' : '#7D5A2C',
                }}
              >
                {t.icon}{t.label}
              </motion.button>
            ))}
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">

          {/* ── QUESTIONS TAB ── */}
          {topTab === 'questions' && qSub === 'sets' && (
            <motion.div key="sets" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 8, padding: '12px 16px 4px', flexWrap: 'wrap' }}>
                <Chip label="Tất cả" active={filterGrade === null} onClick={() => setFilterGrade(null)} />
                {grades.map(g => <Chip key={g} label={`Lớp ${g}`} active={filterGrade === g} onClick={() => setFilterGrade(g)} />)}
              </div>
              <div style={{ padding: '8px 16px 100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {setsLoading ? <LoadMsg msg="Đang tải..." /> :
                 filteredSets.length === 0 ? <LoadMsg msg="Chưa có bộ câu hỏi nào. Nhấn + để thêm." /> :
                 filteredSets.map(([id, s], i) => {
                  const qCount = Object.keys(s.questions ?? {}).length;
                  return (
                    <motion.div key={id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10,
                        background: '#FFF', border: '2px solid #FFD600',
                        borderRadius: 16, padding: '12px 14px', boxShadow: '0 3px 0 #F5A800' }}>
                      <span style={{ background: '#FFD600', color: '#3E2000', borderRadius: 10,
                        padding: '2px 9px', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>L{s.grade}</span>
                      <motion.button onPointerDown={() => { audio.play('button-click'); setSelectedSetId(id); setQSub('detail'); }}
                        whileTap={{ scale: 0.98 }} style={{ flex: 1, textAlign: 'left', background: 'none', minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#3E2000',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.topic}</div>
                        <div style={{ fontSize: 12, color: '#7D5A2C' }}>{qCount} câu • {s.createdBy}</div>
                      </motion.button>
                      <ChevronRight size={16} color="#BDBDBD" />
                      <IconBtn icon={Pencil} color="#3E2000" bg="#FFF3A3" onClick={() => { audio.play('button-click'); openEditSet(id); }} />
                      <IconBtn icon={Trash2} color="#FF5722" bg="#FBE9E7" onClick={() => { audio.play('button-click'); confirmDelSet(id); }} />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {topTab === 'questions' && qSub === 'detail' && (
            <motion.div key="detail" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {questions.length === 0 ? <LoadMsg msg="Chưa có câu hỏi. Nhấn + để thêm." /> :
                 questions.map(([id, q], i) => {
                  const dm = DIFF_META[q.difficulty];
                  const validAnswers = ANS_KEYS.filter(k => q.answers[k]?.trim());
                  return (
                    <motion.div key={id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{ background: '#FFF', border: '2px solid #FFD600', borderRadius: 14,
                        padding: '12px 14px', boxShadow: '0 2px 0 #F5A800' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#7D5A2C', flexShrink: 0, paddingTop: 2 }}>#{i+1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#3E2000', lineHeight: 1.4 }}>{q.question}</div>
                          <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: dm.color, background: dm.bg,
                              border: `1.5px solid ${dm.color}`, borderRadius: 8, padding: '2px 8px' }}>{dm.label}</span>
                            {validAnswers.map(k => (
                              <span key={k} style={{
                                fontSize: 11, fontWeight: k === q.correctKey ? 800 : 600,
                                color: k === q.correctKey ? '#4CAF50' : '#7D5A2C',
                                background: k === q.correctKey ? '#E8F5E9' : '#F5F5F5',
                                border: `1.5px solid ${k === q.correctKey ? '#4CAF50' : '#E0E0E0'}`,
                                borderRadius: 8, padding: '2px 8px',
                              }}>{ANS_LABELS[ANS_KEYS.indexOf(k)]}. {q.answers[k]}</span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <IconBtn icon={Pencil} color="#3E2000" bg="#FFF3A3" onClick={() => { audio.play('button-click'); openEditQ(id); }} />
                          <IconBtn icon={Trash2} color="#FF5722" bg="#FBE9E7" onClick={() => { audio.play('button-click'); confirmDelQ(id); }} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── TEACHERS TAB ── */}
          {topTab === 'teachers' && (
            <motion.div key="teachers" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {usersLoading ? <LoadMsg msg="Đang tải..." /> : teachers.length === 0 ? <LoadMsg msg="Chưa có giáo viên nào." /> :
                 teachers.map(([name, u], i) => (
                  <motion.div key={name} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12,
                      background: name === currentUser ? '#FFF3A3' : '#FFF',
                      border: `2px solid ${name === currentUser ? '#FFD600' : '#E0E0E0'}`,
                      borderRadius: 14, padding: '12px 14px', boxShadow: '0 2px 0 #F5A800' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FFD600',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 800, color: '#3E2000', flexShrink: 0 }}>
                      {name[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#3E2000' }}>
                        {name}{name === currentUser && <span style={{ fontSize: 12, color: '#F5A800' }}> (Bạn)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#7D5A2C' }}>Lớp {u.grade} • Giáo viên</div>
                    </div>
                    {name !== currentUser && (
                      <IconBtn icon={UserMinus} color="#FF5722" bg="#FBE9E7"
                        onClick={() => { audio.play('button-click'); confirmDelTeacher(name); }} />
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── MENU TAB ── */}
          {topTab === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {menuLoading ? <LoadMsg msg="Đang tải..." /> : (<>
                  <div style={{ fontSize: 13, color: '#7D5A2C', lineHeight: 1.5 }}>
                    Tuỳ chỉnh tên hiển thị của từng mục trong menu học sinh. Để trống = dùng tên mặc định.
                  </div>
                  {Object.entries(DEFAULT_MENU).map(([key, def]) => (
                    <div key={key} style={{ background: '#FFF', border: '2px solid #FFD600',
                      borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#7D5A2C', textTransform: 'uppercase', letterSpacing: 1 }}>
                        {def.label}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#7D5A2C', fontWeight: 700, marginBottom: 4 }}>
                            Tên hiển thị (mặc định: "{def.label}")
                          </div>
                          <input value={menuDraft[key]?.label ?? ''}
                            onChange={e => setMenuDraft(p => ({ ...p, [key]: { ...p[key], label: e.target.value } }))}
                            placeholder={def.label} style={inputStyle} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#7D5A2C', fontWeight: 700, marginBottom: 4 }}>
                            Mô tả (mặc định: "{def.sub}")
                          </div>
                          <input value={menuDraft[key]?.sub ?? ''}
                            onChange={e => setMenuDraft(p => ({ ...p, [key]: { ...p[key], sub: e.target.value } }))}
                            placeholder={def.sub} style={inputStyle} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <motion.button onPointerDown={saveMenuConfig} whileTap={{ y: 3 }} disabled={saving}
                    style={{
                      width: '100%', padding: '14px 0', borderRadius: 16, marginTop: 4,
                      background: menuSaved ? '#4CAF50' : saving ? '#E0E0E0' : '#FFD600',
                      border: `3px solid ${menuSaved ? '#388E3C' : saving ? '#BDBDBD' : '#F5A800'}`,
                      boxShadow: menuSaved ? '0 4px 0 #388E3C' : saving ? 'none' : '0 4px 0 #C17F00',
                      fontSize: 16, fontWeight: 800, color: menuSaved ? '#FFF' : saving ? '#9E9E9E' : '#3E2000',
                      fontFamily: "'Baloo 2', cursive",
                    }}>
                    {menuSaved ? '✓ Đã lưu!' : saving ? 'Đang lưu...' : 'Lưu cấu hình menu'}
                  </motion.button>
                </>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB */}
        {showFab && (
          <motion.button
            onPointerDown={() => {
              audio.play('button-click');
              if (topTab === 'teachers') { setNewTeacherName(''); setTeacherMsg(''); setModal('add-teacher'); }
              else if (qSub === 'sets') openAddSet();
              else openAddQ();
            }}
            whileTap={{ scale: 0.9 }}
            style={{ position: 'absolute', bottom: 24, right: 20,
              width: 56, height: 56, borderRadius: '50%',
              background: '#FFD600', border: '3px solid #F5A800',
              boxShadow: '0 5px 0 #C17F00',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3E2000' }}>
            {topTab === 'teachers' ? <UserPlus size={24} /> : <Plus size={26} strokeWidth={2.5} />}
          </motion.button>
        )}

        {/* Modal overlay */}
        <AnimatePresence>
          {modal !== 'none' && (
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onPointerDown={closeModal}
              style={{ position: 'absolute', inset: 0, zIndex: 50,
                background: 'rgba(62,32,0,0.45)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                onPointerDown={e => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 640,
                  background: '#FFFBEA', borderRadius: '24px 24px 0 0',
                  border: '3px solid #FFD600', borderBottom: 'none',
                  padding: '20px 20px 44px',
                  display: 'flex', flexDirection: 'column', gap: 14,
                  maxHeight: '88vh', overflowY: 'auto' }}>

                {/* Set form */}
                {modal === 'set' && (<>
                  <SheetHeader title={editingId ? 'Chỉnh sửa bộ câu hỏi' : 'Thêm bộ câu hỏi'} onClose={closeModal} />
                  <FormLabel>Lớp</FormLabel>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {GRADES.map(g => <Chip key={g} label={`Lớp ${g}`} active={setForm.grade === g}
                      onClick={() => setSetForm(f => ({ ...f, grade: g }))} />)}
                  </div>
                  <FormLabel>Chủ đề / Tên bộ</FormLabel>
                  <input value={setForm.topic} onChange={e => setSetForm(f => ({ ...f, topic: e.target.value }))}
                    placeholder="VD: Phép cộng trong phạm vi 10" style={inputStyle} />
                  <SaveBtn onClick={saveSet} saving={saving} disabled={!setForm.topic.trim()}
                    label={editingId ? 'Lưu thay đổi' : 'Thêm bộ câu hỏi'} />
                </>)}

                {/* Question form */}
                {modal === 'question' && (<>
                  <SheetHeader title={editingId ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi'} onClose={closeModal} />
                  <FormLabel>Câu hỏi</FormLabel>
                  <textarea value={qForm.text} onChange={e => setQForm(f => ({ ...f, text: e.target.value }))}
                    placeholder="Nhập nội dung câu hỏi..." rows={3}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
                  <FormLabel>Độ khó</FormLabel>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(Object.entries(DIFF_META) as Array<[keyof typeof DIFF_META, typeof DIFF_META['easy']]>).map(([k, dm]) => (
                      <motion.button key={k} whileTap={{ scale: 0.95 }}
                        onPointerDown={() => setQForm(f => ({ ...f, difficulty: k }))}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 12, fontFamily: "'Baloo 2', cursive",
                          fontSize: 13, fontWeight: 700,
                          background: qForm.difficulty === k ? dm.bg : '#FFF',
                          border: `2px solid ${qForm.difficulty === k ? dm.color : '#E0E0E0'}`,
                          color: qForm.difficulty === k ? dm.color : '#7D5A2C',
                          boxShadow: qForm.difficulty === k ? `0 2px 0 ${dm.color}` : 'none' }}>
                        {dm.label}
                      </motion.button>
                    ))}
                  </div>
                  <FormLabel>Đáp án <span style={{ fontSize: 11, fontWeight: 400, color: '#7D5A2C' }}>(vòng tròn = đáp án đúng)</span></FormLabel>
                  {/* Each answer row scrolls with the sheet, no nested overflow */}
                  {ANS_KEYS.map((k, i) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <motion.button whileTap={{ scale: 0.9 }}
                        onPointerDown={() => setQForm(f => ({ ...f, correct: k }))}
                        style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                          background: qForm.correct === k ? '#4CAF50' : '#FFF',
                          border: `2px solid ${qForm.correct === k ? '#4CAF50' : '#BDBDBD'}`,
                          color: qForm.correct === k ? '#FFF' : '#BDBDBD',
                          fontWeight: 800, fontSize: 14,
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ANS_LABELS[i]}
                      </motion.button>
                      <input value={qForm[k]}
                        onChange={e => setQForm(f => ({ ...f, [k]: e.target.value }))}
                        placeholder={`Đáp án ${ANS_LABELS[i]}${k === 'c' || k === 'd' ? ' (tuỳ chọn)' : ''}`}
                        style={{ ...inputStyle, flex: 1 }} />
                    </div>
                  ))}
                  <SaveBtn onClick={saveQuestion} saving={saving}
                    disabled={!qForm.text.trim() || !qForm.a.trim() || !qForm.b.trim()}
                    label={editingId ? 'Lưu thay đổi' : 'Thêm câu hỏi'} />
                </>)}

                {/* Add teacher form */}
                {modal === 'add-teacher' && (<>
                  <SheetHeader title="Thêm giáo viên" onClose={closeModal} />
                  <div style={{ fontSize: 13, color: '#7D5A2C' }}>
                    Nhập tên tài khoản học sinh để cấp quyền giáo viên.
                  </div>
                  <input value={newTeacherName} onChange={e => { setNewTeacherName(e.target.value); setTeacherMsg(''); }}
                    placeholder="Tên tài khoản..." style={inputStyle} />
                  {teacherMsg && (
                    <div style={{ background: '#FBE9E7', border: '2px solid #FF5722', borderRadius: 10,
                      padding: '8px 12px', fontSize: 13, color: '#BF360C', fontWeight: 600 }}>{teacherMsg}</div>
                  )}
                  <SaveBtn onClick={promoteTeacher} saving={saving}
                    disabled={!newTeacherName.trim()} label="Cấp quyền giáo viên" />
                </>)}

                {/* Confirm delete set */}
                {modal === 'del-set' && (
                  <ConfirmDelete
                    message={`Xoá bộ "${sets[pendingDeleteId]?.topic}"? Toàn bộ câu hỏi trong bộ cũng bị xoá.`}
                    onConfirm={deleteSet} onCancel={closeModal} saving={saving} />
                )}

                {/* Confirm delete question */}
                {modal === 'del-question' && (
                  <ConfirmDelete message="Xoá câu hỏi này?"
                    onConfirm={deleteQuestion} onCancel={closeModal} saving={saving} />
                )}

                {/* Confirm demote teacher */}
                {modal === 'del-teacher' && (
                  <ConfirmDelete
                    message={`Xoá quyền giáo viên của "${pendingDeleteId}"? Họ sẽ trở thành học sinh.`}
                    onConfirm={demoteTeacher} onCancel={closeModal} saving={saving} />
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button onPointerDown={onClick} whileTap={{ scale: 0.95 }}
      style={{ padding: '6px 14px', borderRadius: 20, fontFamily: "'Baloo 2', cursive",
        background: active ? '#FFD600' : '#FFF',
        border: `2px solid ${active ? '#F5A800' : '#FFD600'}`,
        boxShadow: active ? '0 3px 0 #C17F00' : 'none',
        fontSize: 13, fontWeight: 700, color: '#3E2000' }}>
      {label}
    </motion.button>
  );
}

function IconBtn({ icon: Icon, color, bg, onClick }: { icon: typeof Pencil; color: string; bg: string; onClick: () => void }) {
  return (
    <motion.button onPointerDown={onClick} whileTap={{ scale: 0.88 }}
      style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: bg, border: `1.5px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
      <Icon size={15} />
    </motion.button>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#3E2000' }}>{title}</div>
      <motion.button onPointerDown={onClose} whileTap={{ scale: 0.9 }}
        style={{ width: 32, height: 32, borderRadius: '50%', background: '#FBE9E7',
          border: '2px solid #FF5722', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF5722' }}>
        <X size={16} />
      </motion.button>
    </div>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: '#7D5A2C', marginBottom: -6 }}>{children}</div>;
}

function SaveBtn({ onClick, saving, disabled, label }: { onClick: () => void; saving: boolean; disabled: boolean; label: string }) {
  return (
    <motion.button onPointerDown={onClick} whileTap={{ y: 3, boxShadow: 'none' }} disabled={disabled || saving}
      style={{ width: '100%', padding: '14px 0', borderRadius: 16, marginTop: 4,
        background: disabled || saving ? '#E0E0E0' : '#FFD600',
        border: `3px solid ${disabled || saving ? '#BDBDBD' : '#F5A800'}`,
        boxShadow: disabled || saving ? 'none' : '0 4px 0 #C17F00',
        fontSize: 16, fontWeight: 800, color: disabled || saving ? '#9E9E9E' : '#3E2000',
        fontFamily: "'Baloo 2', cursive" }}>
      {saving ? 'Đang lưu...' : label}
    </motion.button>
  );
}

function ConfirmDelete({ message, onConfirm, onCancel, saving }: {
  message: string; onConfirm: () => void; onCancel: () => void; saving: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '8px 0' }}>
      <AlertTriangle size={48} color="#FF8C00" />
      <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#3E2000', lineHeight: 1.5 }}>{message}</div>
      <motion.button onPointerDown={onConfirm} whileTap={{ y: 3 }} disabled={saving}
        style={{ width: '100%', padding: '14px 0', borderRadius: 16,
          background: '#FF5722', border: '3px solid #BF360C', boxShadow: '0 4px 0 #BF360C',
          fontSize: 16, fontWeight: 800, color: '#FFF', fontFamily: "'Baloo 2', cursive",
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Trash2 size={18} /> {saving ? 'Đang xoá...' : 'Xoá'}
      </motion.button>
      <motion.button onPointerDown={onCancel} whileTap={{ y: 3 }}
        style={{ width: '100%', padding: '14px 0', borderRadius: 16,
          background: '#FFD600', border: '3px solid #F5A800', boxShadow: '0 4px 0 #C17F00',
          fontSize: 16, fontWeight: 800, color: '#3E2000', fontFamily: "'Baloo 2', cursive" }}>
        Huỷ
      </motion.button>
    </div>
  );
}

function LoadMsg({ msg }: { msg: string }) {
  return <div style={{ textAlign: 'center', padding: '40px 16px', color: '#7D5A2C', fontWeight: 600, lineHeight: 1.6 }}>{msg}</div>;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: '#FFF', border: '2px solid #FFD600',
  borderRadius: 12, fontSize: 15, color: '#3E2000',
  fontFamily: "'Baloo 2', cursive", outline: 'none', boxSizing: 'border-box',
};
