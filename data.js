// data.js — Samazil · Catálogo oficial de oficios y servicios (Guatemala)
// Todas las tarifas están expresadas POR HORA y en Quetzales (Q).
// "refMin/refMax" es la tarifa de referencia del oficio (documento base).
// Cada profesional define además su propia tarifa por hora al registrarse.

const CATEGORIAS = [
  {
    id: 'tutorias',
    nombre: 'Tutorías y Clases Particulares',
    icono: '📘',
    color: '#C19A6B',
    colorSoft: '#F5DEB3',
    descripcion: 'Clases particulares desde primaria hasta preparación para examen de admisión universitario.',
    refMin: 50,
    refMax: 300,
    nota: 'La tarifa sube según el nivel: primaria, básicos, diversificado, universidad o examen de admisión (USAC/UVG).'
  },
  {
    id: 'bodeguero',
    nombre: 'Bodeguero',
    icono: '📦',
    color: '#B57EDC',
    colorSoft: '#DBBFCC',
    descripcion: 'Recepción, orden y control de mercadería en bodega.',
    refMin: 16,
    refMax: 20,
    nota: 'Referencia calculada sobre jornada completa de Q125/día.'
  },
  {
    id: 'camionero',
    nombre: 'Camionero (5 toneladas)',
    icono: '🚚',
    color: '#4A708B',
    colorSoft: '#ADC4F0',
    descripcion: 'Transporte de carga con camión de 5 toneladas de capacidad.',
    refMin: 20,
    refMax: 25,
    nota: 'Referencia calculada sobre jornada completa de Q160/día.'
  },
  {
    id: 'repartidor',
    nombre: 'Repartidor',
    icono: '🛵',
    color: '#4A708B',
    colorSoft: '#ADC4F0',
    descripcion: 'Entregas y mandados dentro de la ciudad o zona asignada.',
    refMin: 16,
    refMax: 19,
    nota: 'El valor varía según la zona y el tipo de entrega.'
  },
  {
    id: 'camaras',
    nombre: 'Instalador de Cámaras de Seguridad',
    icono: '🎥',
    color: '#0979B0',
    colorSoft: '#7CDAF9',
    descripcion: 'Instalación y configuración de sistemas de videovigilancia.',
    refMin: 50,
    refMax: 75,
    nota: 'El valor depende de la cantidad de equipos y su ubicación (Q200–Q300 por trabajo).'
  },
  {
    id: 'plomero',
    nombre: 'Plomero',
    icono: '🔧',
    color: '#6B8CAE',
    colorSoft: '#C7EBFF',
    descripcion: 'Diagnóstico, reparación de fugas, tuberías, griferías e inodoros.',
    refMin: 75,
    refMax: 190,
    nota: 'Diagnóstico Q210 · destape simple Q305 · fuga pequeña Q405 · griferia Q455. Tarifa catorcenal Q3,500–Q4,000.'
  },
  {
    id: 'electricista',
    nombre: 'Electricista',
    icono: '⚡',
    color: '#6A85B2',
    colorSoft: '#C7EBFF',
    descripcion: 'Instalaciones y reparaciones eléctricas residenciales y comerciales.',
    refMin: 90,
    refMax: 160,
    nota: 'Pago mensual mínimo Q3,500 · por trabajo Q4,000–Q5,000 según complejidad.'
  },
  {
    id: 'jardinero',
    nombre: 'Jardinero',
    icono: '🌿',
    color: '#B57EDC',
    colorSoft: '#DBBFCC',
    descripcion: 'Mantenimiento de áreas verdes, poda y limpieza de jardines.',
    refMin: 19,
    refMax: 30,
    nota: 'Pago mensual mínimo Q1,500 · hasta Q2,000 por trabajo según tamaño del área.'
  },
  {
    id: 'pintor',
    nombre: 'Pintor',
    icono: '🎨',
    color: '#E44F9C',
    colorSoft: '#FFC1FF',
    descripcion: 'Pintura de interiores y exteriores, acabados y retoques.',
    refMin: 40,
    refMax: 60,
    nota: 'Mano de obra Q40/m² · con materiales hasta Q155/m² en total.'
  },
  {
    id: 'musico',
    nombre: 'Músico',
    icono: '🎵',
    color: '#C93384',
    colorSoft: '#FF97D9',
    descripcion: 'Presentaciones en solitario, dúo, mariachi, banda o conjunto para eventos.',
    refMin: 430,
    refMax: 800,
    nota: 'Solista Q430/hora · dúo/trío Q1,300 por evento · banda completa Q4,000 por evento.'
  },
  {
    id: 'ama_de_casa',
    nombre: 'Ama de Casa / Servicios Domésticos',
    icono: '🏠',
    color: '#0979B0',
    colorSoft: '#B6FFFF',
    descripcion: 'Limpieza general del hogar. No incluye preparación de alimentos.',
    refMin: 28,
    refMax: 35,
    nota: 'Referencia calculada sobre jornada diaria de Q250.'
  },
  {
    id: 'cocinero',
    nombre: 'Cocinero y Ayudantes',
    icono: '👨‍🍳',
    color: '#6A85B2',
    colorSoft: '#C7EBFF',
    descripcion: 'Ayudantes de cocina, cocineros generales y chefs para eventos.',
    refMin: 27,
    refMax: 65,
    nota: 'Ayudante Q220/día · cocinero general Q255/día · chef de eventos Q515/evento.'
  }
];

