import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { MetricCard } from './components/MetricCard';
import { RiskOverview } from './components/RiskOverview';
import { RecentFindings } from './components/RecentFindings';
import { DetailedIssues } from './components/DetailedIssues';
import { RemediationTips } from './components/RemediationTips';
import { ActivityLog } from './components/ActivityLog';
import { CloudIcon } from './components/CloudIcon';
import { ScanSettings } from './components/ScanSettings';
import { Reports } from './components/Reports';
import { Logs } from './components/Logs';
import { About } from './components/About';
import { Button } from './components/ui/button';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'settings' | 'reports' | 'logs' | 'about'>('dashboard');

  const getHeaderButtonText = () => {
    switch (currentPage) {
      case 'reports':
        return 'Generate Report';
      case 'logs':
        return 'Export Logs';
      case 'about':
        return 'About';
      default:
        return 'Run Scan';
    }
  };

  return (
    <div className="flex h-screen bg-[#e8ecf1]">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#3d5a7e] px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CloudIcon />
            <h1 className="text-white text-xl font-semibold">
              Cloud Misconfiguration Auditor
            </h1>
          </div>
          {currentPage !== 'about' && (
            <Button className="bg-[#5fa75f] hover:bg-[#4e8f4e] text-white px-6 py-2.5 rounded-md flex items-center gap-2">
              {getHeaderButtonText()}
              <ChevronRight size={18} />
            </Button>
          )}
          {currentPage === 'about' && (
            <Button className="bg-[#5fa75f] hover:bg-[#4e8f4e] text-white px-6 py-2.5 rounded-md flex items-center gap-2">
              About
              <ChevronRight size={18} />
            </Button>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {currentPage === 'dashboard' ? (
            <div className="p-6">
              {/* Metrics Row */}
              <div className="flex gap-4 mb-6">
                <MetricCard label="Total Checks" value={42} color="blue" />
                <MetricCard label="Issues Found" value={16} color="red" />
                <MetricCard label="High Risk" value={5} color="orange" />
                <MetricCard label="Medium Risk" value={7} color="yellow" />
              </div>

              {/* First Row: Risk Overview and Recent Findings */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <RiskOverview />
                <RecentFindings />
              </div>

              {/* Second Row: Detailed Issues and Remediation Tips */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <DetailedIssues />
                <RemediationTips />
              </div>

              {/* Activity Log */}
              <ActivityLog />
            </div>
          ) : currentPage === 'settings' ? (
            <ScanSettings />
          ) : currentPage === 'reports' ? (
            <Reports />
          ) : currentPage === 'logs' ? (
            <Logs />
          ) : (
            <About />
          )}
        </div>
      </div>
    </div>
  );
}