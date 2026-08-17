import type { Metadata } from "next";
import { ImageIcon } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/States";
import { GalleryGrid } from "@/components/public/GalleryGrid";
import { getGallery, getGalleryCategories } from "@/server/services/content.service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Moments from our programs, events and community work at Bhavika Education & Welfare Foundation.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const [items, categories] = await Promise.all([getGallery(), getGalleryCategories()]);
  return (
    <>
      <PageHero
        eyebrow="Our work in pictures"
        eyebrowHi="तस्वीरों में हमारा काम"
        title="Moments from the ground"
        titleHi="मैदान से कुछ पल"
        description="Classrooms, camps, distribution drives and celebrations — a glimpse into the everyday moments that define our work."
        descriptionHi="कक्षाएँ, शिविर, वितरण और उत्सव।"
      />
      <Section>
        <Container>
          {items.length === 0 ? (
            <EmptyState
              icon={<ImageIcon size={40} />}
              title="No photos yet"
              description="Our gallery is being updated. Please check back soon."
            />
          ) : (
            <GalleryGrid items={items} categories={categories} />
          )}
        </Container>
      </Section>
    </>
  );
}
