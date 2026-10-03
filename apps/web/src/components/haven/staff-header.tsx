export function StaffHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1>{title}</h1>
      {lead ? <p className="text-sm text-muted-foreground">{lead}</p> : null}
    </header>
  );
}