function getCategoria(id) {
  return CATEGORIAS.find(c => c.id === id);
}

// Profesionales de muestra para que el catálogo no se vea vacío
const SEED_PROS = [
  { id: 'seed_1', nombre: 'Marvin Sutuj', email: 'marvin@samazil.gt', password: 'demo', tipo: 'emprendedor', categoria: 'plomero', tarifa_hora: 95, avatar: '', rating: 4.9, ubicacion: 'Guatemala, Zona 7', bio: 'Más de 12 años resolviendo fugas, destapes e instalaciones sanitarias.' },
  { id: 'seed_2', nombre: 'Lesbia Choc', email: 'lesbia@samazil.gt', password: 'demo', tipo: 'emprendedor', categoria: 'tutorias', tarifa_hora: 90, avatar: '', rating: 5.0, ubicacion: 'Mixco', bio: 'Tutora de matemática y física, preparación para examen de admisión USAC.' },
  { id: 'seed_3', nombre: 'Carlos Pérez', email: 'carlos@samazil.gt', password: 'demo', tipo: 'emprendedor', categoria: 'electricista', tarifa_hora: 120, avatar: '', rating: 4.8, ubicacion: 'Guatemala, Zona 11', bio: 'Instalaciones eléctricas residenciales y comerciales certificadas.' },
  { id: 'seed_4', nombre: 'María Gómez', email: 'maria.g@samazil.gt', password: 'demo', tipo: 'emprendedor', categoria: 'ama_de_casa', tarifa_hora: 32, avatar: '', rating: 4.9, ubicacion: 'Villa Nueva', bio: 'Limpieza profunda y mantenimiento del hogar con referencias comprobables.' },
  { id: 'seed_5', nombre: 'Estuardo Ramírez', email: 'estuardo@samazil.gt', password: 'demo', tipo: 'emprendedor', categoria: 'jardinero', tarifa_hora: 25, avatar: '', rating: 4.7, ubicacion: 'Fraijanes', bio: 'Diseño y mantenimiento de jardines residenciales.' },
  { id: 'seed_6', nombre: 'Los Alteños', email: 'losaltenos@samazil.gt', password: 'demo', tipo: 'emprendedor', categoria: 'musico', tarifa_hora: 600, avatar: '', rating: 5.0, ubicacion: 'Quetzaltenango', bio: 'Conjunto musical para bodas, quinceañeras y eventos corporativos.' },
  { id: 'seed_7', nombre: 'Juan Sánchez', email: 'juan.s@samazil.gt', password: 'demo', tipo: 'emprendedor', categoria: 'pintor', tarifa_hora: 45, avatar: '', rating: 4.6, ubicacion: 'Guatemala, Zona 18', bio: 'Pintura interior y exterior con acabados finos.' },
  { id: 'seed_8', nombre: 'Ana López', email: 'ana@samazil.gt', password: 'demo', tipo: 'consumidor', avatar: '', ubicacion: 'Guatemala, Zona 10' }
];

// Se exponen como globales para app.js
window.CATEGORIAS = CATEGORIAS;
window.getCategoria = getCategoria;
window.SEED_PROS = SEED_PROS;
