"use client";

import type { PlayerRef } from "@remotion/player";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type EditorPlayerContextValue = {
  playerRef: React.RefObject<PlayerRef | null>;
  player: PlayerRef | null;
  registerPlayer: (player: PlayerRef | null) => void;
  editingTextId: string | null;
  startInlineTextEdit: (textId: string) => void;
  stopInlineTextEdit: () => void;
};

const EditorPlayerContext = createContext<EditorPlayerContextValue | null>(null);

export function EditorPlayerProvider(props: { children: React.ReactNode }) {
  const playerRef = useRef<PlayerRef | null>(null);
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const registerPlayer = useCallback((next: PlayerRef | null) => {
    playerRef.current = next;
    setPlayer(next);
  }, []);

  const startInlineTextEdit = useCallback((textId: string) => {
    setEditingTextId(textId);
  }, []);

  const stopInlineTextEdit = useCallback(() => {
    setEditingTextId(null);
  }, []);

  const value = useMemo(
    () => ({
      playerRef,
      player,
      registerPlayer,
      editingTextId,
      startInlineTextEdit,
      stopInlineTextEdit,
    }),
    [editingTextId, player, registerPlayer, startInlineTextEdit, stopInlineTextEdit],
  );

  return (
    <EditorPlayerContext.Provider value={value}>
      {props.children}
    </EditorPlayerContext.Provider>
  );
}

export function useEditorPlayer() {
  const value = useContext(EditorPlayerContext);
  if (!value) {
    throw new Error("useEditorPlayer must be used within EditorPlayerProvider");
  }
  return value;
}
