import { lazy, Suspense, useEffect } from 'react';
import { BrandStory } from './components/BrandStory';
import { ChatConsole } from './components/ChatConsole';
import { Comparison } from './components/Comparison';
import { Faq } from './components/Faq';
import { FinalCta } from './components/FinalCta';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Pillars } from './components/Pillars';
import { Pricing } from './components/Pricing';
import { Roadmap } from './components/Roadmap';
import { RoiCalculator } from './components/RoiCalculator';
import { Security } from './components/Security';
import { Setup } from './components/Setup';
import { WorkflowSimulator } from './components/WorkflowSimulator';
import { WorkspaceShowcase } from './components/WorkspaceShowcase';
import { useSectionReveal } from './hooks/useSectionReveal';

// The Three.js backdrop is code-split; the page renders fully without it.
const SiteScene = lazy(() => import('./components/SiteScene').then((m) => ({ default: m.SiteScene })));

// Section order follows the Avand landing: hero, brand story, simulator, chat, setup, product pillars,
// comparison, panel views, security, savings calculator, roadmap, pricing, FAQ, final call to action, footer.
export default function App() {
  useSectionReveal();

  useEffect(() => {
    // Tells the load guard in index.html that the app started.
    document.documentElement.dataset.app = 'ready';
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <SiteScene />
      </Suspense>
      <a className="skip-link" href="#main">
        پرش به محتوا
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Hero />
        <BrandStory />
        <WorkflowSimulator />
        <ChatConsole />
        <Setup />
        <Pillars />
        <Comparison />
        <WorkspaceShowcase />
        <Security />
        <RoiCalculator />
        <Roadmap />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
