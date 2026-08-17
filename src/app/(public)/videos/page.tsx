import type { Metadata } from "next";
import { Video as VideoIcon } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/States";
import { VideoGrid } from "@/components/public/VideoGrid";
import { getVideos } from "@/server/services/content.service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Videos",
  description:
    "Watch stories, program highlights and updates from Bhavika Education & Welfare Foundation.",
  alternates: { canonical: "/videos" },
};

export default async function VideosPage() {
  const videos = await getVideos();
  return (
    <>
      <PageHero
        eyebrow="Watch & learn"
        eyebrowHi="देखें और जानें"
        title="Videos"
        titleHi="वीडियो"
        description="Stories and highlights from our programs, straight from the communities we serve."
        descriptionHi="हमारे कार्यक्रमों की कहानियाँ, सीधे समुदाय से।"
      />
      <Section>
        <Container>
          {videos.length === 0 ? (
            <EmptyState
              icon={<VideoIcon size={40} />}
              title="No videos yet"
              description="We're preparing new videos. Please check back soon."
            />
          ) : (
            <VideoGrid videos={videos} />
          )}
        </Container>
      </Section>
    </>
  );
}
