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
    id: "coming-soon",
    name: "Coming soon",
    description: { en: "", es: "" },
    stack: [],
    comingSoon: true,
  },
];
