export type Project = {
  id: string;
  name: string;
  description: { en: string; es: string };
  stack: string[];
  live?: string;
  github?: string;
  comingSoon?: boolean;
};

export const projects: Project[] = [
  {
    id: "venestock",
    name: "Venestock",
    description: {
      en: "Multi-tenant inventory SaaS for Venezuelan distributors — stock, store credit (“fiado”), and sales in one dashboard.",
      es: "SaaS de inventario multi-tenant para distribuidores venezolanos — stock, fiado y ventas en un solo panel.",
    },
    stack: ["Next.js", "Supabase", "Vercel"],
    live: "https://venestock-app.vercel.app",
  },
  {
    id: "smash-fuego",
    name: "Smash & Fuego",
    description: {
      en: "Landing page for a food truck with a countdown, filterable menu, and WhatsApp ordering.",
      es: "Landing page para food truck con countdown, menú filtrable y pedidos por WhatsApp.",
    },
    stack: ["HTML", "CSS", "JavaScript"],
    live: "https://foodtruck-web-omega.vercel.app",
    github: "https://github.com/emanuelaparicio77-coder/Portafolio-proyect",
  },
  {
    id: "maxicar",
    name: "Maxicar",
    description: {
      en: "Multi-page site for a family used-car dealership in Doral, FL — inventory, in-lot financing, and WhatsApp contact.",
      es: "Sitio multipágina para un lote familiar de carros usados en Doral, FL — inventario, financiamiento en el lote y contacto por WhatsApp.",
    },
    stack: ["HTML", "CSS", "JavaScript"],
    live: "https://automarket-web-five.vercel.app/",
  },
  {
    id: "chroma-clash",
    name: "Chroma Clash",
    description: {
      en: "Original browser platform fighter — 8 fighters, local multiplayer and vs CPU, playable with keyboard, gamepad, or touch.",
      es: "Platform fighter original para navegador — 8 luchadores, multijugador local y vs CPU, con teclado, mando o táctil.",
    },
    stack: ["JavaScript", "HTML5 Canvas"],
    live: "https://chroma-clash.vercel.app",
  },
  {
    id: "coming-soon",
    name: "Coming soon",
    description: { en: "", es: "" },
    stack: [],
    comingSoon: true,
  },
];
