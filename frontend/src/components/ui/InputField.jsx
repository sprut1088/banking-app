export default function InputField({
  id,
  label,
  className = '',
  inputClassName = '',
  ...props
}) {
  return (
    <div className={`ui-field ${className}`.trim()}>
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} className={`ui-input ${inputClassName}`.trim()} {...props} />
    </div>
  );
}
