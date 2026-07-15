'use client';

import Link from 'next/link';
import { APP_DESCRIPTION, APP_NAME } from '@smart-gym/shared';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto flex max-w-3xl flex-col items-start text-left sm:items-center sm:text-center">
        <p className="text-sm font-medium text-primary">Gym management</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{APP_NAME}</h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">{APP_DESCRIPTION}</p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/signup" className="w-full sm:w-auto">
            <Button size="lg" className="w-full min-h-11 gap-2 sm:w-auto">
              Get started
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full min-h-11 sm:w-auto">
              Log in
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
