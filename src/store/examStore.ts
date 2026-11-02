import { create } from 'zustand';

export type AnswerStatus =
  | 'NOT_VISITED'
  | 'ANSWERED'
  | 'UNANSWERED'
  | 'MARKED_FOR_REVIEW'
  | 'ANSWERED_AND_MARKED';

export interface AnswerState {
  questionId: string;
  selectedOption: string | null;
  status: AnswerStatus;
  timeSpent: number;
}

export interface ExamQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  section: string;
  subject: string | null;
  chapter: string | null;
  questionType: string;
  marks: number;
  negativeMarks: number;
}

export interface ExamTemplateConfig {
  sections?: Array<{ name: string; questionCount?: number; marksPerQuestion?: number }>;
  virtualCalculatorEnabled?: boolean;
  proctoring?: { enableTabSwitchDetection?: boolean; maxViolations?: number };
}

export type SubmitReason = 'MANUAL' | 'TIMEOUT' | 'VIOLATIONS';

interface ExamState {
  attemptId: string | null;
  mode: 'CBT' | 'OMR';
  examCategory: string | null;
  templateConfig: ExamTemplateConfig | null;
  questions: ExamQuestion[];
  answers: Record<string, AnswerState>;
  currentQuestionIndex: number;
  activeSection: string | null;
  timeRemaining: number;
  isOnline: boolean;
  isSubmitting: boolean;
  submitReason: SubmitReason | null;
  violations: number;
  isCalculatorOpen: boolean;

