import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { ConfirmDialog, ConfirmDialogConfig, ConfirmDialogButton } from "./ConfirmDialog";

type ShowDialogOptions = Omit<ConfirmDialogConfig, "buttons"> & {
  buttons: ConfirmDialogButton[];
};

interface ConfirmDialogContextValue {
  showDialog: (config: ShowDialogOptions) => void;
  hideDialog: () => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue>({
  showDialog: () => {},
  hideDialog: () => {},
});

// Singleton ref for imperative access outside React components
let _showDialog: ((config: ShowDialogOptions) => void) | null = null;
let _hideDialog: (() => void) | null = null;

/**
 * Imperative confirm dialog — can be called from anywhere (screens, utils, etc.)
 * Must have ConfirmDialogProvider mounted in the component tree.
 */
export function confirm(config: ShowDialogOptions) {
  if (_showDialog) {
    _showDialog(config);
  } else {
    console.warn("ConfirmDialogProvider not mounted. Falling back to console.");
  }
}

export function hideConfirm() {
  _hideDialog?.();
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ConfirmDialogConfig | null>(null);

  const showDialog = useCallback((options: ShowDialogOptions) => {
    setConfig(options);
    setVisible(true);
  }, []);

  const hideDialog = useCallback(() => {
    setVisible(false);
    // Delay clearing config to allow fade-out animation
    setTimeout(() => setConfig(null), 300);
  }, []);

  // Register singleton refs
  _showDialog = showDialog;
  _hideDialog = hideDialog;

  return (
    <ConfirmDialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      <ConfirmDialog visible={visible} config={config} onDismiss={hideDialog} />
    </ConfirmDialogContext.Provider>
  );
}

/**
 * Hook for accessing confirm dialog from React components.
 */
export function useConfirmDialog() {
  return useContext(ConfirmDialogContext);
}
