export const GLOBE_LOCATIONS = [
  { id: 0, lat: 11.7,  lng: -70.2  },  // Punto Fijo, Venezuela
  { id: 1, lat: 29.76, lng: -95.37 },  // Houston, TX
  { id: 2, lat: 28.54, lng: -81.38 },  // Orlando, FL
  { id: 3, lat: 4.71,  lng: -74.07 },  // Colombia (Bogotá)
] as const;

export const GLOBE_ARCS: readonly [number, number][] = [
  [0, 1], [1, 2], [2, 3],
];

export const LOCATION_NAMES = [
  "Punto Fijo, Venezuela",
  "Houston, Texas",
  "Orlando, Florida",
  "Colombia",
] as const;

export const storyContent = {
  en: {
    heading: "My Story",
    subheading: "From Venezuela to Florida — building in public.",
    timelineHeading: "Timeline",
    locations: [
      { label: "Origin",           tooltip: "Where it all began. Crypto at 13." },
      { label: "First Step in US", tooltip: "New country at 15. New language, new code." },
      { label: "Where it's built", tooltip: "Where Venestock was born." },
      { label: "First Market",     tooltip: "First market for Venestock." },
    ],
    milestones: [
      {
        year: "2019",
        location: "Punto Fijo, Venezuela",
        text: "First contact with crypto: Axie Infinity at 13. Learned that the internet could generate real income.",
      },
      {
        year: "2021",
        location: "Houston, Texas",
        text: "Arrived in the US at 15. Learned English in under a year, discovered programming and started thinking about business.",
      },
      {
        year: "2023",
        location: "Orlando, Florida",
        text: "Grade 12. Earned certifications, made the honors list, and started prototyping what would become Venestock.",
      },
      {
        year: "2025",
        location: "Orlando, Florida",
        text: "First working prototypes of Venestock — real inventory management for real distributors. First paying users.",
      },
      {
        year: "2026",
        location: "Orlando, Florida",
        text: "Graduated with honors at 18. Venestock in production with real clients. Building full-time.",
      },
    ],
  },
  es: {
    heading: "Mi Historia",
    subheading: "De Venezuela a Florida — construyendo en público.",
    timelineHeading: "Recorrido",
    locations: [
      { label: "Origen",             tooltip: "Donde empezó todo. Crypto a los 13." },
      { label: "Primer paso en US",  tooltip: "Nuevo país a los 15. Nuevo idioma, nuevo código." },
      { label: "Donde se construye", tooltip: "Donde nació Venestock." },
      { label: "Primer Mercado",     tooltip: "Primer mercado de Venestock." },
    ],
    milestones: [
      {
        year: "2019",
        location: "Punto Fijo, Venezuela",
        text: "Primer contacto con crypto: Axie Infinity a los 13 años. Descubrí que internet puede generar ingresos reales.",
      },
      {
        year: "2021",
        location: "Houston, Texas",
        text: "Llegué a US a los 15. Aprendí inglés en menos de un año, descubrí la programación y empecé a pensar en negocios.",
      },
      {
        year: "2023",
        location: "Orlando, Florida",
        text: "Grado 12. Certificaciones, cuadro de honor, y empecé a prototipar lo que sería Venestock.",
      },
      {
        year: "2025",
        location: "Orlando, Florida",
        text: "Primeros prototipos funcionales de Venestock — gestión de inventario real para distribuidores reales. Primeros usuarios reales.",
      },
      {
        year: "2026",
        location: "Orlando, Florida",
        text: "Me gradué con honores a los 18. Venestock en producción con clientes reales. Builder full-time.",
      },
    ],
  },
} as const;
