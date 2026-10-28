import { z } from 'zod';

/**
 * What a saved resume may contain. Mirrors src/types/resume.ts and the
 * limits in pdf-service/lib/validate.mjs, so anything an account can store is
 * something the PDF service will print. Unknown fields are dropped; missing
 * ones default to empty, as the editor itself does.
 *
 * The one deliberate difference is the photo: the editor downscales uploads
 * to ~100 KB, so storage caps it at 2 MB rather than the PDF service's 6 MB,
 * which exists for unprocessed uploads from older clients.
 */
export const LIMITS = Object.freeze({
  shortText: 300,
  longText: 6_000,
  experiences: 40,
  education: 20,
  skills: 120,
  projects: 40,
  customFields: 20,
  customItems: 60,
  photoChars: 2 * 1024 * 1024,
  title: 120,
});

const short = z.string().max(LIMITS.shortText).default('');
const long = z.string().max(LIMITS.longText).default('');
const id = z.string().min(1).max(LIMITS.shortText);

const photo = z
  .string()
  .max(LIMITS.photoChars)
  .refine((v) => v === '' || /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(v), {
    message: 'photo must be an inline image (a data: URL)',
  })
  .default('');

export const resumeDataSchema = z.object({
  personalInfo: z
    .object({
      fullName: short,
      email: short,
      phone: short,
      location: short,
      title: short,
      summary: long,
      linkedin: short,
      website: short,
      photo,
    })
    .default({
      fullName: '',
      email: '',
      phone: '',
      location: '',
      title: '',
      summary: '',
      linkedin: '',
      website: '',
      photo: '',
    }),
  experiences: z
    .array(
      z.object({
        id,
        company: short,
        position: short,
        startDate: short,
        endDate: short,
        current: z.boolean().default(false),
        description: long,
      }),
    )
    .max(LIMITS.experiences)
    .default([]),
  education: z
    .array(
      z.object({
        id,
        institution: short,
        degree: short,
        field: short,
        startDate: short,
        endDate: short,
        gpa: short,
      }),
    )
    .max(LIMITS.education)
    .default([]),
  skills: z
    .array(
      z.object({
        id,
        name: short,
        // The editor's 0–100 slider.
        level: z.number().finite().min(0).max(100).default(80),
      }),
    )
    .max(LIMITS.skills)
    .default([]),
  projects: z
    .array(
      z.object({
        id,
        name: short,
        description: long,
        link: short,
        technologies: short,
      }),
    )
    .max(LIMITS.projects)
    .default([]),
  customFields: z
    .array(
      z.object({
        id,
        sectionTitle: short,
        items: z
          .array(z.object({ id, title: short, subtitle: short, description: long }))
          .max(LIMITS.customItems)
          .default([]),
      }),
    )
    .max(LIMITS.customFields)
    .default([]),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;

export const templateIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/, 'not a template id');
const titleSchema = z.string().trim().min(1).max(LIMITS.title);

export const createResumeSchema = z.object({
  title: titleSchema.optional(),
  templateId: templateIdSchema,
  data: resumeDataSchema.default(resumeDataSchema.parse({})),
});

export const updateResumeSchema = z
  .object({
    /** The version the client last saw. A different one on the server means another device saved in between. */
    version: z.number().int().min(1),
    title: titleSchema.optional(),
    templateId: templateIdSchema.optional(),
    data: resumeDataSchema.optional(),
  })
  .refine((v) => v.title !== undefined || v.templateId !== undefined || v.data !== undefined, {
    message: 'nothing to update',
  });

/** "Amara Okonkwo" → "Amara Okonkwo's resume"; nothing typed yet → "Untitled resume". */
export function defaultTitle(data: ResumeData): string {
  const name = data.personalInfo.fullName.trim();
  return (name ? `${name}'s resume` : 'Untitled resume').slice(0, LIMITS.title);
}
