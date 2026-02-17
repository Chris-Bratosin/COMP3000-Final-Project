import { Circle } from 'lucide-react';

interface Tip {
  id: string;
  text: string;
  color: 'green' | 'orange' | 'red';
}

const tips: Tip[] = [
  { id: '1', text: 'Secure S3 bucket settings.', color: 'green' },
  { id: '2', text: 'Restrict IAM policies.', color: 'green' },
  { id: '3', text: 'Close unnecessary open ports.', color: 'orange' },
  { id: '4', text: 'Encrypt sensitive secrets.', color: 'red' },
];

const colorClasses = {
  green: 'text-[#4caf50]',
  orange: 'text-[#f9a825]',
  red: 'text-[#e74c4c]',
};

export function RemediationTips() {
  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-[#2c4564] font-semibold mb-4">Remediation Tips</h2>
      <div className="flex flex-col gap-3">
        {tips.map((tip) => (
          <div key={tip.id} className="flex items-center gap-3">
            <Circle
              className={colorClasses[tip.color]}
              size={12}
              fill="currentColor"
            />
            <span className="text-gray-700 text-sm">{tip.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
