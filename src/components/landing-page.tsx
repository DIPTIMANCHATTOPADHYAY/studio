import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, BarChart, ShieldCheck, ArrowRight, Code, MessageSquare, DollarSign } from 'lucide-react';

interface LandingPageProps {
  siteName: string;
  signupEnabled: boolean;
  footerText: string;
}

export function LandingPage({ siteName, signupEnabled, footerText }: LandingPageProps) {
  const processedFooterText = footerText
    .replace('{YEAR}', new Date().getFullYear().toString())
    .replace('{SITENAME}', siteName);

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-semibold text-foreground">{siteName}</span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
             <Link href="/login">
                <Button variant="ghost">Login</Button>
            </Link>
            {signupEnabled && (
                <Link href="/signup">
                    <Button>Sign Up</Button>
                </Link>
            )}
          </nav>
          <div className="flex items-center gap-2 md:hidden">
             <Link href="/login">
                <Button variant="outline" size="sm">Login</Button>
            </Link>
            {signupEnabled && (
                <Link href="/signup">
                    <Button size="sm">Sign Up</Button>
                </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 md:px-6 py-20 md:py-32 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Monetize Your OTP Traffic with Global IPRN
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Leverage our robust network of International Premium Rate Numbers to deliver OTPs and generate revenue from every message you send.
            </p>
            <div className="flex justify-center gap-4">
               {signupEnabled && (
                <Link href="/signup">
                    <Button size="lg">Start Earning Now</Button>
                </Link>
               )}
              <Link href="/dashboard">
                <Button size="lg" variant="outline">
                  Access Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-muted/50 py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">Your Partner in SMS Monetization</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                We provide the platform and network you need to succeed.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="transform hover:-translate-y-2 transition-transform duration-300">
                <CardHeader className="items-center">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                    <Globe className="h-8 w-8" />
                  </div>
                  <CardTitle>Extensive Global Coverage</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Access a vast inventory of IPRNs across numerous countries and mobile operators for maximum reach and revenue potential.
                </CardContent>
              </Card>
              <Card className="transform hover:-translate-y-2 transition-transform duration-300">
                <CardHeader className="items-center">
                    <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                        <BarChart className="h-8 w-8" />
                    </div>
                  <CardTitle>Real-Time Analytics</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Monitor your traffic, track delivery rates, and view your earnings with our powerful and intuitive dashboard.
                </CardContent>
              </Card>
              <Card className="transform hover:-translate-y-2 transition-transform duration-300">
                <CardHeader className="items-center">
                    <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                  <CardTitle>Secure & Reliable Delivery</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Our platform is built for high-throughput, secure OTP delivery, ensuring your messages reach their destination reliably.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section id="how-it-works" className="py-16 md:py-24">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tight">Start Earning in 3 Simple Steps</h2>
                    <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                        Our straightforward process gets you up and running in no time.
                    </p>
                </div>
                <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 text-center">
                    <div className="flex flex-col items-center">
                        <div className="p-4 rounded-full bg-primary/10 text-primary mb-4">
                            <Code className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">1. Integrate</h3>
                        <p className="text-muted-foreground">
                            Easily integrate with your existing systems using our simple and well-documented API.
                        </p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="p-4 rounded-full bg-primary/10 text-primary mb-4">
                            <MessageSquare className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">2. Send Traffic</h3>
                        <p className="text-muted-foreground">
                            Route your A2P and P2P OTP SMS traffic through our secure global IPRN network.
                        </p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="p-4 rounded-full bg-primary/10 text-primary mb-4">
                            <DollarSign className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">3. Earn Revenue</h3>
                        <p className="text-muted-foreground">
                            Get paid for every successfully delivered message. Watch your revenue grow on your dashboard.
                        </p>
                    </div>
                </div>
            </div>
        </section>

      </main>

      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 md:px-6 py-6 text-center text-muted-foreground text-sm">
          {processedFooterText}
        </div>
      </footer>
    </div>
  );
}
