import { z } from 'zod';

export const REGION_IDS = ['north', 'west', 'central', 'east', 'south'] as const;
export const LEVELS = ['explorer', 'geographer'] as const;

export const localizedSchema = z.object({ fr: z.string().min(1), en: z.string().min(1) });

export const countryMetaSchema = z.object({
  code: z.string().length(3),
  iso2: z.string().length(2),
  names: localizedSchema,
  region: z.enum(REGION_IDS),
  landlocked: z.boolean(),
  island: z.boolean(),
});
export const countriesSchema = z.array(countryMetaSchema).length(54);

export const capitalRoleSchema = z.enum([
  'official',
  'political',
  'economic',
  'seat',
  'administrative',
  'legislative',
  'executive',
  'judicial',
  'former',
]);

export const latSchema = z.number().min(-90).max(90);
export const lonSchema = z.number().min(-180).max(180);

export const capitalsSchema = z
  .array(
    z.object({
      code: z.string().length(3),
      cities: z
        .array(
          z.object({
            names: localizedSchema,
            lat: latSchema,
            lon: lonSchema,
            role: capitalRoleSchema,
          }),
        )
        .min(1),
      sourceUrl: z.url().optional(),
    }),
  )
  .length(54);

const levelSchema = z.enum(LEVELS);

export const placeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['capital', 'city', 'monument', 'nature']),
  country: z.string().length(3),
  names: localizedSchema,
  lat: latSchema,
  lon: lonSchema,
  level: levelSchema,
  role: capitalRoleSchema.optional(),
  blurb: localizedSchema.optional(),
  sourceUrl: z.url().optional(),
});

export const reliefKindSchema = z.enum([
  'desert',
  'mountain',
  'basin',
  'plain',
  'valley',
  'plateau',
  'wetland',
  'delta',
]);

export const reliefSchema = z.object({
  id: z.string(),
  kind: reliefKindSchema,
  level: levelSchema,
  names: localizedSchema,
  label: z.tuple([lonSchema, latSchema]),
  samples: z.array(z.tuple([lonSchema, latSchema])),
});

export const placesFileSchema = z.object({
  places: z.array(placeSchema),
  relief: z.array(reliefSchema),
  neighbors: z.record(z.string(), z.array(z.string())),
});

const position = z.tuple([z.number(), z.number()]);

export const riverFeatureSchema = z.object({
  id: z.string(),
  names: localizedSchema,
  level: levelSchema,
  lines: z.array(z.array(position).min(2)).min(1),
});

export const lakeFeatureSchema = z.object({
  id: z.string(),
  names: localizedSchema,
  level: levelSchema,
  polygons: z.array(z.array(z.array(position).min(3)).min(1)).min(1),
});

export const hydroFileSchema = z.object({
  rivers: z.array(riverFeatureSchema),
  lakes: z.array(lakeFeatureSchema),
});

export type CountryMeta = z.infer<typeof countryMetaSchema>;
export type PlaceData = z.infer<typeof placeSchema>;
export type ReliefData = z.infer<typeof reliefSchema>;
export type RiverData = z.infer<typeof riverFeatureSchema>;
export type LakeData = z.infer<typeof lakeFeatureSchema>;
export type HydroFile = z.infer<typeof hydroFileSchema>;
export type PlacesFile = z.infer<typeof placesFileSchema>;
