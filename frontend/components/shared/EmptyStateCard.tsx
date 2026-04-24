interface EmptyStateCardProps {
  title: string;
  message: string;
}

export function EmptyStateCard({ title, message }: EmptyStateCardProps) {
  return (
    <div className="rounded-[1.15rem] border border-dashed border-[#e1d3bd] bg-[#fcf8f2] px-5 py-8 text-center">
      <h3 className="text-base font-semibold text-[#433a30]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#8a7a67]">{message}</p>
    </div>
  );
}
