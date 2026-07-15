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
    <Card className="w-full max-w-md border-border shadow-none">
      <CardHeader className="text-center">
        <Link
          href="/"
          className="mx-auto mb-3 flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          aria-label={`${APP_NAME} home`}
        >
          <Dumbbell className="size-5" />
        </Link>
        <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
