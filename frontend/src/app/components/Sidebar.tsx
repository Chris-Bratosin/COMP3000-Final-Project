import { Home, Settings, FileText, ScrollText, Info } from 'lucide-react';

interface SidebarProps {
  currentPage: 'dashboard' | 'settings' | 'reports' | 'logs' | 'about';
  onNavigate: (page: 'dashboard' | 'settings' | 'reports' | 'logs' | 'about') => void;
}

const navItems = [
  { icon: Home, label: 'Dashboard', page: 'dashboard' as const },
  { icon: Settings, label: 'Scan Settings', page: 'settings' as const },
  { icon: FileText, label: 'Reports', page: 'reports' as const },
  { icon: ScrollText, label: 'Logs', page: 'logs' as const },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <div className="w-[152px] bg-[#2c4564] flex flex-col h-screen">
      <div className="flex-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => onNavigate(item.page)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-[#3d5670] transition-colors ${
              currentPage === item.page ? 'bg-[#3d5670]' : ''
            }`}
          >
            <item.icon size={20} />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </div>
      <button 
        onClick={() => onNavigate('about')}
        className={`w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-[#3d5670] transition-colors mb-4 ${
          currentPage === 'about' ? 'bg-[#3d5670]' : ''
        }`}
      >
        <Info size={20} />
        <span className="text-sm">About</span>
      </button>
    </div>
  );
}