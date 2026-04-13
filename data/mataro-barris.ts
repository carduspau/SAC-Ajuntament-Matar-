import type { FeatureCollection } from 'geojson';

// Approximate neighbourhood boundaries for Mataró (WGS84, [lng, lat])
// Based on the city's real geographic layout
const MATARO_BARRIS: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { nom: "Pla d'en Boet", codi: '01' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [2.424, 41.521], [2.430, 41.520], [2.462, 41.520], [2.470, 41.524],
          [2.468, 41.530], [2.459, 41.533], [2.440, 41.532], [2.428, 41.531],
          [2.422, 41.526], [2.424, 41.521]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { nom: 'Eixample', codi: '02' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [2.440, 41.532], [2.459, 41.533], [2.468, 41.530], [2.473, 41.534],
          [2.475, 41.542], [2.469, 41.546], [2.457, 41.545], [2.447, 41.544],
          [2.440, 41.540], [2.440, 41.532]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { nom: 'Centre', codi: '03' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [2.428, 41.531], [2.440, 41.532], [2.440, 41.540], [2.447, 41.544],
          [2.446, 41.551], [2.438, 41.553], [2.429, 41.549], [2.426, 41.542],
          [2.427, 41.535], [2.428, 41.531]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { nom: 'Cerdanyola', codi: '04' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [2.413, 41.523], [2.424, 41.521], [2.422, 41.526], [2.428, 41.531],
          [2.427, 41.535], [2.426, 41.542], [2.421, 41.547], [2.414, 41.546],
          [2.413, 41.523]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { nom: 'Peramàs', codi: '05' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [2.426, 41.542], [2.429, 41.549], [2.438, 41.553], [2.434, 41.558],
          [2.426, 41.557], [2.420, 41.551], [2.421, 41.547], [2.426, 41.542]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { nom: 'La Llàntia', codi: '06' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [2.414, 41.546], [2.421, 41.547], [2.420, 41.551], [2.426, 41.557],
          [2.422, 41.562], [2.415, 41.561], [2.413, 41.554], [2.414, 41.546]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { nom: 'Rocafonda', codi: '07' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [2.429, 41.549], [2.446, 41.551], [2.457, 41.545], [2.463, 41.551],
          [2.457, 41.562], [2.445, 41.563], [2.434, 41.559],
          [2.438, 41.553], [2.429, 41.549]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { nom: 'El Palau-Escorxador', codi: '08' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [2.457, 41.545], [2.469, 41.546], [2.475, 41.542], [2.481, 41.547],
          [2.481, 41.558], [2.473, 41.563], [2.463, 41.562], [2.463, 41.551],
          [2.457, 41.545]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { nom: 'Cirera', codi: '09' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [2.413, 41.554], [2.422, 41.562], [2.426, 41.557], [2.434, 41.559],
          [2.437, 41.566], [2.432, 41.573], [2.420, 41.576], [2.413, 41.570],
          [2.413, 41.554]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { nom: 'Els Molins', codi: '10' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [2.434, 41.559], [2.445, 41.563], [2.457, 41.562], [2.462, 41.567],
          [2.454, 41.573], [2.440, 41.573], [2.437, 41.566], [2.434, 41.559]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { nom: 'Vista Alegre', codi: '11' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [2.432, 41.573], [2.440, 41.573], [2.454, 41.573], [2.462, 41.567],
          [2.463, 41.562], [2.473, 41.563], [2.481, 41.558], [2.482, 41.566],
          [2.478, 41.578], [2.463, 41.582], [2.446, 41.581], [2.432, 41.578],
          [2.420, 41.576], [2.432, 41.573]
        ]]
      }
    }
  ]
};

export default MATARO_BARRIS;
