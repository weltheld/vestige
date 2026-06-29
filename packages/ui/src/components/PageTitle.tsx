export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl text-wine">{title}</h1>
      {subtitle && <p className="mt-1 font-body text-ink-soft">{subtitle}</p>}
    </div>
  );
}
