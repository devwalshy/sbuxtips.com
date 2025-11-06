import { motion } from 'framer-motion';
import { PartnerPayout, formatCurrency } from '../lib/tipjar';
import { BillChip } from './BillChip';

interface PartnerCardProps {
  partner: PartnerPayout;
  index: number;
}

const COLORS = ['bg-primary/10 text-primary', 'bg-secondary/10 text-secondary', 'bg-accent/10 text-accent'];

export function PartnerCard({ partner, index }: PartnerCardProps) {
  const color = COLORS[index % COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex flex-col gap-4 rounded-3xl border border-outline/60 bg-surface/70 p-6 shadow-elevation"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-text">{partner.name}</h3>
          <p className="text-sm text-text-muted">{partner.hours.toFixed(2)} hours</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
          Confidence {(partner.confidence * 100).toFixed(0)}%
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-text-muted">Payout</span>
        <span className="text-3xl font-semibold text-text">{formatCurrency(partner.payout)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <BillChip label="$20" amount={partner.bills.twenties} />
        <BillChip label="$5" amount={partner.bills.fives} />
        <BillChip label="$1" amount={partner.bills.ones} />
      </div>
    </motion.div>
  );
}
