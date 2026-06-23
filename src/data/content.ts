export const content = {
  en: {
    nav: { work: "Work", about: "About", contact: "Contact" },
    hero: {
      kicker: "Hello, I'm",
      name: "Emanuel Aparicio",
      tagline: "Full-stack dev & founder. Building in public at 18.",
      ctaWork: "View Work",
      ctaContact: "Contact",
    },
    projects: {
      heading: "Projects",
      subheading: "Things I've shipped.",
      live: "Live",
      github: "GitHub",
      comingSoon: "Coming soon",
    },
    about: {
      heading: "About",
      bio: "18-year-old Venezuelan-American developer based in Florida. Building Venestock, a SaaS for Latin American distributors. Incoming Valencia College student, targeting UT Austin McCombs transfer.",
      stackHeading: "Stack",
    },
    contact: {
      heading: "Contact",
      subheading: "Let's build something.",
      whatsapp: "WhatsApp",
      formName: "Name",
      formEmail: "Email",
      formMessage: "Message",
      formSubmit: "Send message",
      formSending: "Sending...",
      formSuccess: "Message sent — I'll get back to you soon.",
      formError: "Something went wrong. Try emailing me directly.",
    },
    footer: {
      rights: "All rights reserved.",
    },
  },
  es: {
    nav: { work: "Trabajo", about: "Sobre mí", contact: "Contacto" },
    hero: {
      kicker: "Hola, soy",
      name: "Emanuel Aparicio",
      tagline:
        "Desarrollador full-stack & founder. Construyendo en público a los 18.",
      ctaWork: "Ver trabajo",
      ctaContact: "Contacto",
    },
    projects: {
      heading: "Proyectos",
      subheading: "Cosas que he construido.",
      live: "Ver sitio",
      github: "GitHub",
      comingSoon: "Próximamente",
    },
    about: {
      heading: "Sobre mí",
      bio: "Desarrollador venezolano-americano de 18 años, radicado en Florida. Construyendo Venestock, un SaaS para distribuidores latinoamericanos. Próximo estudiante de Valencia College, con la mira en transferirme a UT Austin McCombs.",
      stackHeading: "Stack",
    },
    contact: {
      heading: "Contacto",
      subheading: "Construyamos algo juntos.",
      whatsapp: "WhatsApp",
      formName: "Nombre",
      formEmail: "Correo",
      formMessage: "Mensaje",
      formSubmit: "Enviar mensaje",
      formSending: "Enviando...",
      formSuccess: "Mensaje enviado — te responderé pronto.",
      formError: "Algo salió mal. Intenta escribirme directamente por correo.",
    },
    footer: {
      rights: "Todos los derechos reservados.",
    },
  },
} as const;

export type SiteContent = typeof content;
