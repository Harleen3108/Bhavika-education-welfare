import * as React from "react";
import { Card, CardBody } from "@/components/ui/Card";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="animate-fade-up">
      <CardBody className="sm:p-8">
        <h1 className="text-2xl font-bold text-brand-800">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-600">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </CardBody>
      {footer && (
        <div className="border-t border-ink-100 px-6 py-4 text-center text-sm text-ink-600 sm:px-8">
          {footer}
        </div>
      )}
    </Card>
  );
}
