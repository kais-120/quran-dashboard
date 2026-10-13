export default function Field({ label, wide, children }) {
  return (
    <label className={'field' + (wide ? ' wide' : '')}>
      <span>{label}</span>
      {children}
    </label>
  );
}
