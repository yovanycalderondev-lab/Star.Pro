/* ============================================================
   data.js — Catálogo base extraído del documento de requisitos.
   Estas tarifas son la fuente de verdad inicial. El administrador
   puede sobreescribirlas desde el panel (se guarda en localStorage
   bajo la llave OVS_TARIFFS_OVERRIDE).
   ============================================================ */

const DEPARTAMENTOS_GT = [
  "Alta Verapaz","Baja Verapaz","Chimaltenango","Chiquimula","El Progreso",
  "Escuintla","Guatemala","Huehuetenango","Izabal","Jalapa","Jutiapa",
  "Petén","Quetzaltenango","Quiché","Retalhuleu","Sacatepéquez","San Marcos",
  "Santa Rosa","Sololá","Suchitepéquez","Totonicapán","Zacapa"
];

const CATEGORIES = [
  {
    id: "tutorias",
    nombre: "Tutorías y Clases Particulares",
    rutaNum: "01",
    colors: ["#8B5A2B","#A67C52","#C19A6B","#DAB692","#F5DEB3"],
    tariffs: [
      { label: "Primaria", value: "Q50 – Q80 por hora · Q300 – Q480 por día" },
      { label: "Nivel Básico", value: "Q60 – Q100 por hora · Q360 – Q600 por día" },
      { label: "Diversificado / Bachillerato", value: "Q80 – Q150 por hora · Q480 – Q900 por día" },
      { label: "Universidad (Cálculo y Álgebra)", value: "Q120 – Q250 por hora · Q720 – Q1,500 por día" },
      { label: "Exámenes de admisión (USAC / UVG)", value: "Q150 – Q300 por hora · Q900 – Q1,800 por día" }
    ]
  },
  {
    id: "bodeguero",
    nombre: "Bodeguero",
    rutaNum: "02",
    colors: ["#B57EDC","#DBBFCC","#FFF0FF"],
    tariffs: [
      { label: "Jornada completa", value: "Q125 por día" }
    ]
  },
  {
    id: "camionero",
    nombre: "Camionero (capacidad de 5 toneladas)",
    rutaNum: "03",
    colors: ["#4A708B","#6B8CAE","#8CA8CF","#ADC4F0"],
    tariffs: [
      { label: "Jornada completa", value: "Q160 por día" }
    ]
  },
  {
    id: "repartidor",
    nombre: "Repartidor",
    rutaNum: "04",
    colors: ["#4A708B","#6B8CAE","#8CA8CF","#ADC4F0"],
    tariffs: [
      { label: "Jornada completa", value: "Q130 – Q155 por día", nota: "El valor varía según la zona y el tipo de entrega" }
    ]
  },
  {
    id: "camaras",
    nombre: "Instalador de cámaras de seguridad",
    rutaNum: "05",
    colors: ["#004173","#0979B0","#0CB7F2","#7CDAF9","#B6FFFF"],
    tariffs: [
      { label: "Por trabajo realizado", value: "Q200 – Q300", nota: "El valor depende de la cantidad de equipos y su ubicación" }
    ]
  },
  {
    id: "plomero",
    nombre: "Plomero",
    rutaNum: "06",
    colors: ["#4A708B","#6B8CAE","#8CA8CF","#ADC4F0"],
    tariffs: [
      { label: "Diagnóstico", value: "Q210" },
      { label: "Cambio de sifón o bajada de lavaplatos", value: "Q275" },
      { label: "Cambio de grifería", value: "Q455" },
      { label: "Instalación de inodoro", value: "Q245" },
      { label: "Destapación de tubería simple", value: "Q305" },
      { label: "Reparación de fuga pequeña", value: "Q405" },
      { label: "Tarifa diaria", value: "Q600 – Q1,500" },
      { label: "Tarifa catorcenal", value: "Q3,500 – Q4,000" }
    ]
  },
  {
    id: "electricista",
    nombre: "Electricista",
    rutaNum: "07",
    colors: ["#6A85B2","#89A7D6","#A8C9F9","#C7EBFF"],
    tariffs: [
      { label: "Pago mensual mínimo", value: "Q3,500" },
      { label: "Por trabajo realizado", value: "Q4,000 – Q5,000", nota: "El valor depende de la complejidad de la instalación o reparación" }
    ]
  },
  {
    id: "jardinero",
    nombre: "Jardinero",
    rutaNum: "08",
    colors: ["#B57EDC","#DBBFCC","#FFF0FF"],
    tariffs: [
      { label: "Pago mensual mínimo", value: "Q1,500" },
      { label: "Por trabajo realizado", value: "hasta Q2,000", nota: "El valor depende del tamaño y estado del área a atender" }
    ]
  },
  {
    id: "pintor",
    nombre: "Pintor",
    rutaNum: "09",
    colors: ["#C93384","#E44F9C","#FF69B4","#FF97D9","#FFC1FF"],
    tariffs: [
      { label: "Mano de obra", value: "Q40 por metro cuadrado" },
      { label: "Materiales y pintura", value: "Q120 por metro cuadrado" },
      { label: "Costo total estimado", value: "Q155 por metro cuadrado" }
    ]
  },
  {
    id: "musico",
    nombre: "Músico",
    rutaNum: "10",
    colors: ["#C93384","#E44F9C","#FF69B4","#FF97D9","#FFC1FF"],
    tariffs: [
      { label: "Solista", value: "Q430 por hora" },
      { label: "Dúo o trío acústico", value: "Q1,300 por evento" },
      { label: "Mariachi o grupo pequeño", value: "Q1,550 por hora" },
      { label: "Banda completa", value: "Q4,000 por evento" },
      { label: "Conjunto musical", value: "Q1,555 por evento" }
    ]
  },
  {
    id: "domestico",
    nombre: "Ama de casa / Servicios domésticos",
    rutaNum: "11",
    colors: ["#004173","#0979B0","#0CB7F2","#7CDAF9","#B6FFFF"],
    tariffs: [
      { label: "Jornada diaria", value: "Q250", nota: "Incluye limpieza general, no incluye preparación de alimentos" }
    ]
  },
  {
    id: "cocinero",
    nombre: "Cocinero y ayudantes",
    rutaNum: "12",
    colors: ["#6A85B2","#89A7D6","#A8C9F9","#C7EBFF"],
    tariffs: [
      { label: "Ayudante de cocina", value: "Q220 por día" },
      { label: "Cocinero general", value: "Q255 por día" },
      { label: "Chef para eventos", value: "Q515 por evento", nota: "El valor puede ajustarse según la cantidad de personas a atender" }
    ]
  }
];

