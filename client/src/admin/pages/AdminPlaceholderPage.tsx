export default function AdminPlaceholderPage({
  eyebrow,
  title,
  description,
  nextStep,
}: {
  eyebrow: string;
  title: string;
  description: string;
  nextStep: string;
}) {
  return (
    <section className="max-w-3xl rounded-3xl border border-white/9 bg-slate-900/62 p-6 shadow-xl shadow-black/10 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-400">{description}</p>
      <div className="mt-6 rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Planned next implementation
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{nextStep}</p>
      </div>
    </section>
  );
}