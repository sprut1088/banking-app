export function Toast({ tone = 'info', title, message }) {
  return (
    <article className={`ui-toast ui-toast--${tone}`} role="status" aria-live="polite">
      {title && <h4 className="ui-toast-title">{title}</h4>}
      {message && <p className="ui-toast-body">{message}</p>}
    </article>
  );
}

export function ToastStack({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="ui-toast-stack">
      {items.map((item) => (
        <Toast
          key={item.id}
          tone={item.tone}
          title={item.title}
          message={item.message}
        />
      ))}
    </div>
  );
}
