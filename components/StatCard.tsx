interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  color?: string;
}

export default function StatCard({ label, value, sublabel, color }: StatCardProps) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-surface p-3">
      <span className="text-xs text-muted">{label}</span>
      <span
        className="text-2xl font-bold"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
      {sublabel && <span className="text-[10px] text-muted">{sublabel}</span>}
    </div>
  );
}