  initializeExam: (opts: {
    attemptId: string;
    questions: ExamQuestion[];
    timeRemaining: number;
    mode?: 'CBT' | 'OMR';
    examCategory?: string;
    templateConfig?: ExamTemplateConfig | null;
    savedAnswers?: Record<string, Partial<AnswerState>>;
    violations?: number;
  }) => void;
  selectOption: (questionId: string, optionId: string) => void;
  toggleMultiOption: (questionId: string, optionId: string) => void;
  setTextAnswer: (questionId: string, value: string) => void;
  markForReview: (questionId: string) => void;
  clearSelection: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  setActiveSection: (sectionName: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  tick: () => void;
  setTimeRemaining: (seconds: number) => void;
  setOnlineStatus: (status: boolean) => void;
  setViolations: (count: number) => void;
  toggleCalculator: () => void;
  submitExam: (reason?: SubmitReason) => void;
  cancelSubmit: () => void;
}

const VALID_STATUSES: AnswerStatus[] = ['NOT_VISITED', 'ANSWERED', 'UNANSWERED', 'MARKED_FOR_REVIEW', 'ANSWERED_AND_MARKED'];

const isMarked = (s?: AnswerStatus) => s === 'MARKED_FOR_REVIEW' || s === 'ANSWERED_AND_MARKED';

/** Status after the selected value changes, preserving the review mark. */
const statusFor = (value: string | null, prev?: AnswerStatus): AnswerStatus =>
  value ? (isMarked(prev) ? 'ANSWERED_AND_MARKED' : 'ANSWERED') : isMarked(prev) ? 'MARKED_FOR_REVIEW' : 'UNANSWERED';

export const useExamStore = create<ExamState>((set, get) => {
  const setAnswer = (questionId: string, value: string | null) =>
    set((state) => {
      const current = state.answers[questionId];
      if (!current) return state;
      return {
        answers: {
          ...state.answers,
          [questionId]: { ...current, selectedOption: value, status: statusFor(value, current.status) },
        },
      };
    });

  return {
    attemptId: null,
    mode: 'CBT',
    examCategory: null,
    templateConfig: null,
    questions: [],
    answers: {},
    currentQuestionIndex: 0,
    activeSection: null,
    timeRemaining: 0,
    isOnline: true,
    isSubmitting: false,
    submitReason: null,
    violations: 0,
    isCalculatorOpen: false,

    initializeExam: ({ attemptId, questions, timeRemaining, mode = 'CBT', examCategory = 'GENERAL', templateConfig = null, savedAnswers = {}, violations = 0 }) => {
      const answers: Record<string, AnswerState> = {};
      questions.forEach((q, idx) => {
        const saved = savedAnswers[q.id];
        const savedStatus = saved?.status && VALID_STATUSES.includes(saved.status) ? saved.status : undefined;
        answers[q.id] = {
          questionId: q.id,
          selectedOption: saved?.selectedOption ?? null,
          status: savedStatus ?? (saved?.selectedOption ? 'ANSWERED' : idx === 0 ? 'UNANSWERED' : 'NOT_VISITED'),
          timeSpent: saved?.timeSpent ?? 0,
        };
      });
      if (questions[0] && answers[questions[0].id].status === 'NOT_VISITED') {
        answers[questions[0].id].status = 'UNANSWERED';
      }

      set({
        attemptId,
        mode,
        examCategory,
        templateConfig,
        questions,
        answers,
        timeRemaining,
        currentQuestionIndex: 0,
        activeSection: questions[0]?.section ?? null,
        violations,
        isSubmitting: false,
        submitReason: null,
        isCalculatorOpen: false,
      });
    },

    selectOption: (questionId, optionId) => setAnswer(questionId, optionId),

    toggleMultiOption: (questionId, optionId) => {
      const current = get().answers[questionId]?.selectedOption;
      const picked = new Set((current || '').split(',').filter(Boolean));
      if (picked.has(optionId)) picked.delete(optionId);
      else picked.add(optionId);
      setAnswer(questionId, picked.size ? [...picked].sort().join(',') : null);
    },

    setTextAnswer: (questionId, value) => setAnswer(questionId, value.trim() ? value : null),

    markForReview: (questionId) =>
      set((state) => {
        const ans = state.answers[questionId];
        if (!ans) return state;
        const status: AnswerStatus = isMarked(ans.status)
          ? ans.selectedOption ? 'ANSWERED' : 'UNANSWERED'
          : ans.selectedOption ? 'ANSWERED_AND_MARKED' : 'MARKED_FOR_REVIEW';
        return { answers: { ...state.answers, [questionId]: { ...ans, status } } };
      }),

    clearSelection: (questionId) => setAnswer(questionId, null),

    goToQuestion: (index) => {
      const { questions, answers } = get();
      const target = questions[index];
      if (!target) return;
      const ans = answers[target.id];
      set({
        currentQuestionIndex: index,
        activeSection: target.section,
        answers: ans && ans.status === 'NOT_VISITED' ? { ...answers, [target.id]: { ...ans, status: 'UNANSWERED' } } : answers,
      });
    },

    setActiveSection: (sectionName) => {
      const idx = get().questions.findIndex((q) => q.section === sectionName);
      if (idx !== -1) get().goToQuestion(idx);
    },

    nextQuestion: () => {
      const { currentQuestionIndex, questions } = get();
      if (currentQuestionIndex < questions.length - 1) get().goToQuestion(currentQuestionIndex + 1);
    },

    prevQuestion: () => {
      const { currentQuestionIndex } = get();
      if (currentQuestionIndex > 0) get().goToQuestion(currentQuestionIndex - 1);
    },

    tick: () =>
      set((state) => {
        if (state.timeRemaining <= 0) return { timeRemaining: 0 };
        const active = state.questions[state.currentQuestionIndex];
        const ans = active ? state.answers[active.id] : undefined;
        return {
          timeRemaining: state.timeRemaining - 1,
          answers: ans ? { ...state.answers, [active.id]: { ...ans, timeSpent: ans.timeSpent + 1 } } : state.answers,
        };
      }),

    setTimeRemaining: (seconds) => set({ timeRemaining: Math.max(0, seconds) }),

    setOnlineStatus: (status) => set({ isOnline: status }),

    setViolations: (count) => set({ violations: count }),

    toggleCalculator: () => set((state) => ({ isCalculatorOpen: !state.isCalculatorOpen })),

    submitExam: (reason = 'MANUAL') => {
      if (get().isSubmitting) return;
      set({ isSubmitting: true, submitReason: reason });
    },

    cancelSubmit: () => set({ isSubmitting: false, submitReason: null }),
  };
});
