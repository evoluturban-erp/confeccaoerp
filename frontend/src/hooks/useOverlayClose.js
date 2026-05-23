import { useRef, useEffect } from 'react';

export function useOverlayClose(onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const mouseDownOnOverlay = useRef(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCloseRef.current?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return {
    onMouseDown: (e) => { mouseDownOnOverlay.current = e.target === e.currentTarget; },
    onMouseUp: (e) => {
      if (mouseDownOnOverlay.current && e.target === e.currentTarget) onCloseRef.current?.();
      mouseDownOnOverlay.current = false;
    },
  };
}
