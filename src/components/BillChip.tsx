interface BillChipProps {
  label: string;
  amount: number;
  color?: string;
}

export function BillChip({ label, amount, color = 'bg-muted/80' }: BillChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full ${color} px-3 py-1 text-xs font-medium text-text`}
    >
      <span className="h-2 w-2 rounded-full bg-accent"></span>
      {label}: {amount}
    </span>
  );
}
