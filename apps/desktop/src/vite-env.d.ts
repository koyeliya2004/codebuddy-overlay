/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    captureScreen: () => Promise<{ success: boolean; base64: string; preview: string; error?: string }>;
    minimizeApp: () => void;
    hideApp: () => void;
    closeApp: () => void;
    onTriggerCapture: (callback: () => void) => void;
    removeTriggerCapture: () => void;
  };
}
