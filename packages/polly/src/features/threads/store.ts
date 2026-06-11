import { create } from 'zustand'

interface ThreadUiState {
  /** ID of the thread channel whose panel is currently open. null = panel closed. */
  openThreadId: string | null
  /** Parent channel that the open thread belongs to (for client navigation). */
  parentChannelId: string | null
  /** Когда != null — открыта inline-форма создания треда из конкретного сообщения. */
  creatingFor: { channelId: string; messageId: string; preview: string } | null
}

interface ThreadUiActions {
  open(threadId: string, parentChannelId: string): void
  close(): void
  startCreate(channelId: string, messageId: string, preview: string): void
  cancelCreate(): void
}

export const useThreadUi = create<ThreadUiState & ThreadUiActions>()((set) => ({
  openThreadId:    null,
  parentChannelId: null,
  creatingFor:     null,
  open(threadId, parentChannelId) { set({ openThreadId: threadId, parentChannelId, creatingFor: null }) },
  close() { set({ openThreadId: null, parentChannelId: null }) },
  startCreate(channelId, messageId, preview) { set({ creatingFor: { channelId, messageId, preview } }) },
  cancelCreate() { set({ creatingFor: null }) },
}))
