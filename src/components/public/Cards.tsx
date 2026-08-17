import Image from "next/image";
import { Quote, ExternalLink } from "lucide-react";
import type { TestimonialDTO, PartnerDTO } from "@/server/services/content.service";
import { Card, CardBody } from "@/components/ui/Card";

export function TestimonialCard({ t }: { t: TestimonialDTO }) {
  return (
    <Card className="h-full">
      <CardBody className="flex h-full flex-col">
        <Quote className="mb-3 text-accent-500" size={28} />
        <p className="flex-1 leading-relaxed text-ink-700">&ldquo;{t.message}&rdquo;</p>
        <div className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-4">
          {t.imageUrl ? (
            <Image
              src={t.imageUrl}
              alt={t.name}
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
              {t.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <p className="font-semibold text-brand-800">{t.name}</p>
            {t.role && <p className="text-sm text-ink-500">{t.role}</p>}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function PartnerCard({ p }: { p: PartnerDTO }) {
  const inner = (
    <Card interactive className="h-full">
      <CardBody className="flex h-full flex-col items-center text-center">
        <div className="flex h-20 w-full items-center justify-center">
          {p.logoUrl ? (
            <Image
              src={p.logoUrl}
              alt={`${p.name} logo`}
              width={140}
              height={70}
              className="max-h-16 w-auto object-contain"
            />
          ) : (
            <span className="font-display text-lg font-bold text-brand-700">{p.name}</span>
          )}
        </div>
        <p className="mt-4 font-semibold text-brand-800">{p.name}</p>
        {p.description && <p className="mt-1 text-sm text-ink-600">{p.description}</p>}
        {p.websiteUrl && (
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent-600">
            Visit <ExternalLink size={14} />
          </span>
        )}
      </CardBody>
    </Card>
  );

  if (p.websiteUrl) {
    return (
      <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="block h-full">
        {inner}
      </a>
    );
  }
  return inner;
}
