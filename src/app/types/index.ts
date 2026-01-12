export type MediaType = "video" | "audio" | "image" | "unknown";

export type TrackKind = "layer";

export interface TimelineTrack {
  id: string;
  kind: TrackKind;
  name: string; // e.g. "Layer 1"
  muted?: boolean;
  locked?: boolean;
  hidden?: boolean;
}

export interface TimelineMarker {
  id: string;
  time: number; // seconds on timeline
  label?: string;
  color?: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  type?: MediaType;
  src?: string;
}

export interface MediaFile {
  id: string;
  fileName: string;
  fileId: string;
  type: MediaType;
  trackId?: string;
  startTime: number; // within the source video
  src?: string;
  endTime: number;
  sourceDurationSeconds?: number;
  positionStart: number; // position in the final video
  positionEnd: number;
  includeInMerge: boolean;
  playbackSpeed: number;
  volume: number;
  zIndex: number;

  // Optional visual settings
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  blur?: number;

  // Effects
  crop?: { x: number; y: number; width: number; height: number };
}

export interface TextElement {
  id: string;
  text: string; // The actual text content
  includeInMerge?: boolean;
  trackId?: string;

  // Timing
  positionStart: number; // When text appears in final video
  positionEnd: number; // When text disappears

  // Position & Size (canvas-based)
  x: number;
  y: number;
  width?: number;
  height?: number;

  // Styling
  font?: string; // Font family (e.g., 'Arial', 'Roboto')
  fontSize?: number; // Font size in pixels
  color?: string; // Text color (hex or rgba)
  backgroundColor?: string; // Background behind text
  align?: "left" | "center" | "right"; // Horizontal alignment
  zIndex?: number; // Layering

  // Effects
  opacity?: number; // Transparency (0 to 1)
  rotation?: number; // Rotation in degrees
  fadeInDuration?: number; // Seconds to fade in
  fadeOutDuration?: number; // Seconds to fade out
  animation?: "slide-in" | "zoom" | "bounce" | "fade" | "slide-up" | "none"; // Optional animation
  blur?: number; // Optional blur filter

  // Runtime only (not persisted)
  visible?: boolean; // Internal flag for rendering logic
}

export type ExportFormat = "mp4" | "webm" | "gif" | "mov";

export type RenderEngine = "ffmpeg" | "gpu";

export interface ExportConfig {
  resolution: string;
  quality: string;
  speed: string;
  fps: number; // TODO: add this as an option
  format: ExportFormat; // TODO: add this as an option
  includeSubtitles: boolean; // TODO: add this as an option
  renderEngine: RenderEngine;
}

export type ActiveElement = "media" | "text" | "export";

export type ProjectPublishRecord = {
  ipId: string;
  licenseTermsId?: string;
  txHash?: string;
  title: string;
  summary: string;
  terms: string;
  videoUrl: string;
  thumbnailUrl?: string;
  videoKey?: string;
  thumbnailKey?: string;
  videoSha256?: string;
  thumbnailSha256?: string;
  ipMetadataUri: string;
  ipMetadataHash?: string;
  nftMetadataUri: string;
  nftMetadataHash?: string;
  createdAt: string;
};

export type ProjectUploadRecord = {
  videoUrl: string;
  thumbnailUrl?: string;
  videoKey: string;
  thumbnailKey?: string;
  uploadedAt: string;
};

export interface ProjectExport {
  id: string;
  fileId: string;
  name: string;
  createdAt: string;
  durationSeconds: number;
  fileSizeBytes: number;
  config: ExportConfig;
  upload?: ProjectUploadRecord;
  publish?: ProjectPublishRecord;
}

export interface ProjectState {
  id: string;
  ownerWallet?: string;
  mediaFiles: MediaFile[];
  textElements: TextElement[];
  tracks: TimelineTrack[];
  markers: TimelineMarker[];
  filesID?: string[];
  soraJobs: SoraJob[];
  exports: ProjectExport[];
  currentTime: number;
  isPlaying: boolean;
  isMuted: boolean;
  duration: number;
  zoomLevel: number;
  timelineZoom: number;
  enableMarkerTracking: boolean;
  projectName: string;
  createdAt: string;
  lastModified: string;
  activeSection: ActiveElement | null;
  activeElement: ActiveElement | null;
  activeElementIndex: number;

  resolution: { width: number; height: number };
  fps: number;
  aspectRatio: string;
  history: ProjectHistoryEntry[]; // stack for undo
  future: ProjectHistoryEntry[]; // stack for redo
  historyLockDepth: number; // internal: groups gesture edits
  exportSettings: ExportConfig;
}

export type ProjectHistoryEntry = Omit<
  ProjectState,
  | "history"
  | "future"
  | "historyLockDepth"
  | "currentTime"
  | "isPlaying"
  | "isMuted"
  | "timelineZoom"
  | "enableMarkerTracking"
  | "activeSection"
  | "activeElement"
  | "activeElementIndex"
  | "soraJobs"
>;

export type SoraModel = import("@/features/ai/sora/capabilities").SoraModel;
export type SoraSeconds = import("@/features/ai/sora/capabilities").SoraSeconds;
export type SoraSize = import("@/features/ai/sora/capabilities").SoraSize;

export type SoraJobStatus =
  | "queued"
  | "creating"
  | "polling"
  | "downloading"
  | "completed"
  | "failed";

