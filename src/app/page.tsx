import { LandingPage } from '@/components/landing-page';
import { getPublicSettings } from '@/app/actions/settings';

export default async function Home() {
  const { siteName, signupEnabled, footerText } = await getPublicSettings();
  
  return <LandingPage siteName={siteName} signupEnabled={signupEnabled} footerText={footerText} />;
}
