interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

function ErrorState({
  title = "Something went wrong",
  message = "We could not load the content. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-white">
      <h3 className="font-bold">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-red-100/80">{message}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export default ErrorState;
