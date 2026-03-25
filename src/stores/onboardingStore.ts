import { create } from 'zustand';
import { useAppPermissionsStore } from '@/stores/appPermissionsStore';

const STORAGE_KEY = 'erp-gw-onboarding-v1';

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function persistCompleted() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

interface OnboardingState {
  isActive: boolean;
  stepIndex: number;
  /** Call once on app mount — opens tour if user has not finished before */
  tryStartOnFirstVisit: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skip: () => void;
  complete: () => void;
  /** For future “Help” entry if you add it */
  restart: () => void;
}

/** Keep in sync with STEPS length in OnboardingTutorial.tsx */
export const ONBOARDING_STEP_COUNT = 11;

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  isActive: false,
  stepIndex: 0,

  tryStartOnFirstVisit: () => {
    if (hasCompletedOnboarding()) return;
    set({ isActive: true, stepIndex: 0 });
  },

  nextStep: () => {
    const { stepIndex } = get();
    if (stepIndex >= ONBOARDING_STEP_COUNT - 1) {
      get().complete();
      return;
    }
    set({ stepIndex: stepIndex + 1 });
  },

  prevStep: () => {
    const { stepIndex } = get();
    if (stepIndex <= 0) return;
    set({ stepIndex: stepIndex - 1 });
  },

  skip: () => {
    persistCompleted();
    set({ isActive: false, stepIndex: 0 });
    window.setTimeout(() => useAppPermissionsStore.getState().openModal(), 0);
  },

  complete: () => {
    persistCompleted();
    set({ isActive: false, stepIndex: 0 });
    window.setTimeout(() => useAppPermissionsStore.getState().openModal(), 0);
  },

  restart: () => {
    set({ isActive: true, stepIndex: 0 });
  },
}));