/* Profesionales de muestra para que el catálogo no se vea vacío
   en una instalación nueva. Cualquier emprendedor que se registre
   se añade a esta misma lista (en localStorage). */
const SEED_PROS = [
  { id: "seed-1", tipo: "emprendedor", nombre: "Marvin Sutuj", telefono: "55012345", dpi: "1000000000101", fechaNacimiento: "1988-04-12", categorias: ["plomero"], calificacion: 4.8, disponibilidad: "Lun–Sáb, 7am–6pm", ubicacion: "Mixco, Guatemala", password: "demo" },
  { id: "seed-2", tipo: "emprendedor", nombre: "Lesbia Choc", telefono: "55023456", dpi: "1000000000102", fechaNacimiento: "1990-08-21", categorias: ["tutorias"], calificacion: 4.9, disponibilidad: "Tardes, Lun–Vie", ubicacion: "Zona 1, Guatemala", password: "demo" },
  { id: "seed-3", tipo: "emprendedor", nombre: "Byron Ixchop", telefono: "55034567", dpi: "1000000000103", fechaNacimiento: "1985-01-30", categorias: ["electricista","camaras"], calificacion: 4.7, disponibilidad: "Todos los días", ubicacion: "Villa Nueva, Guatemala", password: "demo" },
  { id: "seed-4", tipo: "emprendedor", nombre: "Yolanda Pérez", telefono: "55045678", dpi: "1000000000104", fechaNacimiento: "1979-11-02", categorias: ["domestico","cocinero"], calificacion: 4.6, disponibilidad: "Lun–Vie, 6am–3pm", ubicacion: "Antigua Guatemala, Sacatepéquez", password: "demo" },
  { id: "seed-5", tipo: "emprendedor", nombre: "Conjunto Marimba Xelajú", telefono: "55056789", dpi: "1000000000105", fechaNacimiento: "1992-06-15", categorias: ["musico"], calificacion: 5.0, disponibilidad: "Fines de semana", ubicacion: "Quetzaltenango", password: "demo" },
  { id: "seed-6", tipo: "emprendedor", nombre: "Carlos Tzul", telefono: "55067890", dpi: "1000000000106", fechaNacimiento: "1995-03-09", categorias: ["jardinero","pintor"], calificacion: 4.5, disponibilidad: "Lun–Sáb", ubicacion: "Santa Catarina Pinula, Guatemala", password: "demo" },
  { id: "seed-7", tipo: "emprendedor", nombre: "Estuardo Morales", telefono: "55078901", dpi: "1000000000107", fechaNacimiento: "1983-09-25", categorias: ["camionero","repartidor"], calificacion: 4.4, disponibilidad: "Todos los días, 5am–7pm", ubicacion: "Escuintla", password: "demo" },
  { id: "seed-8", tipo: "emprendedor", nombre: "Rosa Ajpop", telefono: "55089012", dpi: "1000000000108", fechaNacimiento: "1991-12-18", categorias: ["bodeguero"], calificacion: 4.6, disponibilidad: "Lun–Vie", ubicacion: "Chimaltenango", password: "demo" }
];

const ADMIN_USER = { user: "admin", password: "admin123" };
