import { XCircle, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface Finding {
  id: string;
  title: string;
  description: string;
  type: 'error' | 'warning';
}

const findings: Finding[] = [
  {
    id: '1',
    title: 'Public S3 Bucket Detected',
    description: 'Bucket "my-bucket" is publicly accessible.',
    type: 'error',
  },
  {
    id: '2',
    title: 'Weak IAM Policy',
    description: 'Overly permissive role: AdminRole.',
    type: 'error',
  },
  {
    id: '3',
    title: 'Open Security Group Port',
    description: 'Port 22 open to 0.0.0.0/0.',
    type: 'warning',
  },
  {
    id: '4',
    title: 'Unencrypted Secret Found',
    description: 'Plaintext secret in Secrets Manager.',
    type: 'warning',
  },
];

export function RecentFindings() {
  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-[#2c4564] font-semibold mb-4">Recent Findings</h2>
      <div className="flex flex-col gap-3">
        {findings.map((finding) => (
          <div
            key={finding.id}
            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
          >
            {finding.type === 'error' ? (
              <XCircle className="text-[#e74c4c] flex-shrink-0 mt-0.5" size={20} />
            ) : (
              <AlertTriangle className="text-[#f9a825] flex-shrink-0 mt-0.5" size={20} />
            )}
            <div className="flex-1">
              <div className="text-[#2c4564] font-semibold text-sm mb-1">
                {finding.title}
              </div>
              <div className="text-gray-600 text-sm">{finding.description}</div>
            </div>
            <Button
              className="bg-[#2c4564] hover:bg-[#3d5670] text-white text-xs px-4 py-1.5 h-auto"
            >
              View Details
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
