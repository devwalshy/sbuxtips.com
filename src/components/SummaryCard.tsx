import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SummaryCardProps {
  label: string;
  value: string;
  icon: ReactNode;
}

export function SummaryCard({ label, value, icon }: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl border border-outline/60 bg-surface/80 p-6 shadow-elevation"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm uppercase tracking-wide text-text-muted">{label}</p>
          <p className="text-2xl font-semibold text-text">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}
