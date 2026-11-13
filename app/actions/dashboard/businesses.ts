"use server";
import { z } from "zod";
import { action } from "@/lib/action";
import * as biz from "@/lib/businesses";
import { detailsSchema, SECTIONS } from "@/lib/validations/business";
import { SLUG_RE } from "@/lib/validations/business";

export const checkSlug = action(
  { schema: z.object({ slug: z.string().max(80), businessId: z.uuid().optional() }), rateLimit: "write" },
  async ({ slug, businessId }) => {
    if (!SLUG_RE.test(slug) || slug.length < 3) return { ok: true, data: { available: false, suggestion: await biz.uniqueSlug(slug || "business", businessId) } };
    const available = await biz.isSlugAvailable(slug, businessId);
    return { ok: true, data: { available, suggestion: available ? slug : await biz.uniqueSlug(slug, businessId) } };
  },
);

export const createDraft = action({ schema: detailsSchema, rateLimit: "write" }, async (input, { user }) => {
  const id = await biz.createDraft(user, input);
  return { ok: true, message: "Draft saved", data: { id } };
});

export const saveSection = action(
  {
    schema: z.object({ businessId: z.uuid(), section: z.enum(SECTIONS), data: z.unknown(), wizardStep: z.number().int().min(1).max(6).optional() }),
    rateLimit: "write",
  },
  async ({ businessId, section, data, wizardStep }, { user }) => {
    const res = await biz.saveSection(user, businessId, section, data, { immediate: true, wizardStep });
    return {
      ok: true,
      message: res.backToReview ? "Saved. Name, category and address changes go back to review before they're live." : "Changes saved",
    };
  },
);

export const submitForReview = action({ schema: z.object({ businessId: z.uuid() }), rateLimit: "write" }, async ({ businessId }, { user }) => {
  await biz.submitForReview(user, businessId);
  return { ok: true, message: "Submitted for review. Your listing will go live on the website after an admin approves it." };
});

export const deleteBusiness = action({ schema: z.object({ businessId: z.uuid() }), rateLimit: "write" }, async ({ businessId }, { user }) => {
  await biz.softDelete(user, businessId);
  return { ok: true, message: "Business deleted. You can restore it for 30 days." };
});

export const restoreBusiness = action({ schema: z.object({ businessId: z.uuid() }), rateLimit: "write" }, async ({ businessId }, { user }) => {
  await biz.restore(user, businessId);
  return { ok: true, message: "Business restored" };
});

export const duplicateBusiness = action({ schema: z.object({ businessId: z.uuid() }), rateLimit: "write" }, async ({ businessId }, { user }) => {
  const id = await biz.duplicate(user, businessId);
  return { ok: true, message: "Copy created as a draft", data: { id } };
});

export const addMedia = action(
  { schema: z.object({ businessId: z.uuid(), type: z.enum(["logo", "banner", "gallery"]), key: z.string().min(5) }), rateLimit: "upload" },
  async ({ businessId, type, key }, { user }) => {
    const m = await biz.addMedia(user, businessId, type, key);
    return { ok: true, message: "Photo uploaded", data: { id: m.id, url: m.url, type: m.type, width: m.width, height: m.height } };
  },
);

export const deleteMedia = action({ schema: z.object({ mediaId: z.uuid() }), rateLimit: "write" }, async ({ mediaId }, { user }) => {
  await biz.deleteMedia(user, mediaId);
  return { ok: true, message: "Photo removed" };
});

export const reorderGallery = action(
  { schema: z.object({ businessId: z.uuid(), ids: z.array(z.uuid()).max(20) }), rateLimit: "write" },
  async ({ businessId, ids }, { user }) => {
    await biz.reorderGallery(user, businessId, ids);
    return { ok: true, message: "Order saved" };
  },
);
