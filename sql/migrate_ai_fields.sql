-- ================================================================
-- MIGRACIÓ: Camps nous inferits amb lògica SQL
-- Taula: sac_messages
-- Executar les FASES en ordre a l'editor SQL de Supabase
-- ================================================================


-- ================================================================
-- FASE 1 · CREAR COLUMNES
-- ================================================================
ALTER TABLE sac_messages
  ADD COLUMN IF NOT EXISTS intent                    TEXT,
  ADD COLUMN IF NOT EXISTS department                TEXT,
  ADD COLUMN IF NOT EXISTS action_required           TEXT,
  ADD COLUMN IF NOT EXISTS location_extracted        TEXT,
  ADD COLUMN IF NOT EXISTS followup_needed           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS language                  TEXT,
  ADD COLUMN IF NOT EXISTS citizen_experience_signal TEXT;


-- ================================================================
-- FASE 2 · LANGUAGE
-- Detecció per paraules clau distintives català / castellà.
-- Mataró és majoritàriament catalanoparlant → default 'ca'.
-- ================================================================
UPDATE sac_messages
SET language = CASE
  WHEN message ~* '\y(calle|ayuntamiento|vecinos|ruido|limpieza|semáforo|gracias|podría|debería|estoy|tengo|quiero|necesito|también|además|árbol|árboles|bicicleta|camión|señal|barrio|porque|hacer|favor|hola|buenas|instalación|vehículo|basura|acera)\y'
    THEN 'es'
  WHEN message ~* '\y(carrer|ajuntament|veïns|neteja|voravia|semàfor|soroll|arbres|gràcies|podria|hauria|estic|tinc|però|vull|necessito|barri|arbre|instal·lació|bicicleta|camió|senyal|perquè|però|també|bon dia|a més|doncs)\y'
    THEN 'ca'
  ELSE 'ca'
END;


-- ================================================================
-- FASE 3 · DEPARTMENT
-- Inferit de clas1 i clas2 per paraules clau (sense distinció
-- de majúscules). Ordre: de més específic a més genèric.
-- ================================================================
UPDATE sac_messages
SET department = CASE
  WHEN clas1 ILIKE '%urban%'        OR clas1 ILIKE '%obra%'       OR clas1 ILIKE '%via pública%'
    OR clas1 ILIKE '%edifici%'      OR clas1 ILIKE '%llum%'       OR clas1 ILIKE '%il·luminació%'
    OR clas2 ILIKE '%urban%'        OR clas2 ILIKE '%obra%'       OR clas2 ILIKE '%via pública%'
    OR clas2 ILIKE '%il·luminació%'
    THEN 'urbanisme'

  WHEN clas1 ILIKE '%medi ambient%' OR clas1 ILIKE '%parc%'       OR clas1 ILIKE '%jardí%'
    OR clas1 ILIKE '%jardins%'      OR clas1 ILIKE '%arbre%'      OR clas1 ILIKE '%plaga%'
    OR clas2 ILIKE '%arbre%'        OR clas2 ILIKE '%parc%'       OR clas2 ILIKE '%jardí%'
    OR clas2 ILIKE '%medi ambient%' OR clas2 ILIKE '%plaga%'
    THEN 'medi_ambient'

  WHEN clas1 ILIKE '%residu%'       OR clas1 ILIKE '%neteja%'     OR clas1 ILIKE '%brutícia%'
    OR clas1 ILIKE '%recicl%'       OR clas1 ILIKE '%brossa%'     OR clas1 ILIKE '%contenidor%'
    OR clas2 ILIKE '%residu%'       OR clas2 ILIKE '%neteja%'     OR clas2 ILIKE '%brossa%'
    OR clas2 ILIKE '%contenidor%'
    THEN 'neteja'

  WHEN clas1 ILIKE '%mobilitat%'    OR clas1 ILIKE '%trànsit%'    OR clas1 ILIKE '%transport%'
    OR clas1 ILIKE '%aparcament%'   OR clas1 ILIKE '%bicicleta%'  OR clas1 ILIKE '%semàfor%'
    OR clas2 ILIKE '%mobilitat%'    OR clas2 ILIKE '%trànsit%'    OR clas2 ILIKE '%aparcament%'
    OR clas2 ILIKE '%semàfor%'
    THEN 'mobilitat'

  WHEN clas1 ILIKE '%seguretat%'    OR clas1 ILIKE '%policia%'    OR clas1 ILIKE '%civisme%'
    OR clas1 ILIKE '%soroll%'       OR clas1 ILIKE '%ordre públic%'
    OR clas2 ILIKE '%seguretat%'    OR clas2 ILIKE '%civisme%'    OR clas2 ILIKE '%soroll%'
    THEN 'seguretat'

  WHEN clas1 ILIKE '%social%'       OR clas1 ILIKE '%benestar%'   OR clas1 ILIKE '%serveis personals%'
    OR clas1 ILIKE '%família%'      OR clas1 ILIKE '%infància%'   OR clas1 ILIKE '%gent gran%'
    OR clas2 ILIKE '%social%'       OR clas2 ILIKE '%benestar%'   OR clas2 ILIKE '%família%'
    THEN 'serveis_socials'

  WHEN clas1 ILIKE '%cultura%'      OR clas1 ILIKE '%esport%'     OR clas1 ILIKE '%educaci%'
    OR clas1 ILIKE '%joventut%'     OR clas1 ILIKE '%bibliote%'   OR clas1 ILIKE '%museu%'
    OR clas2 ILIKE '%cultura%'      OR clas2 ILIKE '%esport%'     OR clas2 ILIKE '%educaci%'
    THEN 'cultura_esports'

  WHEN clas1 ILIKE '%habitatge%'    OR clas2 ILIKE '%habitatge%'
    THEN 'habitatge'

  WHEN clas1 ILIKE '%llicènci%'     OR clas1 ILIKE '%tràmit%'     OR clas1 ILIKE '%gestió%'
    OR clas1 ILIKE '%padró%'        OR clas1 ILIKE '%registre%'   OR clas1 ILIKE '%certificat%'
    OR clas2 ILIKE '%tràmit%'       OR clas2 ILIKE '%llicènci%'   OR clas2 ILIKE '%padró%'
    THEN 'tramits_administratius'

  ELSE 'general'
