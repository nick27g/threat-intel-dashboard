type Source = 'NVD' | 'CISA KEV' | 'CISA Advisory';

const styles: Record<Source, string> = {
  NVD: 'bg-blue-900/60 text-blue-300 border border-blue-700',
  'CISA KEV': 'bg-red-900/60 text-red-300 border border-red-700',
  'CISA Advisory': 'bg-amber-900/60 text-amber-300 border border-amber-700',
};

export function SourceBadge({ source }: { source: Source }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[source]}`}>
      {source}
    </span>
  );
}
