'use client';

import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LANDING_FEATURES } from '@/features/marketing/constants';

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export function FeaturesSection() {
  return (
    <section className="border-t border-border/60 bg-muted/20 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">All features</h2>
          <p className="mt-4 text-muted-foreground">
            Everything your gym needs — from check-ins to global leaderboards — in one platform.
          </p>
        </div>

        <motion.div
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {LANDING_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title} variants={item}>
                <Card className="h-full border-border/60 bg-card/80 transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
