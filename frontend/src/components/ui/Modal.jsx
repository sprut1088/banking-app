import { useEffect } from 'react';

export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="ui-modal-backdrop" onClick={onClose} role="presentation">
      <section className="ui-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={title || 'Dialog'}>
        {title && <h3>{title}</h3>}
        {children}
      </section>
    </div>
  );
}
