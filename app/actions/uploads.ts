"use server";
import { z } from "zod";
import { action, ActionError } from "@/lib/action";
import { buildKey, presignPut, privateBucket, publicBucket } from "@/lib/r2";
import { ALLOWED_DOC_TYPES, MAX_DOC_BYTES } from "@/lib/validations/forms";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Step 1 of every upload: the client asks for a presigned R2 URL, then PUTs the file
 * directly to R2 (no file bytes pass through our functions), then calls a "save" action
 * with the returned key.
 *
 * - `image`: public bucket; must be processed with processUploadedImage() before use.
 * - `document`: private bucket (claims, verification, ticket attachments); read via signed URLs only.
 */
export const requestUpload = action(
  {
    schema: z.object({
      kind: z.enum(["image", "document"]),
      scope: z.enum(["business", "claim", "verification", "ticket", "avatar", "content"]),
      fileName: z.string().min(1).max(200),
      contentType: z.string().min(1),
      size: z.number().int().positive(),
    }),
    rateLimit: "upload",
  },
  async (input, { user }) => {
    if (input.kind === "image") {
      if (!(IMAGE_TYPES as readonly string[]).includes(input.contentType)) throw new ActionError("Upload a JPG, PNG, WebP, GIF or AVIF image.");
      if (input.size > MAX_IMAGE_BYTES) throw new ActionError("Images must be 10 MB or smaller.");
    } else {
      if (!(ALLOWED_DOC_TYPES as readonly string[]).includes(input.contentType)) throw new ActionError("Upload a JPG, PNG, BMP, PDF, DOC or DOCX file.");
      if (input.size > MAX_DOC_BYTES) throw new ActionError("Files must be 10 MB or smaller.");
    }
    if (input.scope === "content" && !["admin", "editor"].includes(user.role ?? "")) throw new ActionError("Not allowed.");

    const key = buildKey(`${input.scope}/${user.id}`, input.fileName);
    const bucket = input.kind === "image" ? publicBucket() : privateBucket();
    const url = await presignPut({ bucket, key, contentType: input.contentType, maxBytes: input.size });
    return { ok: true, data: { url, key } };
  },
);
