import { relations } from "drizzle-orm";
import { users } from "./auth";
import { cities, states } from "./locations";
import {
  businessCategories,
  businessHours,
  businessSeo,
  businesses,
  categories,
  media,
  socialLinks,
} from "./businesses";
import { favorites, reviewReplies, reviewReports, reviews } from "./reviews";
import { leads } from "./leads";
import { claimDocuments, claims } from "./claims";
import { supportTickets, ticketAttachments, ticketMessages } from "./tickets";
import { blogCategories, blogPosts, landingPages, topProsItems, topProsPages } from "./content";

export const statesRelations = relations(states, ({ many }) => ({ cities: many(cities) }));
export const citiesRelations = relations(cities, ({ one }) => ({
  state: one(states, { fields: [cities.stateId], references: [states.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: "tree" }),
  children: many(categories, { relationName: "tree" }),
  businesses: many(businessCategories),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, { fields: [businesses.ownerId], references: [users.id] }),
  state: one(states, { fields: [businesses.stateId], references: [states.id] }),
  city: one(cities, { fields: [businesses.cityId], references: [cities.id] }),
  categories: many(businessCategories),
  hours: many(businessHours),
  media: many(media),
  socialLinks: many(socialLinks),
  seo: one(businessSeo, { fields: [businesses.id], references: [businessSeo.businessId] }),
  reviews: many(reviews),
  landingPages: many(landingPages),
}));

export const businessCategoriesRelations = relations(businessCategories, ({ one }) => ({
  business: one(businesses, { fields: [businessCategories.businessId], references: [businesses.id] }),
  category: one(categories, { fields: [businessCategories.categoryId], references: [categories.id] }),
}));
export const businessHoursRelations = relations(businessHours, ({ one }) => ({
  business: one(businesses, { fields: [businessHours.businessId], references: [businesses.id] }),
}));
export const mediaRelations = relations(media, ({ one }) => ({
  business: one(businesses, { fields: [media.businessId], references: [businesses.id] }),
}));
export const socialLinksRelations = relations(socialLinks, ({ one }) => ({
  business: one(businesses, { fields: [socialLinks.businessId], references: [businesses.id] }),
}));
export const businessSeoRelations = relations(businessSeo, ({ one }) => ({
  business: one(businesses, { fields: [businessSeo.businessId], references: [businesses.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  business: one(businesses, { fields: [reviews.businessId], references: [businesses.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  reply: one(reviewReplies, { fields: [reviews.id], references: [reviewReplies.reviewId] }),
  reports: many(reviewReports),
}));
export const reviewRepliesRelations = relations(reviewReplies, ({ one }) => ({
  review: one(reviews, { fields: [reviewReplies.reviewId], references: [reviews.id] }),
}));
export const reviewReportsRelations = relations(reviewReports, ({ one }) => ({
  review: one(reviews, { fields: [reviewReports.reviewId], references: [reviews.id] }),
}));
export const favoritesRelations = relations(favorites, ({ one }) => ({
  business: one(businesses, { fields: [favorites.businessId], references: [businesses.id] }),
}));
export const leadsRelations = relations(leads, ({ one }) => ({
  business: one(businesses, { fields: [leads.businessId], references: [businesses.id] }),
}));

export const claimsRelations = relations(claims, ({ one, many }) => ({
  business: one(businesses, { fields: [claims.businessId], references: [businesses.id] }),
  user: one(users, { fields: [claims.userId], references: [users.id] }),
  documents: many(claimDocuments),
}));
export const claimDocumentsRelations = relations(claimDocuments, ({ one }) => ({
  claim: one(claims, { fields: [claimDocuments.claimId], references: [claims.id] }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, { fields: [supportTickets.userId], references: [users.id] }),
  business: one(businesses, { fields: [supportTickets.businessId], references: [businesses.id] }),
  messages: many(ticketMessages),
}));
export const ticketMessagesRelations = relations(ticketMessages, ({ one, many }) => ({
  ticket: one(supportTickets, { fields: [ticketMessages.ticketId], references: [supportTickets.id] }),
  author: one(users, { fields: [ticketMessages.authorId], references: [users.id] }),
  attachments: many(ticketAttachments),
}));
export const ticketAttachmentsRelations = relations(ticketAttachments, ({ one }) => ({
  message: one(ticketMessages, { fields: [ticketAttachments.messageId], references: [ticketMessages.id] }),
}));

export const landingPagesRelations = relations(landingPages, ({ one }) => ({
  business: one(businesses, { fields: [landingPages.businessId], references: [businesses.id] }),
}));
export const topProsPagesRelations = relations(topProsPages, ({ one, many }) => ({
  state: one(states, { fields: [topProsPages.stateId], references: [states.id] }),
  city: one(cities, { fields: [topProsPages.cityId], references: [cities.id] }),
  category: one(categories, { fields: [topProsPages.categoryId], references: [categories.id] }),
  items: many(topProsItems),
}));
export const topProsItemsRelations = relations(topProsItems, ({ one }) => ({
  page: one(topProsPages, { fields: [topProsItems.pageId], references: [topProsPages.id] }),
  business: one(businesses, { fields: [topProsItems.businessId], references: [businesses.id] }),
}));
export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  category: one(blogCategories, { fields: [blogPosts.categoryId], references: [blogCategories.id] }),
  author: one(users, { fields: [blogPosts.authorId], references: [users.id] }),
}));
