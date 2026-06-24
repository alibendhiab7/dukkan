import { useEffect } from 'react';

interface KeyboardShortcuts {
  onNewSale?: () => void;
  onAddProduct?: () => void;
  onInventory?: () => void;
  onDashboard?: () => void;
  onReports?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        shortcuts.onNewSale?.();
      }
      if (e.key === 'F3') {
        e.preventDefault();
        shortcuts.onAddProduct?.();
      }
      if (e.key === 'F5') {
        e.preventDefault();
        shortcuts.onDashboard?.();
      }
      if (e.key === 'F6') {
        e.preventDefault();
        shortcuts.onInventory?.();
      }
      if (e.key === 'F7') {
        e.preventDefault();
        shortcuts.onReports?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
