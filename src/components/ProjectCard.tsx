import type { Project } from "@/data/projects";
import type { Lang } from "@/context/LanguageContext";
import Chip from "./Chip";

type Labels = { live: string; github: string; comingSoon: string };

function LockIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-foreground/40"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

export default function ProjectCard({
  project,
  lang,
  labels,
}: {
  project: Project;
  lang: Lang;
  labels: Labels;
}) {
  if (project.comingSoon) {
    return (
      <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-card">
        <div className="relative aspect-video overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-card to-background blur-sm" />
          <div className="absolute inset-0 flex items-center justify-center">
            <LockIcon />
          </div>
        </div>
        <div className="p-6">
          <p className="select-none font-display text-lg font-bold text-foreground/40 blur-[2px]">
            {labels.comingSoon}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_0_32px_rgba(108,99,255,0.25)]">
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-accent/20 via-card to-background">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-2xl font-bold text-foreground/15">
            {project.name}
          </span>
        </div>
      </div>
      <div className="p-6">
        <h3 className="font-display text-xl font-bold">{project.name}</h3>
        <p className="mt-2 text-sm text-foreground/70">
          {project.description[lang]}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.stack.map((tech) => (
            <Chip key={tech} label={tech} />
          ))}
        </div>
        <div className="mt-6 flex gap-4 text-sm font-semibold">
          {project.live && (
            <a
              href={project.live}
              target="_blank"
              rel="noreferrer"
              className="text-accent transition-colors hover:text-white"
            >
              {labels.live} →
            </a>
          )}
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noreferrer"
              className="text-foreground/70 transition-colors hover:text-foreground"
            >
              {labels.github}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
