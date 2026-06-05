import { useEffect, useReducer } from 'react';
import type {
  RuntimeChatMessage,
  RuntimeStatus,
  WorkbenchRuntimeEvent,
  WorkbenchRuntimeListener,
} from '@workbench-kit/runtime';

interface ChatRuntimeState {
  messages: RuntimeChatMessage[];
  status: RuntimeStatus;
}

function chatRuntimeReducer(
  state: ChatRuntimeState,
  action: WorkbenchRuntimeEvent,
): ChatRuntimeState {
  if (action.type === 'message') {
    const exists = state.messages.some((m) => m.id === action.message.id);
    return {
      ...state,
      messages: exists
        ? state.messages.map((m) => (m.id === action.message.id ? action.message : m))
        : [...state.messages, action.message],
    };
  }

  if (action.type === 'message-delta') {
    const exists = state.messages.some((m) => m.id === action.message.id);
    return {
      ...state,
      messages: exists
        ? state.messages.map((m) => (m.id === action.message.id ? action.message : m))
        : [...state.messages, action.message],
    };
  }

  if (action.type === 'status') {
    return { ...state, status: action.status };
  }

  return state;
}

const INITIAL_STATE: ChatRuntimeState = {
  messages: [],
  status: 'idle',
};

export interface UseChatRuntimeStateInput {
  subscribe: (listener: WorkbenchRuntimeListener) => () => void;
}

export interface UseChatRuntimeStateResult {
  isStreaming: boolean;
  messages: RuntimeChatMessage[];
  status: RuntimeStatus;
}

export function useChatRuntimeState({
  subscribe,
}: UseChatRuntimeStateInput): UseChatRuntimeStateResult {
  const [state, dispatch] = useReducer(chatRuntimeReducer, INITIAL_STATE);

  useEffect(() => {
    return subscribe((event) => {
      dispatch(event);
    });
  }, [subscribe]);

  return {
    isStreaming: state.status === 'running',
    messages: state.messages,
    status: state.status,
  };
}
