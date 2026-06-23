"use client";

import { content } from "@/data/content";
import { useLanguage } from "@/context/LanguageContext";
import { projects } from "@/data/projects";
import ProjectCard from "./ProjectCard";
import RevealSection from "./RevealSection";

export default function Projects() {
  const { lang } = useLanguage();
  const t = content[lang].projects;

  return (
    <section id="projects" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <RevealSection>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            {t.heading}
          </h2>
          <p className="mt-2 text-foreground/60">{t.subheading}</p>
        </RevealSection>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <RevealSection key={project.id} delay={index * 0.1}>
              <ProjectCard
                project={project}
                lang={lang}
                labels={{
                  live: t.live,
                  github: t.github,
                  comingSoon: t.comingSoon,
                }}
              />
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}
