export default function Badge({
  tone = 'neutral',
  className = '',
  children
}) {
  return <span className={`ui-badge ui-badge--${tone} ${className}`.trim()}>{children}</span>;
}
