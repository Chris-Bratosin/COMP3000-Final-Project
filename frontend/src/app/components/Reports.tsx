import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, ArrowUp, ChevronDown, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface Report {
  id: string;
  date: string;
  name: string;
  issues: number;
  high: number;
  medium: number;
  downloadColor: 'green' | 'red';
}

const reports: Report[] = [
  {
    id: '1',
    date: 'May 23, 2020',
    name: 'AWS Security Audit',
    issues: 16,
    high: 8,
    medium: 7,
    downloadColor: 'green',
  },
  {
    id: '2',
    date: 'May 22, 2020',
    name: 'AWS Weekly Scan',
    issues: 21,
    high: 6,
    medium: 15,
    downloadColor: 'green',
  },
  {
    id: '3',
    date: 'May 21, 2020',
    name: 'AWS Environment Scan',
    issues: 26,
    high: 6,
    medium: 20,
    downloadColor: 'green',
  },
  {
    id: '4',
    date: 'May 14, 2020',
    name: 'AWS Weekly Scan',
    issues: 20,
    high: 7,
    medium: 13,
    downloadColor: 'red',
  },
  {
    id: '5',
    date: 'May 10, 2020',
    name: 'Full AWS Environment Scan',
    issues: 24,
    high: 6,
    medium: 18,
    downloadColor: 'red',
  },
];

export function Reports() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 5;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[#2c4564] text-2xl font-semibold">Reports</h1>
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
        <div className="relative mb-4">
          <Input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#f5f7fa] border-gray-300"
          />
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[180px_1fr_120px_120px_120px_180px] gap-4 px-4 py-3 bg-[#e8ecf1] rounded-t-lg border-b">
          <div className="flex items-center gap-2 text-[#4a5d7a] text-sm font-medium">
            Date
            <ArrowUp size={16} className="text-[#4a7bbd]" />
          </div>
          <div className="text-[#4a5d7a] text-sm font-medium"></div>
          <div className="flex items-center gap-2 text-[#4a5d7a] text-sm font-medium justify-center">
            Issues
            <ChevronDown size={16} />
          </div>
          <div className="flex items-center gap-2 text-[#4a5d7a] text-sm font-medium justify-center">
            High
            <ChevronDown size={16} />
          </div>
          <div className="flex items-center gap-2 text-[#4a5d7a] text-sm font-medium justify-center">
            Medium
            <ChevronDown size={16} />
          </div>
          <div className="text-[#4a5d7a] text-sm font-medium"></div>
        </div>

        {/* Table Body */}
        <div className="divide-y">
          {reports.map((report) => (
            <div
              key={report.id}
              className="grid grid-cols-[180px_1fr_120px_120px_120px_180px] gap-4 px-4 py-4 hover:bg-gray-50"
            >
              <div className="text-[#4a5d7a] text-sm">{report.date}</div>
              <div className="text-[#2c4564] text-sm font-medium">{report.name}</div>
              <div className="text-[#4a7bbd] text-xl font-semibold text-center">
                {report.issues}
              </div>
              <div className="text-[#e74c4c] text-xl font-semibold text-center">
                {report.high}
              </div>
              <div className="text-[#f9a825] text-xl font-semibold text-center">
                {report.medium}
              </div>
              <div className="flex items-center gap-2">
                <Button className="bg-[#4a7bbd] hover:bg-[#3d5a7e] text-white px-6 py-1.5 h-auto text-sm">
                  View
                </Button>
                <Button
                  className={`${
                    report.downloadColor === 'green'
                      ? 'bg-[#5fa75f] hover:bg-[#4e8f4e]'
                      : 'bg-[#e74c4c] hover:bg-[#d43d3d]'
                  } text-white p-2 h-auto`}
                >
                  <Download size={18} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
          <button className="p-2 hover:bg-gray-100 rounded text-gray-400">
            <ChevronLeft size={18} />
          </button>
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
  );
}
