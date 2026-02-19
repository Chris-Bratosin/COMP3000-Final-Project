import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, ArrowUp, ArrowDown, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

interface LogEntry {
  id: string;
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  event: string;
  awsService: string;
  hasWarning: boolean;
}

const logEntries: LogEntry[] = [
  {
    id: '1',
    time: '12:04 AM',
    level: 'INFO',
    event: 'Scan started',
    awsService: 'AWS S3',
    hasWarning: false,
  },
  {
    id: '2',
    time: '12:03 AM',
    level: 'WARN',
    event: 'Testing policy Bucket "my-bucket"',
    awsService: 'AWS S3, 2C2',
    hasWarning: true,
  },
  {
    id: '3',
    time: '12:03 AM',
    level: 'WARN',
    event: 'AdminRole - Weak IAM policy detected.',
    awsService: 'AWS S3, iC1',
    hasWarning: true,
  },
  {
    id: '4',
    time: '12:03 AM',
    level: 'WARN',
    event: 'Readily Secrets bucket accessible.',
    awsService: 'AWS IAM',
    hasWarning: true,
  },
  {
    id: '5',
    time: '12:03 AM',
    level: 'WARN',
    event: 'Broken access control.',
    awsService: 'AWS S3',
    hasWarning: true,
  },
  {
    id: '6',
    time: '12:03 AM',
    level: 'WARN',
    event: 'Security misconfiguration detected.',
    awsService: 'AWS IAM',
    hasWarning: true,
  },
  {
    id: '7',
    time: '12:03 AM',
    level: 'ERROR',
    event: 'Full AWS Environment Scan',
    awsService: 'Secrets Manager',
    hasWarning: true,
  },
];

const levelColors = {
  INFO: 'bg-[#5fa75f]',
  WARN: 'bg-[#f9a825]',
  ERROR: 'bg-[#e74c4c]',
};

const levelDarkColors = {
  INFO: 'bg-[#5fa75f]',
  WARN: 'bg-[#f9a825]',
  ERROR: 'bg-[#5a6d8c]',
};

export function Logs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[#2c4564] text-2xl font-semibold">Logs</h1>
        <div className="relative w-[300px]">
          <Input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-gray-300"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        </div>
      </div>

      <div className="bg-white rounded-lg p-6">
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <Select defaultValue="all-levels">
            <SelectTrigger className="w-[200px] bg-white border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-levels">All Levels</SelectItem>
              <SelectItem value="info">INFO</SelectItem>
              <SelectItem value="warn">WARN</SelectItem>
              <SelectItem value="error">ERROR</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all-services">
            <SelectTrigger className="w-[200px] bg-white border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-services">All Services</SelectItem>
              <SelectItem value="s3">AWS S3</SelectItem>
              <SelectItem value="iam">AWS IAM</SelectItem>
              <SelectItem value="secrets">Secrets Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[150px_150px_60px_1fr_200px] gap-4 px-4 py-3 bg-[#e8ecf1] rounded-t-lg border-b">
          <div className="flex items-center gap-2 text-[#4a5d7a] text-sm font-medium">
            Time
            <button onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}>
              {sortDirection === 'asc' ? (
                <ArrowUp size={16} className="text-[#4a7bbd]" />
              ) : (
                <ArrowDown size={16} className="text-[#4a7bbd]" />
              )}
            </button>
          </div>
          <div className="text-[#4a5d7a] text-sm font-medium">Level</div>
          <div className="text-[#4a5d7a] text-sm font-medium"></div>
          <div className="text-[#4a5d7a] text-sm font-medium">Event</div>
          <div className="text-[#4a5d7a] text-sm font-medium">AWS Service</div>
        </div>

        {/* Table Body */}
        <div className="divide-y">
          {logEntries.map((entry, index) => (
            <div
              key={entry.id}
              className="grid grid-cols-[150px_150px_60px_1fr_200px] gap-4 px-4 py-4 hover:bg-gray-50 items-center"
            >
              <div className="text-[#4a5d7a] text-sm">{entry.time}</div>
              <div>
                <span
                  className={`${
                    index % 2 === 0 || entry.level === 'INFO'
                      ? levelColors[entry.level]
                      : levelDarkColors[entry.level]
                  } text-white text-xs px-3 py-1 rounded font-medium inline-block`}
                >
                  {entry.level}
                </span>
              </div>
              <div>
                {entry.hasWarning && (
                  <AlertTriangle className="text-[#f9a825]" size={20} />
                )}
              </div>
              <div className="text-[#4a5d7a] text-sm">{entry.event}</div>
              <div className="text-[#4a5d7a] text-sm flex items-center gap-1">
                {entry.awsService}
                {entry.awsService.includes(',') && (
                  <ArrowUp size={14} className="text-gray-400" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="text-[#4a5d7a] text-sm">
            Showing 1–8 of 68 entries
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded text-gray-400">
              <ChevronLeft size={18} />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded text-gray-400">
              <ChevronLeft size={18} />
            </button>
            
            <button className="px-3 py-1.5 bg-[#4a7bbd] text-white rounded text-sm">
              1
            </button>
            <button className="px-3 py-1.5 hover:bg-gray-100 rounded text-sm text-gray-600">
              2
            </button>
            <button className="px-3 py-1.5 hover:bg-gray-100 rounded text-sm text-gray-600">
              4
            </button>
            <button className="px-3 py-1.5 hover:bg-gray-100 rounded text-sm text-gray-600">
              5
            </button>

            <button className="p-2 hover:bg-gray-100 rounded text-gray-600">
              <ChevronRight size={18} />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded text-gray-600">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
