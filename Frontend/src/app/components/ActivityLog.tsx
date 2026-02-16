interface LogEntry {
  id: string;
  time: string;
  message: string;
}

const logEntries: LogEntry[] = [
  { id: '1', time: '12:58 PM', message: 'Scan started' },
  { id: '2', time: '12:59 PM', message: 'S3 bucket "my-bucket" found to be public.' },
  { id: '3', time: '1:02 PM', message: 'AdminRole policy detected with excessive permissions.' },
];

export function ActivityLog() {
  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-[#2c4564] font-semibold mb-4">Activity Log</h2>
      <div className="flex flex-col">
        {logEntries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-6 py-2.5 border-b last:border-b-0"
          >
            <span className="text-gray-600 text-sm w-20 flex-shrink-0">
              {entry.time}
            </span>
            <span className="text-gray-600 text-sm w-4 flex-shrink-0">|</span>
            <span className="text-gray-700 text-sm flex-1">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
