import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="w-full rounded-4xl p-8 text-center glass-panel sm:p-10">
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Page not found
        </h1>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-95"
            href="/"
          >
            Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}
