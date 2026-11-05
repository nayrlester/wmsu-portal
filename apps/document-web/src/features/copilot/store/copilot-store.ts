import { create } from 'zustand'
import type {
  CopilotActivityEvent,
  CopilotMessage,
  CopilotPanelMode,
  CopilotSessionRef,
} from '@/features/copilot/types/copilot.types'

interface CopilotState {
  mode: CopilotPanelMode
  messages: CopilotMessage[]
  sessionRefs: CopilotSessionRef[]
  activityFeed: CopilotActivityEvent[]
  isSending: boolean
  historyOpen: boolean
  unreadActivity: number
  /** Tracks which user's conversation is loaded — cleared on user change */
  sessionOwnerId: string | null

  setMode: (mode: CopilotPanelMode) => void
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
  setFullscreen: (fullscreen: boolean) => void
  addMessage: (message: CopilotMessage) => void
  updateMessage: (id: string, patch: Partial<CopilotMessage>) => void
  setSessionRefs: (refs: CopilotSessionRef[]) => void
  setSending: (sending: boolean) => void
  clearConversation: () => void
  resetSession: () => void
  syncSessionOwner: (userId: string | null) => void
  setHistoryOpen: (open: boolean) => void
  pushActivity: (event: CopilotActivityEvent) => void
  markActivityRead: () => void
}

const initialCopilotState = {
  mode: 'minimized' as CopilotPanelMode,
  messages: [] as CopilotMessage[],
  sessionRefs: [] as CopilotSessionRef[],
  activityFeed: [] as CopilotActivityEvent[],
  isSending: false,
  historyOpen: false,
  unreadActivity: 0,
  sessionOwnerId: null as string | null,
}

export const useCopilotStore = create<CopilotState>((set, get) => ({
  ...initialCopilotState,

  setMode: (mode) => set({ mode }),
  togglePanel: () => {
    const { mode } = get()
    set({ mode: mode === 'minimized' ? 'panel' : 'minimized', historyOpen: false })
  },
  openPanel: () => set({ mode: 'panel', historyOpen: false }),
  closePanel: () => set({ mode: 'minimized', historyOpen: false }),
  setFullscreen: (fullscreen) => set({ mode: fullscreen ? 'fullscreen' : 'panel' }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, patch) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  setSessionRefs: (refs) => set({ sessionRefs: refs }),
  setSending: (sending) => set({ isSending: sending }),
  clearConversation: () => set({ messages: [], sessionRefs: [] }),
  resetSession: () => set({ ...initialCopilotState }),
  syncSessionOwner: (userId) => {
    const { sessionOwnerId } = get()
    if (sessionOwnerId === userId) return
    set({ ...initialCopilotState, sessionOwnerId: userId })
  },
  setHistoryOpen: (open) => set({ historyOpen: open }),
  pushActivity: (event) =>
    set((state) => ({
      activityFeed: [event, ...state.activityFeed].slice(0, 50),
      unreadActivity: state.mode === 'minimized' ? state.unreadActivity + 1 : state.unreadActivity,
    })),
  markActivityRead: () => set({ unreadActivity: 0 }),
}))
