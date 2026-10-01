import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""));

export const leadFormSchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required.").max(160),
  domain: optionalText(255),
  website: optionalText(500),
  industry: optionalText(160),
  location: optionalText(160),
  companySize: optionalText(100),
  description: optionalText(3000),
  whyRelevant: optionalText(3000),
  potentialService: optionalText(500),
  contactName: optionalText(160),
  jobTitle: optionalText(160),
  email: z
    .string()
    .trim()
    .max(320)
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid email address."
    ),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;
