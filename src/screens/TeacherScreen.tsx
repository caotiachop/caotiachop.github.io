import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper } from "../components/PageWrapper";
import { SettingsButton } from "../components/Settings";
import { useApp } from "../lib/store";
import { api } from "../lib/api";
import { audio } from "../lib/audio";
import type { KnowledgeSet, Question } from "../types";

type Screen = "sets" | "questions";
type Modal = "none" | "set" | "question" | "del-set" | "del-question";

interface SetForm {
  grade: number;
  topic: string;
}
interface QForm {
  text: string;
  difficulty: "easy" | "medium" | "hard";
  a: string;
  b: string;
  c: string;
  d: string;
  correct: "a" | "b" | "c" | "d";
}

const BLANK_SET: SetForm = { grade: 1, topic: "" };
const BLANK_Q: QForm = {
  text: "",
  difficulty: "easy",
  a: "",
  b: "",
  c: "",
  d: "",
  correct: "a",
};
const DIFF_META = {
  easy: { label: "Dễ", color: "#4CAF50", bg: "#E8F5E9" },
  medium: { label: "Trung bình", color: "#FF8800", bg: "#FFF3E0" },
  hard: { label: "Khó", color: "#FF5722", bg: "#FBE9E7" },
};
const GRADES = [1, 2, 3, 4, 5];
const ANS_LABELS = ["A", "B", "C", "D"] as const;
const ANS_KEYS = ["a", "b", "c", "d"] as const;

