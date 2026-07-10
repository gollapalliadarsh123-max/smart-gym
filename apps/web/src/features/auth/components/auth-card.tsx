import type { ReactNode } from 'react';
import Link from 'next/link';
import { APP_NAME } from '@smart-gym/shared';
import { Dumbbell } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <Card className="w-full max-w-md border-border/60 shadow-lg">
      <CardHeader className="text-center">
        <Link
          href="/"
          className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90"
          aria-label={`${APP_NAME} home`}
        >
          <Dumbbell className="size-6" />
        </Link>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
