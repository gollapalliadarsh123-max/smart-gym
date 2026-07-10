'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { APP_DESCRIPTION, APP_NAME } from '@smart-gym/shared';
import { ArrowRight, Dumbbell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LANDING_STATS } from '@/features/marketing/constants';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.55_0.2_264_/_0.18),transparent)]"
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1">
            <Dumbbell className="size-3.5" aria-hidden />
            Smart Gym Platform
          </Badge>
        </motion.div>

        <motion.h1
          className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {APP_NAME}
        </motion.h1>

        <motion.p
          className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {APP_DESCRIPTION}
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col gap-3 sm:flex-row"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link href="/signup">
            <Button size="lg" className="min-w-[160px] gap-2">
              Get started
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="min-w-[160px]">
              Log in
            </Button>
          </Link>
        </motion.div>

        <motion.dl
          className="mt-16 grid w-full max-w-xl grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {LANDING_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/60 bg-card/50 px-3 py-4 backdrop-blur-sm"
            >
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}
