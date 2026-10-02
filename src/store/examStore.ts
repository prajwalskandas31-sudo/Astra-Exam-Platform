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

export interface ExamTemplateConfig {
  sections?: Array<{ name: string; questionCount?: number; marksPerQuestion?: number }>;
  virtualCalculatorEnabled?: boolean;
  proctoring?: { enableTabSwitchDetection?: boolean; maxViolations?: number };
}

interface ExamState {
  attemptId: string | null;
  mode: 'CBT' | 'OMR';
  examCategory: string | null;
  templateConfig: ExamTemplateConfig | null;
  questions: any[];
  answers: Record<string, AnswerState>;
  currentQuestionIndex: number;
  activeSection: string | null;
  timeRemaining: number;
  isOnline: boolean;
  isSubmitting: boolean;
  violations: number;
  isCalculatorOpen: boolean;

  // Actions
  initializeExam: (
    attemptId: string, 
    questions: any[], 
    durationSeconds: number, 
    mode?: 'CBT' | 'OMR', 
    examCategory?: string,
    templateConfig?: ExamTemplateConfig | null
  ) => void;
  selectOption: (questionId: string, optionId: string) => void;
  markForReview: (questionId: string) => void;
  clearSelection: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  setActiveSection: (sectionName: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  decrementTime: () => void;
  setOnlineStatus: (status: boolean) => void;
  logViolation: () => void;
  toggleCalculator: () => void;
  submitExam: () => void;
}

export const useExamStore = create<ExamState>((set, get) => ({
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
  violations: 0,
  isCalculatorOpen: false,

  initializeExam: (attemptId, questions, durationSeconds, mode = 'CBT', examCategory = 'GENERAL', templateConfig = null) => {
    const initialAnswers: Record<string, AnswerState> = {};
    questions.forEach((q, idx) => {
      initialAnswers[q.id] = {
        questionId: q.id,
        selectedOption: null,
        status: idx === 0 ? 'UNANSWERED' : 'NOT_VISITED',
        timeSpent: 0,
      };
    });

    const firstSection = questions[0]?.section || (templateConfig?.sections?.[0]?.name) || null;

    set({
      attemptId,
      mode,
      examCategory,
      templateConfig,
      questions,
      answers: initialAnswers,
      timeRemaining: durationSeconds,
      currentQuestionIndex: 0,
      activeSection: firstSection,
      violations: 0,
      isCalculatorOpen: false,
    });
  },

  selectOption: (questionId, optionId) => {
    set((state) => {
      const currentAns = state.answers[questionId];
      const isMarked = currentAns?.status === 'MARKED_FOR_REVIEW' || currentAns?.status === 'ANSWERED_AND_MARKED';
      const newStatus = isMarked ? 'ANSWERED_AND_MARKED' : 'ANSWERED';

      return {
        answers: {
          ...state.answers,
          [questionId]: {
            ...currentAns,
            selectedOption: optionId,
            status: newStatus,
          },
        },
      };
    });
  },

  markForReview: (questionId) => {
    if (!questionId) return;
    set((state) => {
      const ans = state.answers[questionId];
      if (!ans) return state;

      let newStatus: AnswerStatus = 'MARKED_FOR_REVIEW';
      if (ans.status === 'MARKED_FOR_REVIEW' || ans.status === 'ANSWERED_AND_MARKED') {
        newStatus = ans.selectedOption ? 'ANSWERED' : 'UNANSWERED';
      } else {
        newStatus = ans.selectedOption ? 'ANSWERED_AND_MARKED' : 'MARKED_FOR_REVIEW';
      }

      return {
        answers: {
          ...state.answers,
          [questionId]: {
            ...ans,
            status: newStatus,
          },
        },
      };
    });
  },

  clearSelection: (questionId) => {
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: {
          ...state.answers[questionId],
          selectedOption: null,
          status: 'UNANSWERED',
        },
      },
    }));
  },

  goToQuestion: (index) => {
    const { questions, answers } = get();
    const targetQ = questions[index];
    if (!targetQ) return;

    // Update status to UNANSWERED if it was NOT_VISITED
    const currentAns = answers[targetQ.id];
    const updatedAnswers = { ...answers };
    if (currentAns && currentAns.status === 'NOT_VISITED') {
      updatedAnswers[targetQ.id] = { ...currentAns, status: 'UNANSWERED' };
    }

    set({
      currentQuestionIndex: index,
      activeSection: targetQ.section || get().activeSection,
      answers: updatedAnswers,
    });
  },

  setActiveSection: (sectionName) => {
    const { questions } = get();
    const targetIdx = questions.findIndex(q => q.section === sectionName);
    if (targetIdx !== -1) {
      get().goToQuestion(targetIdx);
    } else {
      set({ activeSection: sectionName });
    }
  },

  nextQuestion: () => {
    const { currentQuestionIndex, questions } = get();
    if (currentQuestionIndex < questions.length - 1) {
      get().goToQuestion(currentQuestionIndex + 1);
    }
  },

  prevQuestion: () => {
    const { currentQuestionIndex } = get();
    if (currentQuestionIndex > 0) {
      get().goToQuestion(currentQuestionIndex - 1);
    }
  },

  decrementTime: () => {
    set((state) => {
      if (state.timeRemaining <= 0) {
        return { timeRemaining: 0 };
      }

      // Increment time spent on active question
      const activeQ = state.questions[state.currentQuestionIndex];
      let updatedAnswers = state.answers;

      if (activeQ && updatedAnswers[activeQ.id]) {
        updatedAnswers = {
          ...updatedAnswers,
          [activeQ.id]: {
            ...updatedAnswers[activeQ.id],
            timeSpent: (updatedAnswers[activeQ.id].timeSpent || 0) + 1,
          },
        };
      }

      return {
        timeRemaining: state.timeRemaining - 1,
        answers: updatedAnswers,
      };
    });
  },

  setOnlineStatus: (status) => set({ isOnline: status }),

  logViolation: () => set((state) => ({ violations: state.violations + 1 })),

  toggleCalculator: () => set((state) => ({ isCalculatorOpen: !state.isCalculatorOpen })),

  submitExam: () => set({ isSubmitting: true }),
}));
