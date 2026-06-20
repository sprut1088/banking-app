export default function DataTable({ className = '', children, ...props }) {
  return (
    <div className="ui-table-wrap">
      <table className={`ui-table ${className}`.trim()} {...props}>
        {children}
      </table>
    </div>
  );
}
