import { LANDING_FEATURES } from '@/features/marketing/constants';

export function FeaturesSection() {
  return (
    <section className="border-t border-border px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Features</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Attendance, members, payments, diet, and communication in one place.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LANDING_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="size-4" aria-hidden />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