export function TeacherScreen() {
  const navigate = useNavigate();
  const { currentUser, user, loading: userLoading } = useApp();

  const [screen, setScreen] = useState<Screen>("sets");
  const [modal, setModal] = useState<Modal>("none");
  const [sets, setSets] = useState<Record<string, KnowledgeSet>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterGrade, setFilterGrade] = useState<number | null>(null);

  const [selectedSetId, setSelectedSetId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState("");

  const [setForm, setSetForm] = useState<SetForm>(BLANK_SET);
  const [qForm, setQForm] = useState<QForm>(BLANK_Q);

  useEffect(() => {
    if (!currentUser) {
      navigate("/", { replace: true });
      return;
    }
    if (!userLoading && user && user.role !== "teacher") {
      navigate("/menu", { replace: true });
      return;
    }
    if (!userLoading && user) {
      api
        .getData()
        .then((d) => {
          setSets(d.knowledgeSets ?? {});
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [currentUser, user, userLoading, navigate]);

  if (!currentUser || !user) return null;

  const grades = [...new Set(Object.values(sets).map((s) => s.grade))].sort(
    (a, b) => a - b,
  );
  const filteredSets = filterGrade
    ? Object.entries(sets).filter(([, s]) => s.grade === filterGrade)
    : Object.entries(sets);
  filteredSets.sort(
    (a, b) => a[1].grade - b[1].grade || a[1].topic.localeCompare(b[1].topic),
  );

  const selectedSet = sets[selectedSetId];
  const questions = selectedSet
    ? Object.entries(selectedSet.questions ?? {})
    : [];

  // ── Set CRUD ──────────────────────────────────────────────
  const openAddSet = () => {
    setEditingId(null);
    setSetForm(BLANK_SET);
    setModal("set");
  };
  const openEditSet = (id: string) => {
    const s = sets[id];
    setEditingId(id);
    setSetForm({ grade: s.grade, topic: s.topic });
    setModal("set");
  };

  const saveSet = async () => {
    if (!setForm.topic.trim() || saving) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.put({
          knowledgeSets: {
            [editingId]: { grade: setForm.grade, topic: setForm.topic },
          },
        });
        setSets((prev) => ({
          ...prev,
          [editingId]: {
            ...prev[editingId],
            grade: setForm.grade,
            topic: setForm.topic,
          },
        }));
      } else {
        const id = `set_${Date.now()}`;
        const s: KnowledgeSet = {
          grade: setForm.grade,
          topic: setForm.topic,
          createdBy: currentUser,
          questions: {},
        };
        await api.put({ knowledgeSets: { [id]: s } });
        setSets((prev) => ({ ...prev, [id]: s }));
      }
      setModal("none");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteSet = (id: string) => {
    setPendingDeleteId(id);
    setModal("del-set");
  };
  const deleteSet = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const data = await api.getData();
      const all = { ...data.knowledgeSets };
      delete all[pendingDeleteId];
      await api.putFull({ ...data, knowledgeSets: all });
      setSets(all);
      setModal("none");
    } finally {
      setSaving(false);
    }
  };

  // ── Question CRUD ─────────────────────────────────────────
  const openAddQ = () => {
    setEditingId(null);
    setQForm(BLANK_Q);
    setModal("question");
  };
  const openEditQ = (id: string) => {
    const q = selectedSet.questions[id];
    setEditingId(id);
    setQForm({
      text: q.question,
      difficulty: q.difficulty,
      a: q.answers["a"] ?? "",
      b: q.answers["b"] ?? "",
      c: q.answers["c"] ?? "",
      d: q.answers["d"] ?? "",
      correct: (q.correctKey as "a" | "b" | "c" | "d") ?? "a",
    });
    setModal("question");
  };

  const saveQuestion = async () => {
    if (!qForm.text.trim() || !qForm.a.trim() || !qForm.b.trim() || saving)
      return;
    setSaving(true);
    try {
      const q: Question = {
        question: qForm.text,
        difficulty: qForm.difficulty,
        answers: { a: qForm.a, b: qForm.b, c: qForm.c, d: qForm.d },
        correctKey: qForm.correct,
      };
      const id = editingId ?? `q_${Date.now()}`;
      await api.put({
        knowledgeSets: { [selectedSetId]: { questions: { [id]: q } } },
      });
      setSets((prev) => ({
        ...prev,
        [selectedSetId]: {
          ...prev[selectedSetId],
          questions: { ...prev[selectedSetId].questions, [id]: q },
        },
      }));
      setModal("none");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteQ = (id: string) => {
    setPendingDeleteId(id);
    setModal("del-question");
  };
  const deleteQuestion = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const data = await api.getData();
      const qs = { ...data.knowledgeSets[selectedSetId].questions };
      delete qs[pendingDeleteId];
      const updatedSets = {
        ...data.knowledgeSets,
        [selectedSetId]: {
          ...data.knowledgeSets[selectedSetId],
          questions: qs,
        },
      };
      await api.putFull({ ...data, knowledgeSets: updatedSets });
      setSets((prev) => ({
        ...prev,
        [selectedSetId]: { ...prev[selectedSetId], questions: qs },
      }));
      setModal("none");
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    if (!saving) setModal("none");
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div
        style={{
          height: "100%",
          background: "#FFFBEA",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 16px 12px",
            background: "#FFD600",
            borderBottom: "3px solid #F5A800",
            gap: 8,
          }}
        >
          <motion.button
            onPointerDown={() => {
              audio.play("button-back");
              if (screen === "questions") setScreen("sets");
              else navigate("/menu");
            }}
            whileTap={{ scale: 0.9 }}
            style={{ background: "none", color: "#3E2000" }}
          >
            <ArrowLeft size={22} />
          </motion.button>

          <div
            style={{
              flex: 1,
              fontSize: 17,
              fontWeight: 800,
              color: "#3E2000",
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
            }}
          >
            <GraduationCap size={20} />
            {screen === "sets" ? (
              "Quản lý câu hỏi"
            ) : (
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {selectedSet?.topic}
              </span>
            )}
          </div>

          {screen === "questions" && (
            <span
              style={{
                background: "#3E2000",
                color: "#FFD600",
                borderRadius: 10,
                padding: "2px 10px",
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              Lớp {selectedSet?.grade}
            </span>
          )}
          <SettingsButton />
        </div>

        <AnimatePresence mode="wait">
          {/* ── SETS SCREEN ── */}
          {screen === "sets" && (
            <motion.div
              key="sets"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Grade filter */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "12px 16px 4px",
                  flexWrap: "wrap",
                }}
              >
                <Chip
                  label="Tất cả"
                  active={filterGrade === null}
                  onClick={() => setFilterGrade(null)}
                />
                {grades.map((g) => (
                  <Chip
                    key={g}
                    label={`Lớp ${g}`}
                    active={filterGrade === g}
                    onClick={() => setFilterGrade(g)}
                  />
                ))}
              </div>

              <div
                style={{
                  padding: "8px 16px 100px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {loading ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "#7D5A2C",
                      fontWeight: 600,
                    }}
                  >
                    Đang tải...
                  </div>
                ) : filteredSets.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "#7D5A2C",
                    }}
                  >
                    Chưa có bộ câu hỏi nào.
                    <br />
                    <span style={{ fontSize: 13 }}>Nhấn + để thêm mới</span>
                  </div>
                ) : (
                  filteredSets.map(([id, s], i) => {
                    const qCount = Object.keys(s.questions ?? {}).length;
                    return (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          background: "#FFFFFF",
                          border: "2px solid #FFD600",
                          borderRadius: 16,
                          padding: "12px 14px",
                          boxShadow: "0 3px 0 #F5A800",
                        }}
                      >
                        {/* Grade badge */}
                        <span
                          style={{
                            background: "#FFD600",
                            color: "#3E2000",
                            borderRadius: 10,
                            padding: "2px 9px",
                            fontSize: 12,
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          L{s.grade}
                        </span>

                        {/* Info — tap to open questions */}
                        <motion.button
                          onPointerDown={() => {
                            audio.play("button-click");
                            setSelectedSetId(id);
                            setScreen("questions");
                          }}
                          whileTap={{ scale: 0.98 }}
                          style={{
                            flex: 1,
                            textAlign: "left",
                            background: "none",
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 800,
                              color: "#3E2000",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.topic}
                          </div>
                          <div style={{ fontSize: 12, color: "#7D5A2C" }}>
                            {qCount} câu hỏi • {s.createdBy}
                          </div>
                        </motion.button>

                        <ChevronRight
                          size={16}
                          color="#BDBDBD"
                          style={{ flexShrink: 0 }}
                        />

                        {/* Actions */}
                        <IconBtn
                          icon={Pencil}
                          color="#3E2000"
                          bg="#FFF3A3"
                          onClick={() => {
                            audio.play("button-click");
                            openEditSet(id);
                          }}
                        />
                        <IconBtn
                          icon={Trash2}
                          color="#FF5722"
                          bg="#FBE9E7"
                          onClick={() => {
                            audio.play("button-click");
                            confirmDeleteSet(id);
                          }}
                        />
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* ── QUESTIONS SCREEN ── */}
          {screen === "questions" && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={{ flex: 1, overflowY: "auto" }}
            >
              <div
                style={{
                  padding: "12px 16px 100px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {questions.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "#7D5A2C",
                    }}
                  >
                    Bộ này chưa có câu hỏi.
                    <br />
                    <span style={{ fontSize: 13 }}>Nhấn + để thêm</span>
                  </div>
                ) : (
                  questions.map(([id, q], i) => {
                    const dm = DIFF_META[q.difficulty];
                    return (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        style={{
                          background: "#FFFFFF",
                          border: "2px solid #FFD600",
                          borderRadius: 14,
                          padding: "12px 14px",
                          boxShadow: "0 2px 0 #F5A800",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: "#7D5A2C",
                              flexShrink: 0,
                              paddingTop: 2,
                            }}
                          >
                            #{i + 1}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: "#3E2000",
                                lineHeight: 1.4,
                              }}
                            >
                              {q.question}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                marginTop: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: dm.color,
                                  background: dm.bg,
                                  border: `1.5px solid ${dm.color}`,
                                  borderRadius: 8,
                                  padding: "2px 8px",
                                }}
                              >
                                {dm.label}
                              </span>
                              {ANS_KEYS.map((k) =>
                                q.answers[k] ? (
                                  <span
                                    key={k}
                                    style={{
                                      fontSize: 11,
                                      color:
                                        k === q.correctKey
                                          ? "#4CAF50"
                                          : "#7D5A2C",
                                      background:
                                        k === q.correctKey
                                          ? "#E8F5E9"
                                          : "#F5F5F5",
                                      border: `1.5px solid ${k === q.correctKey ? "#4CAF50" : "#E0E0E0"}`,
                                      borderRadius: 8,
                                      padding: "2px 8px",
                                      fontWeight:
                                        k === q.correctKey ? 800 : 600,
                                    }}
                                  >
                                    {ANS_LABELS[ANS_KEYS.indexOf(k)]}.{" "}
                                    {q.answers[k]}
                                  </span>
                                ) : null,
                              )}
                            </div>
                          </div>
                          <div
                            style={{ display: "flex", gap: 6, flexShrink: 0 }}
                          >
                            <IconBtn
                              icon={Pencil}
                              color="#3E2000"
                              bg="#FFF3A3"
                              onClick={() => {
                                audio.play("button-click");
                                openEditQ(id);
                              }}
                            />
                            <IconBtn
                              icon={Trash2}
                              color="#FF5722"
                              bg="#FBE9E7"
                              onClick={() => {
                                audio.play("button-click");
                                confirmDeleteQ(id);
                              }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB */}
        <motion.button
          onPointerDown={() => {
            audio.play("button-click");
            screen === "sets" ? openAddSet() : openAddQ();
          }}
          whileTap={{ scale: 0.9 }}
          animate={{ scale: [1, 1.07, 1] }}
          transition={{ repeat: Infinity, duration: 2.8, repeatDelay: 2 }}
          style={{
            position: "absolute",
            bottom: 24,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#FFD600",
            border: "3px solid #F5A800",
            boxShadow: "0 5px 0 #C17F00",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#3E2000",
          }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </motion.button>

        {/* ── MODALS ── */}
        <AnimatePresence>
          {modal !== "none" && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onPointerDown={closeModal}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 50,
                background: "rgba(62,32,0,0.45)",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: 640,
                  background: "#FFFBEA",
                  borderRadius: "24px 24px 0 0",
                  border: "3px solid #FFD600",
                  borderBottom: "none",
                  padding: "20px 20px 44px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  maxHeight: "88vh",
                  overflowY: "auto",
                }}
              >
                {/* Set form */}
                {modal === "set" && (
                  <>
                    <SheetHeader
                      title={
                        editingId ? "Chỉnh sửa bộ câu hỏi" : "Thêm bộ câu hỏi"
                      }
                      onClose={closeModal}
                    />

                    <FormLabel>Lớp</FormLabel>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {GRADES.map((g) => (
                        <Chip
                          key={g}
                          label={`Lớp ${g}`}
                          active={setForm.grade === g}
                          onClick={() =>
                            setSetForm((f) => ({ ...f, grade: g }))
                          }
                        />
                      ))}
                    </div>

                    <FormLabel>Chủ đề / Tên bộ</FormLabel>
                    <input
                      value={setForm.topic}
                      onChange={(e) =>
                        setSetForm((f) => ({ ...f, topic: e.target.value }))
                      }
                      placeholder="VD: Phép cộng trong phạm vi 10"
                      style={inputStyle}
                    />

                    <SaveBtn
                      onClick={saveSet}
                      saving={saving}
                      disabled={!setForm.topic.trim()}
                      label={editingId ? "Lưu thay đổi" : "Thêm bộ câu hỏi"}
                    />
                  </>
                )}

                {/* Question form */}
                {modal === "question" && (
                  <>
                    <SheetHeader
                      title={editingId ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi"}
                      onClose={closeModal}
                    />

                    <FormLabel>Câu hỏi</FormLabel>
                    <textarea
                      value={qForm.text}
                      onChange={(e) =>
                        setQForm((f) => ({ ...f, text: e.target.value }))
                      }
                      placeholder="Nhập nội dung câu hỏi..."
                      rows={3}
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                        lineHeight: 1.5,
                      }}
                    />

                    <FormLabel>Độ khó</FormLabel>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(
                        Object.entries(DIFF_META) as Array<
                          [keyof typeof DIFF_META, (typeof DIFF_META)["easy"]]
                        >
                      ).map(([k, dm]) => (
                        <motion.button
                          key={k}
                          whileTap={{ scale: 0.95 }}
                          onPointerDown={() =>
                            setQForm((f) => ({ ...f, difficulty: k }))
                          }
                          style={{
                            flex: 1,
                            padding: "2px 0",
                            borderRadius: 12,
                            fontFamily: "'Baloo 2', cursive",
                            fontSize: 13,
                            fontWeight: 700,
                            background:
                              qForm.difficulty === k ? dm.bg : "#FFFFFF",
                            border: `2px solid ${qForm.difficulty === k ? dm.color : "#E0E0E0"}`,
                            color:
                              qForm.difficulty === k ? dm.color : "#7D5A2C",
                            boxShadow:
                              qForm.difficulty === k
                                ? `0 2px 0 ${dm.color}`
                                : "none",
                          }}
                        >
                          {dm.label}
                        </motion.button>
                      ))}
                    </div>

                    <FormLabel>
                      Các đáp án{" "}
                      <span
                        style={{
                          fontSize: 11,
                          color: "#7D5A2C",
                          fontWeight: 400,
                        }}
                      >
                        (tick ✓ để chọn đáp án đúng)
                      </span>
                    </FormLabel>
                    <div
                      style={{
                        // TODO: overflow y theo từng item 1
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        overflow: "auto",
                      }}
                    >
                      {ANS_KEYS.map((k, i) => (
                        <div
                          key={k}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onPointerDown={() =>
                              setQForm((f) => ({ ...f, correct: k }))
                            }
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              flexShrink: 0,
                              background:
                                qForm.correct === k ? "#4CAF50" : "#FFFFFF",
                              border: `2px solid ${qForm.correct === k ? "#4CAF50" : "#BDBDBD"}`,
                              color:
                                qForm.correct === k ? "#FFFFFF" : "#BDBDBD",
                              fontWeight: 800,
                              fontSize: 14,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {ANS_LABELS[i]}
                          </motion.button>
                          <input
                            value={qForm[k]}
                            onChange={(e) =>
                              setQForm((f) => ({ ...f, [k]: e.target.value }))
                            }
                            placeholder={`Đáp án ${ANS_LABELS[i]}`}
                            style={{ ...inputStyle, flex: 1, margin: 0 }}
                          />
                        </div>
                      ))}
                    </div>

                    <SaveBtn
                      onClick={saveQuestion}
                      saving={saving}
                      disabled={
                        !qForm.text.trim() || !qForm.a.trim() || !qForm.b.trim()
                      }
                      label={editingId ? "Lưu thay đổi" : "Thêm câu hỏi"}
                    />
                  </>
                )}

                {/* Delete set confirm */}
                {modal === "del-set" && (
                  <ConfirmDelete
                    message={`Xoá bộ "${sets[pendingDeleteId]?.topic}"? Tất cả câu hỏi trong bộ cũng bị xoá.`}
                    onConfirm={deleteSet}
                    onCancel={closeModal}
                    saving={saving}
                  />
                )}

                {/* Delete question confirm */}
                {modal === "del-question" && (
                  <ConfirmDelete
                    message={`Xoá câu hỏi này?`}
                    onConfirm={deleteQuestion}
                    onCancel={closeModal}
                    saving={saving}
                  />
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onPointerDown={onClick}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: "6px 14px",
        borderRadius: 20,
        fontFamily: "'Baloo 2', cursive",
        background: active ? "#FFD600" : "#FFFFFF",
        border: `2px solid ${active ? "#F5A800" : "#FFD600"}`,
        boxShadow: active ? "0 3px 0 #C17F00" : "none",
        fontSize: 13,
        fontWeight: 700,
        color: "#3E2000",
      }}
    >
      {label}
    </motion.button>
  );
}

function IconBtn({
  icon: Icon,
  color,
  bg,
  onClick,
}: {
  icon: typeof Pencil;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      onPointerDown={onClick}
      whileTap={{ scale: 0.88 }}
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        flexShrink: 0,
        background: bg,
        border: `1.5px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
      }}
    >
      <Icon size={15} />
    </motion.button>
  );
}

function SheetHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, color: "#3E2000" }}>
        {title}
      </div>
      <motion.button
        onPointerDown={onClose}
        whileTap={{ scale: 0.9 }}
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "#FBE9E7",
          border: "2px solid #FF5722",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FF5722",
        }}
      >
        <X size={16} />
      </motion.button>
    </div>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: "#7D5A2C",
        marginBottom: -6,
      }}
    >
      {children}
    </div>
  );
}

function SaveBtn({
  onClick,
  saving,
  disabled,
  label,
}: {
  onClick: () => void;
  saving: boolean;
  disabled: boolean;
  label: string;
}) {
  return (
    <motion.button
      onPointerDown={onClick}
      whileTap={{ y: 3, boxShadow: "none" }}
      disabled={disabled || saving}
      style={{
        width: "100%",
        padding: "14px 0",
        borderRadius: 16,
        background: disabled || saving ? "#E0E0E0" : "#FFD600",
        border: `3px solid ${disabled || saving ? "#BDBDBD" : "#F5A800"}`,
        boxShadow: disabled || saving ? "none" : "0 4px 0 #C17F00",
        fontSize: 16,
        fontWeight: 800,
        color: disabled || saving ? "#9E9E9E" : "#3E2000",
        fontFamily: "'Baloo 2', cursive",
        marginTop: 4,
      }}
    >
      {saving ? "Đang lưu..." : label}
    </motion.button>
  );
}

function ConfirmDelete({
  message,
  onConfirm,
  onCancel,
  saving,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        alignItems: "center",
        padding: "8px 0",
      }}
    >
      <AlertTriangle size={48} color="#FF8C00" />
      <div
        style={{
          textAlign: "center",
          fontSize: 15,
          fontWeight: 700,
          color: "#3E2000",
          lineHeight: 1.5,
        }}
      >
        {message}
      </div>
      <motion.button
        onPointerDown={onConfirm}
        whileTap={{ y: 3 }}
        disabled={saving}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 16,
          background: "#FF5722",
          border: "3px solid #BF360C",
          boxShadow: "0 4px 0 #BF360C",
          fontSize: 16,
          fontWeight: 800,
          color: "#FFFFFF",
          fontFamily: "'Baloo 2', cursive",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Trash2 size={18} /> {saving ? "Đang xoá..." : "Xoá"}
      </motion.button>
      <motion.button
        onPointerDown={onCancel}
        whileTap={{ y: 3 }}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 16,
          background: "#FFD600",
          border: "3px solid #F5A800",
          boxShadow: "0 4px 0 #C17F00",
          fontSize: 16,
          fontWeight: 800,
          color: "#3E2000",
          fontFamily: "'Baloo 2', cursive",
        }}
      >
        Huỷ
      </motion.button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "2px 8px",
  background: "#FFFFFF",
  border: "2px solid #FFD600",
  borderRadius: 12,
  fontSize: 15,
  color: "#3E2000",
  fontFamily: "'Baloo 2', cursive",
  outline: "none",
  boxSizing: "border-box",
};
