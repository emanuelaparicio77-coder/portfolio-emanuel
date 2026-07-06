import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LangFadeWrapper from "@/components/LangFadeWrapper";
import StoryContent from "@/components/StoryContent";

export const metadata: Metadata = {
  title: "Story — Emanuel Aparicio",
  description:
    "From Punto Fijo, Venezuela to building Venestock in Florida. The journey of an 18-year-old developer building in public.",
};

export default function StoryPage() {
  return (
    <LangFadeWrapper>
      <Navbar />
      <main>
        <StoryContent />
      </main>
      <Footer />
    </LangFadeWrapper>
  );
}
