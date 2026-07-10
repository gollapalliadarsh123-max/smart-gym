import { LANDING_TERMS } from '@/features/marketing/constants';

export function TermsSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Terms &amp; conditions</h2>
        <ul className="mt-6 space-y-3 text-muted-foreground">
          {LANDING_TERMS.map((term) => (
            <li key={term} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>{term}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted-foreground">
          By continuing to log in or sign up, you agree to these terms.
        </p>
      </div>
    </section>
  );
}
