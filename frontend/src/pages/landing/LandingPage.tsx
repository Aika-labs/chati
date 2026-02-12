import { Navbar, Hero, Features, Pricing, Testimonials, FAQ, CTA, Footer } from '../../components/landing';

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
