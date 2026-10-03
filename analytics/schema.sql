-- Eventos de la web (sin IP ni datos personales; vid = huella diaria irreversible)
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,          -- milisegundos
  day TEXT NOT NULL,            -- AAAA-MM-DD (UTC)
  type TEXT NOT NULL,           -- view | search | elegir | whatsapp | cita | calc
  path TEXT,                    -- página vista
  q TEXT,                       -- búsqueda / carrera elegida / origen del clic
  extra TEXT,                   -- universidad elegida, etc.
  src TEXT,                     -- de dónde llegó (solo en view): whatsapp, facebook, google, directo…
  dev TEXT,                     -- movil | ordenador
  country TEXT,
  vid TEXT                      -- visitante del día
);
CREATE INDEX IF NOT EXISTS idx_events_day_type ON events (day, type);