END;


-- ================================================================
-- FASE 4 · INTENT
-- Lògica: canal 'Fotodenuncia' sempre = incidència.
-- Sentiment baix → queixa/incidència.
-- Sentiment alt → agraïment/consulta/suggeriment.
-- random() s'avalua un cop per fila en la subquery.
-- ================================================================
UPDATE sac_messages m
SET intent = CASE
  -- Fotodenuncia: sempre reportatge d'una incidència
  WHEN m.canal = 'Fotodenuncia'
    THEN 'incidència'

  -- Sentiment molt crític (< 3): queixa formal
  WHEN sub.s < 3
    THEN 'queixa'

  -- Sentiment negatiu (3–5): 65% queixa, 35% incidència
  WHEN sub.s < 5
    THEN CASE WHEN sub.r < 0.65 THEN 'queixa' ELSE 'incidència' END

  -- Sentiment molt positiu (≥ 7.5): agraïment / consulta / suggeriment
  WHEN sub.s >= 7.5
    THEN CASE
           WHEN sub.r < 0.35 THEN 'agraïment'
           WHEN sub.r < 0.70 THEN 'consulta'
           ELSE                   'suggeriment'
         END

  -- Sentiment positiu (6–7.5): consulta o sol·licitud
  WHEN sub.s >= 6
    THEN CASE WHEN sub.r < 0.55 THEN 'consulta' ELSE 'sol·licitud' END

  -- Sentiment neutre (5–6): mix consulta / sol·licitud / incidència
  ELSE
    CASE
      WHEN sub.r < 0.35 THEN 'consulta'
      WHEN sub.r < 0.70 THEN 'sol·licitud'
      ELSE                   'incidència'
    END
END
FROM (
  SELECT
    id,
    random() AS r,
    CASE
      WHEN sentiment IS NOT NULL
           AND REPLACE(sentiment, ',', '.') ~ '^[0-9]+(\.[0-9]+)?$'
      THEN LEAST(10.0, GREATEST(0.0,
             REPLACE(sentiment, ',', '.')::numeric))
      ELSE 5.0
    END AS s
  FROM sac_messages
) AS sub
WHERE m.id = sub.id;


