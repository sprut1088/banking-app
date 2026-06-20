export default function Card({
  as: Component = 'article',
  title,
  subtitle,
  className = '',
  children,
  ...props
}) {
  return (
    <Component className={`ui-card ${className}`.trim()} {...props}>
      {(title || subtitle) && (
        <header className="ui-card__header">
          {title && <h3 className="ui-card__title">{title}</h3>}
          {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
        </header>
      )}
      <div className="ui-card__body">{children}</div>
    </Component>
  );
}
