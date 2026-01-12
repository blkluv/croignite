/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as admin from "../admin.js";
import type * as boostPass from "../boostPass.js";
import type * as boostPassPublisher from "../boostPassPublisher.js";
import type * as campaignReceipts from "../campaignReceipts.js";
import type * as chain_confirmCampaign from "../chain/confirmCampaign.js";
import type * as chain_confirmVaultTx from "../chain/confirmVaultTx.js";
import type * as comments from "../comments.js";
import type * as creatorVaults from "../creatorVaults.js";
import type * as cronos from "../cronos.js";
import type * as crons from "../crons.js";
import type * as env from "../env.js";
import type * as follows from "../follows.js";
import type * as leaderboards from "../leaderboards.js";
import type * as lib_activity from "../lib/activity.js";
import type * as likes from "../likes.js";
import type * as posts from "../posts.js";
import type * as profiles from "../profiles.js";
import type * as projects from "../projects.js";
import type * as sponsorCampaigns from "../sponsorCampaigns.js";
import type * as vaultTx from "../vaultTx.js";
import type * as x402CampaignReceipts from "../x402CampaignReceipts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  admin: typeof admin;
  boostPass: typeof boostPass;
  boostPassPublisher: typeof boostPassPublisher;
  campaignReceipts: typeof campaignReceipts;
  "chain/confirmCampaign": typeof chain_confirmCampaign;
  "chain/confirmVaultTx": typeof chain_confirmVaultTx;
  comments: typeof comments;
  creatorVaults: typeof creatorVaults;
  cronos: typeof cronos;
  crons: typeof crons;
  env: typeof env;
  follows: typeof follows;
  leaderboards: typeof leaderboards;
  "lib/activity": typeof lib_activity;
  likes: typeof likes;
  posts: typeof posts;
  profiles: typeof profiles;
  projects: typeof projects;
  sponsorCampaigns: typeof sponsorCampaigns;
  vaultTx: typeof vaultTx;
  x402CampaignReceipts: typeof x402CampaignReceipts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
