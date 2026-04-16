export interface FieldMeta { hex: string; label: string; bg: string; text: string }

export const INTENT_META: Record<string, FieldMeta> = {
  'queixa':      { hex: '#dc2626', label: 'Queixa',      bg: 'bg-red-100',     text: 'text-red-700'     },
  'incidència':  { hex: '#ea580c', label: 'Incidència',  bg: 'bg-orange-100',  text: 'text-orange-700'  },
  'consulta':    { hex: '#2563eb', label: 'Consulta',    bg: 'bg-blue-100',    text: 'text-blue-700'    },
  'sol·licitud': { hex: '#7c3aed', label: 'Sol·licitud', bg: 'bg-violet-100',  text: 'text-violet-700'  },
  'suggeriment': { hex: '#d97706', label: 'Suggeriment', bg: 'bg-yellow-100',  text: 'text-yellow-700'  },
  'agraïment':   { hex: '#059669', label: 'Agraïment',   bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

export const DEPT_META: Record<string, FieldMeta> = {
  'urbanisme':              { hex: '#6366f1', label: 'Urbanisme',              bg: 'bg-indigo-100',  text: 'text-indigo-700'  },
  'medi_ambient':           { hex: '#10b981', label: 'Medi Ambient',           bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'neteja':                 { hex: '#f59e0b', label: 'Neteja',                 bg: 'bg-amber-100',   text: 'text-amber-700'   },
  'mobilitat':              { hex: '#3b82f6', label: 'Mobilitat',              bg: 'bg-blue-100',    text: 'text-blue-700'    },
  'seguretat':              { hex: '#ef4444', label: 'Seguretat',              bg: 'bg-red-100',     text: 'text-red-700'     },
  'serveis_socials':        { hex: '#ec4899', label: 'Serveis Socials',        bg: 'bg-pink-100',    text: 'text-pink-700'    },
  'cultura_esports':        { hex: '#8b5cf6', label: 'Cultura i Esports',      bg: 'bg-violet-100',  text: 'text-violet-700'  },
  'habitatge':              { hex: '#14b8a6', label: 'Habitatge',              bg: 'bg-teal-100',    text: 'text-teal-700'    },
  'tramits_administratius': { hex: '#64748b', label: 'Tràmits Administratius', bg: 'bg-slate-100',   text: 'text-slate-700'   },
  'general':                { hex: '#94a3b8', label: 'General',                bg: 'bg-slate-100',   text: 'text-slate-500'   },
};

export const ACTION_META: Record<string, FieldMeta> = {
  'cap':                { hex: '#94a3b8', label: 'Cap acció',          bg: 'bg-slate-100',   text: 'text-slate-500'   },
  'informar':           { hex: '#3b82f6', label: 'Informar',           bg: 'bg-blue-100',    text: 'text-blue-700'    },
  'reparar':            { hex: '#f97316', label: 'Reparar',            bg: 'bg-orange-100',  text: 'text-orange-700'  },
  'investigar':         { hex: '#7c3aed', label: 'Investigar',         bg: 'bg-violet-100',  text: 'text-violet-700'  },
  'derivar':            { hex: '#d97706', label: 'Derivar',            bg: 'bg-amber-100',   text: 'text-amber-700'   },
  'desplaçament_físic': { hex: '#dc2626', label: 'Desplaçament físic', bg: 'bg-red-100',     text: 'text-red-700'     },
};

export const EXPERIENCE_META: Record<string, FieldMeta> = {
  'primera_interacció':  { hex: '#0ea5e9', label: 'Primera interacció',  bg: 'bg-sky-100',     text: 'text-sky-700'     },
  'reincident_satisfet': { hex: '#10b981', label: 'Reincident satisfet', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'reincident_frustrat': { hex: '#ef4444', label: 'Reincident frustrat', bg: 'bg-red-100',     text: 'text-red-700'     },
};

export const LANGUAGE_META: Record<string, FieldMeta> = {
  'ca': { hex: '#d97706', label: 'Català',   bg: 'bg-amber-100', text: 'text-amber-700' },
  'es': { hex: '#dc2626', label: 'Castellà', bg: 'bg-red-100',   text: 'text-red-700'   },
};

export function intentMeta(key: string | null): FieldMeta {
  return INTENT_META[key ?? ''] ?? { hex: '#94a3b8', label: key ?? '—', bg: 'bg-slate-100', text: 'text-slate-500' };
}
export function deptMeta(key: string | null): FieldMeta {
  return DEPT_META[key ?? ''] ?? { hex: '#94a3b8', label: key ?? '—', bg: 'bg-slate-100', text: 'text-slate-500' };
}
export function actionMeta(key: string | null): FieldMeta {
  return ACTION_META[key ?? ''] ?? { hex: '#94a3b8', label: key ?? '—', bg: 'bg-slate-100', text: 'text-slate-500' };
}
export function experienceMeta(key: string | null): FieldMeta {
  return EXPERIENCE_META[key ?? ''] ?? { hex: '#94a3b8', label: key ?? '—', bg: 'bg-slate-100', text: 'text-slate-500' };
}
export function languageMeta(key: string | null): FieldMeta {
  return LANGUAGE_META[key ?? ''] ?? { hex: '#94a3b8', label: key ?? '—', bg: 'bg-slate-100', text: 'text-slate-500' };
}
