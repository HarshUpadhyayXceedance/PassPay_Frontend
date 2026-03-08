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

let _showDialog: ((config: ShowDialogOptions) => void) | null = null;
let _hideDialog: (() => void) | null = null;

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

    setTimeout(() => setConfig(null), 300);
  }, []);


  _showDialog = showDialog;
  _hideDialog = hideDialog;

  return (
    <ConfirmDialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      <ConfirmDialog visible={visible} config={config} onDismiss={hideDialog} />
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  return useContext(ConfirmDialogContext);
}
