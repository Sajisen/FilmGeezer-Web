interface LoadingStateProps {
  title?: string
  message?: string
}

function LoadingState({
  title = 'Loading...',
  message = 'Please wait while we prepare the content.',
}: LoadingStateProps) {
  return (
    <div role="status" className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="h-10 w-10 animate-spin rounded-full border-4 border-sky-400 border-t-transparent motion-reduce:animate-none"
        />

        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{message}</p>
        </div>
      </div>
    </div>
  )
}

export default LoadingState