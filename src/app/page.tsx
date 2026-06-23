import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Projects from "@/components/Projects";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import LangFadeWrapper from "@/components/LangFadeWrapper";

export default function Home() {
  return (
    <LangFadeWrapper>
      <Navbar />
      <main>
        <Hero />
        <Projects />
        <About />
        <Contact />
      </main>
      <Footer />
    </LangFadeWrapper>
  );
}
