import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-24 lg:px-8">
      <div className="text-center max-w-lg mx-auto">
        
        {/* Crisp, understated error code */}
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-500">
          404 Error
        </p>
        
        {/* Strong, standard typography */}
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Page not found
        </h1>
        
        <p className="mt-4 text-base leading-7 text-slate-400">
          The page you requested does not exist, may have been moved, 
          or the address may have been entered incorrectly.
        </p>

        {/* Standardized, professional button shapes (rounded-md instead of rounded-full) */}
        <div className="mt-8 flex items-center justify-center gap-x-4">
          <Link
            to="/"
            className="rounded-md bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Return to Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="rounded-md px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            Go back
          </button>
        </div>
        
      </div>
    </main>
  );
}