export interface SoraJob {
  id: string; // local id
  jobId?: string; // Sora job id from API
  model?: SoraModel;
  prompt: string;
  seconds: SoraSeconds;
  size: SoraSize;
  status: SoraJobStatus;
  createdAt: string;
  updatedAt: string;
  message?: string;
  error?: string;
  contentUrl?: string | null;
  fileId?: string;
  mediaId?: string;
}

export interface UserContextTypes {
  user: User | null;
  isLoading: boolean;
  openConnect: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  bio: string;
  image: string;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  username?: string;
  image: string;
  bio: string;
}

export interface CreatorVaultRecord {
  wallet: string;
  vault: string;
  txHash?: string;
  createdAt: number;
}

export interface SponsorCampaign {
  postId: string;
  clipHash: string;
  creatorId: string;
  vaultAddress: string;
  sponsorAddress: string;
  assets: string;
  protocolFeeWei: string;
  campaignId: string;
  receiptTokenId: string;
  invoiceReceiptAddress: string;
  txHash: string;
  createdAt: number;
}

export interface CampaignReceipt {
  postId: string;
  clipHash: string;
  creatorId: string;
  sponsorAddress: string;
  boostVault: string;
  assetsWei: string;
  protocolFeeWei: string;
  campaignId: string;
  receiptTokenId: string;
  invoiceReceiptAddress: string;
  termsHash: string;
  txHash: string;
  sponsorName: string;
  objective: string;
  deliverables: string[];
  startDateIso: string;
  endDateIso: string;
  disclosure: string;
  status: "pending" | "confirmed" | "failed";
  confirmedAt?: number;
  l2BlockNumber?: number;
  l2TimestampIso?: string;
  createdAt: number;
}

export interface X402CampaignReceipt {
  postId: string;
  creatorId: string;
  sponsorAddress: string;
  payTo: string;
  assetsWei: string;
  asset: string;
  network: string;
  nonce?: string;
  validBefore?: number;
  txHash: string;
  blockNumber?: number;
  timestampIso: string;
  sponsorName: string;
  objective: string;
  deliverables: string[];
  startDateIso: string;
  endDateIso: string;
  disclosure: string;
  status: "pending" | "confirmed" | "failed";
  confirmedAt?: number;
  createdAt: number;
}

export type CampaignReceiptView =
  | { type: "onchain"; receipt: CampaignReceipt }
  | { type: "x402"; receipt: X402CampaignReceipt };

export type VaultTxKind = "boostDeposit" | "sponsorDeposit" | "yieldDeposit";

export interface VaultTx {
  kind: VaultTxKind;
  wallet: string;
  creatorId?: string;
  postId?: string;
  assetsWei: string;
  txHash: string;
  chainId: number;
  status: "pending" | "confirmed" | "failed";
  confirmedAt?: number;
  l2BlockNumber?: number;
  l2TimestampIso?: string;
  createdAt: number;
}

export interface LeaderboardSnapshot {
  ts: number;
  topCreators: { creatorId: string; sponsoredWei: string; boostWei: string }[];
  topBoosters: { wallet: string; boostWei: string }[];
}

export interface BoostPassEpoch {
  epoch: number;
  publishedAt: number;
  publishedBy: string;
  txHash?: string;
  topWallets: string[];
}

export interface BoostPassClaim {
  epoch: number;
  wallet: string;
  txHash: string;
  claimedAt: number;
}

export interface RandomUsers {
  id: string;
  name: string;
  username?: string;
  image: string;
}

export interface CropperDimensions {
  height?: number | null;
  width?: number | null;
  left?: number | null;
  top?: number | null;
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string;
}

export interface Post {
  id: string;
  user_id: string;
  video_url: string;
  text: string;
  created_at: string;
}

export interface PostWithProfile {
  id: string;
  user_id: string;
  video_url: string;
  text: string;
  created_at: string;
  profile: {
    user_id: string;
    name: string;
    username?: string;
    image: string;
  };
}

export interface CommentWithProfile {
  id: string;
  user_id: string;
  post_id: string;
  text: string;
  created_at: string;
  profile: {
    user_id: string;
    name: string;
    username?: string;
    image: string;
  };
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  text: string;
  created_at: string;
}

export interface ShowErrorObject {
  type: string;
  message: string;
}

export interface UploadError {
  type: string;
  message: string;
}

export interface CommentsHeaderCompTypes {
  params: { userId: string; postId: string };
  post: PostWithProfile;
}

export interface CommentsCompTypes {
  params: { userId: string; postId: string };
}

export interface PostPageTypes {
  params: Promise<{ userId: string; postId: string }>;
}

export interface ProfilePageTypes {
  params: Promise<{ id: string }>;
}

export interface SingleCommentCompTypes {
  params: { userId: string; postId: string };
  comment: CommentWithProfile;
}

export interface PostUserCompTypes {
  post: Post;
}

export interface PostMainCompTypes {
  post: PostWithProfile;
}

export interface PostMainLikesCompTypes {
  post: PostWithProfile;
}

export interface TextInputCompTypes {
  string: string;
  inputType: string;
  placeholder: string;
  onUpdate: (newValue: string) => void;
  error: string;
}

export interface MenuItemTypes {
  iconString: string;
  colorString: string;
  sizeString: string;
}

export interface MenuItemFollowCompTypes {
  user: RandomUsers;
}

export const mimeToExt = {
  "video/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/webm": "webm",
  // TODO: Add more as needed
};