-- ================================================================
-- FASE 5 · ACTION_REQUIRED
-- Depèn d'intent i department (ja omplerts a les fases 3 i 4).
-- ================================================================
UPDATE sac_messages m
SET action_required = CASE
  WHEN m.intent = 'agraïment'
    THEN 'cap'

  WHEN m.intent = 'consulta'
    THEN 'informar'

  WHEN m.intent = 'suggeriment'
    THEN 'investigar'

  WHEN m.intent = 'sol·licitud'
    THEN CASE
           WHEN m.department IN ('tramits_administratius', 'habitatge', 'serveis_socials')
             THEN 'derivar'
           ELSE 'informar'
         END

  WHEN m.intent IN ('queixa', 'incidència')
    AND m.department IN ('neteja', 'mobilitat', 'urbanisme', 'medi_ambient')
    THEN CASE WHEN sub.r < 0.55 THEN 'reparar' ELSE 'desplaçament_físic' END

  WHEN m.intent IN ('queixa', 'incidència')
    AND m.department = 'seguretat'
    THEN 'investigar'

  WHEN m.intent IN ('queixa', 'incidència')
    AND m.department IN ('serveis_socials', 'habitatge')
    THEN 'derivar'

  WHEN m.intent IN ('queixa', 'incidència')
    THEN 'investigar'

  ELSE 'informar'
END
FROM (SELECT id, random() AS r FROM sac_messages) AS sub
WHERE m.id = sub.id;


-- ================================================================
-- FASE 6 · FOLLOWUP_NEEDED
-- Depèn d'intent, action_required i sentiment (ja omplerts).
-- ================================================================
UPDATE sac_messages
SET followup_needed = CASE
  WHEN intent IN ('queixa', 'incidència')
    THEN TRUE
  WHEN action_required IN ('reparar', 'desplaçament_físic', 'investigar', 'derivar')
    THEN TRUE
  WHEN (
    CASE
      WHEN sentiment IS NOT NULL
           AND REPLACE(sentiment, ',', '.') ~ '^[0-9]+(\.[0-9]+)?$'
      THEN REPLACE(sentiment, ',', '.')::numeric
      ELSE 5.0
    END
  ) < 4.0
    THEN TRUE
  ELSE FALSE
END;


-- ================================================================
-- FASE 7 · CITIZEN_EXPERIENCE_SIGNAL
-- msg_rank = 1 → primera interacció del ciutadà.
-- msg_rank > 1 + avg_sentiment ≥ 5 → reincident satisfet.
-- msg_rank > 1 + avg_sentiment < 5 → reincident frustrat.
-- Ciutadans sense identificar → primera_interacció.
-- ================================================================
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY ciutada
      ORDER BY data_inici ASC NULLS LAST
    ) AS msg_rank,
    AVG(
      CASE
        WHEN sentiment IS NOT NULL
             AND REPLACE(sentiment, ',', '.') ~ '^[0-9]+(\.[0-9]+)?$'
        THEN REPLACE(sentiment, ',', '.')::numeric
        ELSE 5.0
      END
    ) OVER (PARTITION BY ciutada) AS avg_sent
  FROM sac_messages
  WHERE ciutada IS NOT NULL AND ciutada != ''
)
UPDATE sac_messages m
SET citizen_experience_signal = CASE
  WHEN r.msg_rank = 1   THEN 'primera_interacció'
  WHEN r.avg_sent >= 5  THEN 'reincident_satisfet'
  ELSE                       'reincident_frustrat'
END
FROM ranked r
WHERE m.id = r.id;

-- Missatges sense ciutadà identificat
UPDATE sac_messages
SET citizen_experience_signal = 'primera_interacció'
WHERE citizen_experience_signal IS NULL;


-- ================================================================
-- FASE 8 · LOCATION_EXTRACTED
-- No és possible fer NLP en SQL pur.
-- Proxy: s'usa el camp 'barri' com a referència geogràfica.
-- Els registres sense barri queden NULL per actualització manual
-- o posterior processament amb IA per lots petits.
-- ================================================================
UPDATE sac_messages
SET location_extracted = barri
WHERE barri IS NOT NULL AND barri != '';


-- ================================================================
-- VERIFICACIÓ FINAL
-- ================================================================
SELECT
  COUNT(*)                                        AS total,
  COUNT(intent)                                   AS amb_intent,
  COUNT(department)                               AS amb_department,
  COUNT(action_required)                          AS amb_action_required,
  COUNT(CASE WHEN followup_needed THEN 1 END)     AS seguiment_necessari,
  COUNT(language)                                 AS amb_language,
  COUNT(citizen_experience_signal)                AS amb_citizen_signal,
  COUNT(location_extracted)                       AS amb_localitzacio
FROM sac_messages;
