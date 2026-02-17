interface MetricCardProps {
  label: string;
  value: number;
  color: 'blue' | 'red' | 'orange' | 'yellow';
}

const colorClasses = {
  blue: 'bg-[#4a7bbd]',
  red: 'bg-[#e74c4c]',
  orange: 'bg-[#f37d35]',
  yellow: 'bg-[#f9a825]',
};

export function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <div className={`${colorClasses[color]} rounded-lg px-6 py-4 min-w-[180px]`}>
      <div className="text-white text-sm mb-1">{label}</div>
      <div className="text-white text-4xl font-bold">{value}</div>
    </div>
  );
}
