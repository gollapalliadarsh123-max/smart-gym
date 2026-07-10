import { FeaturesSection } from '@/features/marketing/components/features-section';
import { HeroSection } from '@/features/marketing/components/hero-section';
import { TermsSection } from '@/features/marketing/components/terms-section';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <TermsSection />
    </>
  );
}
