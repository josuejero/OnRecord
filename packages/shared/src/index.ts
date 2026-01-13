import { z } from 'zod';

export const RoomId = z.string().min(1);

export const QuestionSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  body: z.string().min(1),
  status: z.enum(['pending', 'approved', 'needs_edit', 'rejected', 'answered'])
});

export type Question = z.infer<typeof QuestionSchema>;

export const AnswerSchema = z.object({
  id: z.string().min(1),
  question_id: z.string().min(1),
  session_id: z.string().min(1),
  body: z.string().min(1),
  created_at: z.string().min(1)
});

export type Answer = z.infer<typeof AnswerSchema>;

export const AiRecapProviderSchema = z.enum(['mock', 'browser', 'ollama']);
export type AiRecapProvider = z.infer<typeof AiRecapProviderSchema>;

export const EvidenceSpanSchema = z
  .object({
    start_offset: z.number().int().min(0),
    end_offset: z.number().int().positive()
  })
  .superRefine(({ start_offset, end_offset }, ctx) => {
    if (end_offset <= start_offset) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'end_offset must be greater than start_offset'
      });
    }
  });

export const SpanLabelSchema = z
  .object({
    start_offset: z.number().int().min(0),
    end_offset: z.number().int().positive(),
    label_type: z.string().min(1),
    label_value: z.string().min(1).optional().nullable()
  })
  .superRefine(({ start_offset, end_offset }, ctx) => {
    if (end_offset <= start_offset) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'end_offset must be greater than start_offset'
      });
    }
  });

const RecapKeyConcernSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  evidence_span: EvidenceSpanSchema.optional(),
  label: SpanLabelSchema.optional()
});

export const RecapSchema = z.object({
  summary: z.string().min(1),
  key_concerns: z.array(RecapKeyConcernSchema).min(1),
  follow_up_questions: z.array(z.string().min(1)).default([]),
  safety_notes: z.string().min(1),
  verification_notes: z.string().min(1).optional(),
  model_info: z.object({
    provider: AiRecapProviderSchema,
    model_id: z.string().min(1),
    prompt_version: z.string().min(1),
    executed_at: z.string().min(1),
    hardware: z.string().min(1).optional()
  }),
  labels: z.array(SpanLabelSchema).optional()
});

export type Recap = z.infer<typeof RecapSchema>;
