'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useEffect, useRef } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  // Keep a stable ref to onClose so popstate handler always calls latest version
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  // Track whether WE triggered history.back() so popstate doesn't double-fire
  const closingRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // Push a modal marker so the device back button "pops" this sheet
    window.history.pushState({ sheet: true }, '');

    const handlePop = () => {
      if (!closingRef.current) {
        onCloseRef.current();
      }
      closingRef.current = false;
    };

    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
    };
  }, [open]);

  // Called by X button and backdrop click
  const handleClose = () => {
    if (window.history.state?.sheet) {
      closingRef.current = true;
      window.history.back(); // pops the modal history entry
    }
    onCloseRef.current();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(10,24,10,0.45)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />

          <div
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              display: 'flex', justifyContent: 'center',
              zIndex: 201,
              pointerEvents: 'none',
            }}
          >
            {/* ── Animated panel ── */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 42 }}
              style={{
                width: '100%',
                maxWidth: 480,
                pointerEvents: 'auto',
                background: '#FFFFFF',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                borderTop: '1px solid #E8F3E4',
                boxShadow: '0 -8px 40px rgba(27,51,32,0.14)',
                maxHeight: '90dvh',
                display: 'flex',
                flexDirection: 'column',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              {/* Drag handle */}
              <div style={{
                display: 'flex', justifyContent: 'center',
                padding: '12px 0 6px', flexShrink: 0,
              }}>
                <div style={{ width: 38, height: 4, borderRadius: 2, background: '#D9EDD4' }} />
              </div>

              {/* Header row */}
              {title && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '4px 20px 12px', flexShrink: 0,
                  borderBottom: '1px solid #F0FAF0',
                }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#111B11' }}>{title}</h3>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={handleClose}
                    style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: '#F4FAF1', border: '1px solid #E0EDD8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', outline: 'none', flexShrink: 0,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1l10 10M11 1L1 11" stroke="#4A5D4A" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Scrollable content */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch' as never,
                padding: '16px 20px 28px',
              }}>
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
