import type { FunctionReference } from "convex/server";

const asQuery = (name: string) => name as unknown as FunctionReference<"query">;
const asMutation = (name: string) =>
  name as unknown as FunctionReference<"mutation">;

export const listPosts = asQuery("posts:list");
export const listPostsPaginated = asQuery("posts:listPaginated");
export const listFollowingPosts = asQuery("posts:byFollowing");
export const listFollowingPostsPaginated = asQuery("posts:byFollowingPaginated");
export const listPostsByUser = asQuery("posts:byUser");
export const listLikedPostsByUser = asQuery("posts:likedByUser");
export const getPost = asQuery("posts:get");
export const createPost = asMutation("posts:create");
export const generatePostUploadUrl = asMutation("posts:generateUploadUrl");
export const deletePost = asMutation("posts:remove");

export const getProfile = asQuery("profiles:getByWallet");
export const ensureProfile = asMutation("profiles:ensure");
export const updateProfile = asMutation("profiles:update");
export const searchProfiles = asQuery("profiles:searchByName");
export const listRandomProfiles = asQuery("profiles:listRandom");
export const getCreatorVaultByWallet = asQuery("creatorVaults:getByWallet");

export const listComments = asQuery("comments:byPost");
export const createComment = asMutation("comments:create");
export const removeComment = asMutation("comments:remove");

export const listLikes = asQuery("likes:byPost");
export const isLiked = asQuery("likes:isLiked");
export const createLike = asMutation("likes:create");
export const removeLike = asMutation("likes:remove");

export const isFollowing = asQuery("follows:isFollowing");
export const countFollowers = asQuery("follows:countFollowers");
export const countFollowing = asQuery("follows:countFollowing");
export const listFollowing = asQuery("follows:listFollowing");
export const listFollowingProfiles = asQuery("follows:listFollowingProfiles");
export const toggleFollow = asMutation("follows:toggle");

export const createProject = asMutation("projects:create");
export const listProjectsByWallet = asQuery("projects:listByWallet");
export const getProjectByLocalId = asQuery("projects:getByLocalId");

export const getSponsorCampaignByPostId = asQuery("sponsorCampaigns:byPostId");
export const createSponsorCampaign = asMutation("sponsorCampaigns:create");

export const createCampaignReceipt = asMutation("campaignReceipts:create");
export const getCampaignReceipt = asQuery("campaignReceipts:get");
export const getX402CampaignReceipt = asQuery("x402CampaignReceipts:get");

export const createVaultTx = asMutation("vaultTx:create");
export const getVaultTxByHash = asQuery("vaultTx:getByTxHash");
export const getLatestVaultTx = asQuery("vaultTx:getLatestForWallet");

export const getLatestLeaderboard = asQuery("leaderboards:getLatest");

export const getLatestBoostPassEpoch = asQuery("boostPass:getLatestEpoch");
export const logBoostPassEpoch = asMutation("boostPass:logEpochPublish");
export const logBoostPassClaim = asMutation("boostPass:logClaim");
