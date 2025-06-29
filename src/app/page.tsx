import { LandingPage } from '@/components/landing-page';
import { getPublicSettings } from '@/app/actions';

export default async function Home() {
  const { siteName, signupEnabled, footerText } = await getPublicSettings();
  
  return <LandingPage siteName={siteName} signupEnabled={signupEnabled} footerText={footerText} />;
}
