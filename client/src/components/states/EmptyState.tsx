interface EmptyStateProps {
  title?: string
  message?: string
}

function EmptyState({
  title = 'No results found',
  message = 'Try changing your search text or filters.',
}: EmptyStateProps) {
  return (
    <div role="status" className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-white">
      <h3 className="font-bold">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {message}
      </p>
    </div>
  )
}

export default EmptyState