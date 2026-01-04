import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional().default(''),
    publishDate: z.string(),
    pubDate: z.string().optional(),
    draft: z.boolean().optional().default(false),
    colors: z.object({
      b1: z.string(),
      b2: z.string(),
      b3: z.string(),
    }).optional().default({ b1: 'bg-sky-200', b2: 'bg-cyan-200', b3: 'bg-blue-200' }),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    github: z.string().optional(),
    deploy: z.string().optional(),
    appstore: z.string().optional(),
    objective: z.string(),
    stack: z.string(),
    year: z.union([z.string(), z.number()]).transform(String),
    timeline: z.string(),
    languages: z.string(),
    draft: z.boolean().optional().default(false),
    colors: z.object({
      b1: z.string(),
      b2: z.string(),
      b3: z.string(),
    }),
  }),
});

export const collections = { blog, projects };
