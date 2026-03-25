import { create } from 'zustand';

interface AppPermissionsState {
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useAppPermissionsStore = create<AppPermissionsState>((set) => ({
  modalOpen: false,
  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),
}));
