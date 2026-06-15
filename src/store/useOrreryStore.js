import { create } from 'zustand';

const EPHEMERIS_START = new Date('2010-01-01');
const EPHEMERIS_END = new Date('2035-12-31');

const clampDate = (date) => {
  if (date < EPHEMERIS_START) return new Date(EPHEMERIS_START);
  if (date > EPHEMERIS_END) return new Date(EPHEMERIS_END);
  return date;
};

const useOrreryStore = create((set) => ({
  showZodiac: true,
  showOrbits: true,
  showAspects: false,
  showMoon: true,
  showMinorBodies: false,
  activeDate: clampDate(new Date()),
  selectedBody: null,
  sidebarOpen: false,

  toggleZodiac: () => set((s) => ({ showZodiac: !s.showZodiac })),
  toggleOrbits: () => set((s) => ({ showOrbits: !s.showOrbits })),
  toggleAspects: () => set((s) => ({ showAspects: !s.showAspects })),
  toggleMoon: () => set((s) => ({ showMoon: !s.showMoon })),
  toggleMinorBodies: () => set((s) => ({ showMinorBodies: !s.showMinorBodies })),

  setDate: (date) => set({ activeDate: clampDate(new Date(date)) }),

  stepDate: (unit, direction) =>
    set((s) => {
      const d = new Date(s.activeDate);
      if (unit === 'day') d.setDate(d.getDate() + direction);
      else if (unit === 'month') d.setMonth(d.getMonth() + direction);
      else if (unit === 'year') d.setFullYear(d.getFullYear() + direction);
      return { activeDate: clampDate(d) };
    }),

  setToday: () => set({ activeDate: clampDate(new Date()) }),

  setSelectedBody: (body) =>
    set({ selectedBody: body, sidebarOpen: body !== null }),

  toggleSidebar: () =>
    set((s) => ({
      sidebarOpen: !s.sidebarOpen,
      selectedBody: s.sidebarOpen ? null : s.selectedBody,
    })),

  closeSidebar: () => set({ sidebarOpen: false, selectedBody: null }),
}));

export default useOrreryStore;
