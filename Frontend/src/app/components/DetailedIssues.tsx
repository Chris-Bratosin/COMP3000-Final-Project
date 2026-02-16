import { Button } from './ui/button';

interface Issue {
  id: string;
  title: string;
  severity: 'High' | 'Medium';
}

const issues: Issue[] = [
  { id: '1', title: 'Public S3 Bucket', severity: 'High' },
  { id: '2', title: 'AdminRole - Weak IAM Policy', severity: 'High' },
  { id: '3', title: 'Open SSH Port (22)', severity: 'Medium' },
  { id: '4', title: 'Unencrypted Secret', severity: 'Medium' },
];

const severityColors = {
  High: 'bg-[#e74c4c]',
  Medium: 'bg-[#f9a825]',
};

export function DetailedIssues() {
  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-[#2c4564] font-semibold mb-4">Detailed Issues</h2>
      <div className="flex flex-col gap-2">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="flex items-center justify-between py-3 border-b last:border-b-0"
          >
            <div className="text-gray-700 text-sm">{issue.title}</div>
            <div className="flex items-center gap-3">
              <span
                className={`${
                  severityColors[issue.severity]
                } text-white text-xs px-3 py-1 rounded`}
              >
                {issue.severity}
              </span>
              <Button className="bg-[#2c4564] hover:bg-[#3d5670] text-white text-xs px-4 py-1.5 h-auto">
                View Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
