"use client";

import { useState, useCallback } from "react";

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    variant?: "default" | "destructive";
    resolve?: (value: boolean) => void;
  }>({ open: false, title: "" });

  const confirm = useCallback(
    (opts: {
      title: string;
      description?: string;
      confirmLabel?: string;
      variant?: "default" | "destructive";
    }) =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, open: true, resolve });
      }),
    []
  );

  const handleClose = useCallback(() => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false }));
  }, [state]);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false }));
  }, [state]);

  return {
    confirm,
    dialogProps: { ...state, onClose: handleClose, onConfirm: handleConfirm },
  };
}
