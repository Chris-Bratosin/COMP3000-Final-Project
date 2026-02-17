import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'High Risk', value: 43.8, color: '#e74c4c' },
  { name: 'Medium Risk', value: 25.2, color: '#f9a825' },
  { name: 'Low Risk', value: 25.0, color: '#4caf50' },
  { name: '', value: 6.0, color: '#e74c4c' },
];

const COLORS = ['#e74c4c', '#f9a825', '#4caf50', '#e74c4c'];

const renderLabel = (entry: any) => {
  return `${entry.value}%`;
};

export function RiskOverview() {
  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-[#2c4564] font-semibold mb-4">Risk Overview</h2>
      <div className="flex items-center gap-8">
        <ResponsiveContainer width={250} height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#e74c4c]"></div>
            <span className="text-sm text-gray-700">High Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#f9a825]"></div>
            <span className="text-sm text-gray-700">Medium Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#4caf50]"></div>
            <span className="text-sm text-gray-700">Low Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
}
