Project: CroIgnite  
One-liner: A creator-first short-video platform where sponsorships are tokenized as invoice receipts and settled via x402 on Cronos EVM Testnet.

# CROIgnite YouTube Demo Script (8–10 minutes)

## 1. Home Feed + Connect Wallet (Start Here)
- **URL:** /
- **Shot:** Homepage feed with “For You” selected, header connect button visible, and right-rail actions on clips.
- **Steps:**
  1. **Current page:** New browser tab, confirm the tab is open and idle.
  2. **Navigate:** Open URL directly: `/` → lands on `/`, confirm “For You” is selected and a clip is autoplaying.
  3. **Action:** **Current page:** `/`, click the **Connect wallet** button in the header, confirm RainbowKit modal opens.
  4. **Action:** **Current page:** `/`, connect a wallet and confirm the address is shown in the header.
  5. **Action:** **Current page:** `/`, scroll one clip down, confirm the next clip autoplays and the creator handle changes.
  6. **Action:** **Current page:** `/`, click “❤ Like” on the right rail, confirm the icon toggles and the count increments.
  7. **Action:** **Current page:** `/`, pause on the clip CTA area, confirm “Sponsor” and “Boost” actions are visible on the clip UI.
  8. **Verify on-screen:** **Current page:** `/`, confirm autoplay, creator handle, and “For You” selected are visible.
- **Voiceover:**
  > “We start on the homepage, connect a wallet from the header, and make sure we have enough tCRO and devUSDC.e to cover the transactions we’ll run. The feed shows sponsor and boost actions ready for on-chain settlement.”

---

## 2. Post Detail + Comments (Social Proof Loop)
- **URL:** /post/[postId]/[userId]
- **Shot:** Clip detail view with comments panel, comment input, and visible “Sponsor” entry point.
- **Steps:**
  1. **Current page:** `/`, confirm a clip is visible.
  2. **Navigate:** **Current page:** `/`, click “💬 Comments” → lands on `/post/[postId]/[userId]`, confirm a “Comments” heading/panel is visible.
  3. **Action:** **Current page:** `/post/[postId]/[userId]`, click the input labeled “Add a comment”, confirm cursor is active.
  4. **Enter values:**
     - Add a comment = `[COMMENT_TEXT="Sponsoring this clip as an on-chain invoice 🔥"]`
  5. Click **Post**, wait for the comment to appear in the list.
  6. **Verify on-screen:** **Current page:** `/post/[postId]/[userId]`, confirm the new comment row appears with your identity.
- **Voiceover:**
  > “We open comments and post a reaction to show the social layer before we sponsor.”

---

## 3. Creator Profile + Following Feed (Creator Surface + Retention)
- **URL:** /profile/[id] → /following
- **Shot:** Creator header with Follow button, posts grid/list, Boost CTA, and a Following feed filtered to followed creators with “Following” selected.
- **Steps:**
  1. **Current page:** `/post/[postId]/[userId]`, confirm comments are visible.
  2. **Navigate:** **Current page:** `/post/[postId]/[userId]`, click the creator handle → lands on `/profile/[id]`, confirm profile header loads with a “Follow” button.
  3. **Action:** **Current page:** `/profile/[id]`, click **Follow**, confirm it changes to “Following” (or “Unfollow”).
  4. **Action:** **Current page:** `/profile/[id]`, scroll the creator posts and point at the “Boost” call-to-action.
  5. **Navigate:** **Current page:** `/profile/[id]`, click “Following” in the nav → lands on `/following`, confirm the heading/tab shows “Following”.
  6. **Action:** **Current page:** `/following`, scroll one clip down, confirm next clip autoplays from a followed creator.
  7. **Verify on-screen:** **Current page:** `/following`, confirm “Following” tab is active and filtered content is visible.
- **Voiceover:**
  > “Follow a creator and see their clips in your Following feed.”

---

## 4. Ignite Copilot (AI + x402 Pro)
- **URL:** /ignite
- **Shot:** Copilot chat UI with quick prompts + Pro toggle.
- **Steps:**
  1. **Current page:** `/`, confirm wallet is connected in the header.
  2. **Navigate:** **Current page:** `/`, click “Ignite” → lands on `/ignite`, confirm “CroIgnite Copilot” is visible.
  3. **Action:** **Current page:** `/ignite`, click “Enable Pro (x402)”.
  4. **Action:** **Current page:** `/ignite`, enter prompt:
     - Prompt = `[PROMPT="Give me a 3-step plan to sponsor DeFi creators this week."]`
  5. **Action:** **Current page:** `/ignite`, click **Send**, confirm the wallet signature prompt appears (x402 Pro).
  6. **Verify on-screen:** **Current page:** `/ignite`, confirm the response renders and the request completes.
- **Voiceover:**
  > “In Ignite, we enable Pro and ask for a simple sponsorship plan. Pro mode is x402‑paywalled: 402, sign, settle.”

---

## 5. Yield Vault (Custody + Real-Time Yield)
- **URL:** /yield
- **Shot:** Yield vault overview panels (TVL, shares), wallet status card, and the Yield Engine panel showing streaming yield + sync.
- **Steps:**
  1. **Current page:** `/`, confirm wallet is connected in the header.
  2. **Navigate:** **Current page:** `/`, click “Go to yield vault” → lands on `/yield`, confirm “Yield vault” heading is visible.
  3. **Action:** **Current page:** `/yield`, confirm the “Yield engine” panel shows “Streaming now (est.)”.
  4. **Action:** **Current page:** `/yield`, click “Approve” (if required), confirm approval state shows.
  5. **Action:** **Current page:** `/yield`, click “Deposit”, confirm a wallet prompt appears and a success toast or updated shares render.
  6. **Action:** **Current page:** `/yield`, click “Withdraw”, confirm a wallet prompt appears and the share balance updates.
  7. **Verify on-screen:** **Current page:** `/yield`, click “Sync yield on-chain”, confirm a Cronos explorer tx link appears and the pending yield resets or share price updates.
- **Voiceover:**
  > “This vault holds devUSDC.e. We approve, deposit, withdraw, and sync yield.”

---

## 6. Creator Directory + Boost Vault (Discovery to Capital)
- **URL:** /creators → /boost/[creatorId]
- **Shot:** Creator directory with Boost actions, then the boost vault UI with approval and deposit flow.
- **Steps:**
  1. **Current page:** `/yield`, confirm the vault UI is visible.
  2. **Navigate:** **Current page:** `/yield`, click “Explore” → click “Creators” → lands on `/creators`, confirm “Creators” heading is visible.
  3. **Action:** **Current page:** `/creators`, click a creator row labeled “@creator”, confirm it navigates to their profile.
  4. **Action:** **Current page:** `/profile/[id]`, click “Boost”, confirm it navigates to the creator boost vault page.
  5. **Action:** **Current page:** `/boost/[creatorId]`, click the amount field labeled “Amount (devUSDC.e)”, confirm cursor is active.
  6. **Enter values:**
     - Amount (devUSDC.e) = `[BOOST_USDCE=5]`
  7. **Action:** **Current page:** `/boost/[creatorId]`, click “Approve” (if shown), wait for wallet prompt and “Approved” state.
  8. **Action:** **Current page:** `/boost/[creatorId]`, click “Deposit”, wait for “Transaction submitted” toast with explorer link.
  9. **Verify on-screen:** **Current page:** `/boost/[creatorId]`, confirm your boost position updates and a tx link is visible.
- **Voiceover:**
  > “Discover a creator, open their vault, and boost with devUSDC.e.”

---

## 7. Sponsor a Clip (Tokenized Invoice Creation)
- **URL:** /sponsor/[postId]
- **Shot:** Sponsorship page with clip preview, sponsorship breakdown panel, and “Sponsor clip” CTA.
- **Steps:**
  1. **Current page:** `/boost/[creatorId]`, confirm the Boost Vault UI is visible.
  2. **Navigate:** **Current page:** `/boost/[creatorId]`, click “Explore” → click “Feed” → lands on `/` → click a clip → lands on `/post/[postId]/[userId]`, confirm the clip and actions are visible.
  3. **Navigate:** **Current page:** `/post/[postId]/[userId]`, click “Sponsor” → lands on `/sponsor/[postId]`, confirm “Sponsor” heading and clip preview appear.
  4. **Action:** **Current page:** `/sponsor/[postId]`, fill campaign terms (Sponsor name, Objective, Deliverables, Start date, End date).
  5. **Enter values:**
     - Sponsor name = `[SPONSOR_NAME=CroIgnite Launch Fund]`
     - Objective = `[SPONSOR_OBJECTIVE=Launch week push for the remix challenge]`
     - Deliverables (one per line)
       - `1x 15s clip featuring the campaign`
       - `1x caption + link in bio`
       - `1x behind the scenes remix`
     - Start date = `[SPONSOR_START_DATE=2026-01-12]`
     - End date = `[SPONSOR_END_DATE=2026-01-19]`
  6. **Action:** **Current page:** `/sponsor/[postId]`, in “Sponsor with invoice receipts” click input labeled “Amount (devUSDC.e)”.
  7. **Enter values:**
     - Amount (devUSDC.e) = `[SPONSOR_USDCE=1]`
  8. **Action:** **Current page:** `/sponsor/[postId]`, click “Approve sponsor hub” if shown, wait for “Approved” state.
  9. **Action:** **Current page:** `/sponsor/[postId]`, click “Sponsor clip”, wait for wallet prompt and “Transaction submitted” state.
  10. **Verify on-screen:** **Current page:** `/sponsor/[postId]`, confirm a success state shows “Invoice Receipt NFT minted” or a “View Receipt” button appears.
  11. **Action:** **Current page:** `/sponsor/[postId]`, click the Cronos explorer link on the success toast/receipt, confirm it opens to the transaction.
- **Voiceover:**
  > “Sponsorship creates a tokenized invoice receipt with on-chain terms.”

---

## 8. Sponsor via x402 (Gasless Flow)
- **URL:** /sponsor/[postId]?mode=x402
- **Shot:** Sponsor page auto-scrolls to the x402 card.
- **Steps:**
  1. **Current page:** `/sponsor/[postId]`, confirm the page is visible.
  2. **Navigate:** **Current page:** `/sponsor/[postId]`, click the “x402” CTA (or open `/sponsor/[postId]?mode=x402`) and confirm the x402 panel is in view.
  3. **Action:** **Current page:** `/sponsor/[postId]`, click “Sponsor via x402”, confirm the signature request appears.
  4. **Verify on-screen:** **Current page:** `/sponsor/[postId]`, confirm x402 status shows **confirmed** and a Cronos explorer tx link is visible.
  5. **Action:** **Current page:** `/sponsor/[postId]`, click the explorer link to open the settled x402 transaction.
- **Voiceover:**
  > “x402 gives gasless settlement via the facilitator with a Cronos tx hash.”

---

## 9. x402 Demo (Explicit HTTP 402 Proof)
- **URL:** /x402-demo
- **Shot:** x402 demo page with inputs for payTo + amount, request log, and a settled tx hash.
- **Steps:**
  1. **Current page:** `/sponsor/[postId]`, confirm receipt UI is visible.
  2. **Navigate:** **Current page:** `/sponsor/[postId]`, click “Explore” → click “x402 Demo” → lands on `/x402-demo`, confirm heading “x402 Sponsor Demo” is visible.
  3. **Action:** **Current page:** `/x402-demo`, enter a creator wallet as payTo and amount `1`.
  4. **Action:** **Current page:** `/x402-demo`, click “Sponsor via x402”, confirm log shows “Payment Required” then “Payment settled”.
  5. **Verify on-screen:** **Current page:** `/x402-demo`, confirm a Cronos explorer tx link appears.
- **Voiceover:**
  > “402 → sign → settle. That’s the x402 flow on Cronos Testnet.”

---

## 10. Sponsor Remix Pack (x402 Paywall)
- **URL:** /sponsor/[postId]
- **Shot:** Sponsor perks card with “Download sponsor pack.”
- **Steps:**
  1. **Current page:** `/x402-demo`, confirm tx link is visible.
  2. **Navigate:** **Current page:** `/x402-demo`, go back to `/sponsor/[postId]`, confirm the sponsor panel is visible.
  3. **Action:** **Current page:** `/sponsor/[postId]`, click “Download sponsor pack”.
  4. **Action:** **Current page:** `/sponsor/[postId]`, if not a booster, confirm a 402 payment is required, sign the request, then the JSON download starts.
  5. **Verify on-screen:** **Current page:** `/sponsor/[postId]`, confirm “Sponsor pack downloaded.”
- **Voiceover:**
  > “Sponsor perks are paywalled with x402 if you’re not a booster.”

---

## 11. Activity Feed (Auditable Ledger)
- **URL:** /activity
- **Shot:** Activity list with event rows (Boost deposit, Sponsorship invoice, Vault events) and Cronos explorer links.
- **Steps:**
  1. **Current page:** `/campaign/[campaignId]`, confirm the receipt is visible.
  2. **Navigate:** **Current page:** `/campaign/[campaignId]`, click “Explore” → click “Activity feed” → lands on `/activity`, confirm “Activity” heading and rows appear.
  3. **Action:** **Current page:** `/activity`, click “Next” in pagination, confirm rows update and page indicator changes.
  4. **Action:** **Current page:** `/activity`, click “View on Cronos Explorer” on an invoice/sponsorship row, confirm explorer opens on the tx.
  5. **Action:** **Current page:** `/activity`, click “Previous”, confirm you return to the prior page of events.
  6. **Verify on-screen:** **Current page:** `/activity`, confirm event types include Sponsorship/Invoice and Boost/Vault actions.
- **Voiceover:**
  > “Everything is auditable with Cronos explorer links.”

---

## 12. Projects + AI Editor + Export (Creator Workspace)
- **URL:** /projects
- **Shot:** Projects list with a new project flow, then AI Studio generation, timeline edit, and export UI.
- **Steps:**
  1. **Current page:** `/settings`, confirm settings heading is visible.
  2. **Navigate:** **Current page:** `/settings`, click "Projects" in the sidebar/nav → lands on `/projects`, confirm project list heading appears.
  3. **Action:** **Current page:** `/projects`, click "New project", confirm the create dialog appears.
  4. **Enter values:**
     - Project name = `[PROJECT_NAME="Creator draft"]`
  5. **Action:** **Current page:** `/projects`, click "Create", confirm the new project row appears.
  6. **Action:** **Current page:** `/projects`, click "Open" on "Creator draft", confirm navigation to `/projects/[id]`.
  7. **Action:** **Current page:** `/projects/[id]`, in the Library panel under "AI Studio", click "Generate", confirm redirect to `/settings` with the OpenAI key card visible.
  8. **Enter values:** **Current page:** `/settings`
     - OpenAI API key = `[OPENAI_API_KEY="sk-your-key"]`
  9. **Action:** **Current page:** `/settings`, click "Save key", confirm success toast and return to `/projects/[id]`.
  10. **Action:** **Current page:** `/projects/[id]`, open "AI Studio" → click "Generate" to open "Generate with Sora".
  11. **Enter values:**
      - Prompt = `[SORA_PROMPT="A creator filming a short clip on a city rooftop at sunrise, cinematic, smooth handheld motion"]`
  12. **Action:** **Current page:** `/projects/[id]`, click "Generate clip", confirm the job appears in "History" and the clip shows in the Library when ready.
  13. **Action:** **Current page:** `/projects/[id]`, drag the generated clip onto the timeline, confirm the clip block appears.
  14. **Action:** **Current page:** `/projects/[id]`, click "Text" in the left sidebar, set "Default text" to `[TITLE_TEXT="CroIgnite launch teaser"]`, click "Title", confirm the title appears on the canvas.
  15. **Action:** **Current page:** `/projects/[id]`, click "Preview", confirm playback starts and playhead moves.
  16. **Action:** **Current page:** `/projects/[id]`, click "Export" then "Start Export", wait for "Export complete" state.
  17. **Verify on-screen:** **Current page:** `/projects/[id]`, confirm "Export complete" and "Download MP4" are visible.
- **Voiceover:**
  > “Creators generate, edit, and export clips in one workflow.”

---

## 13. Upload (Publish AI Edit to Feed)
- **URL:** /upload
- **Shot:** Upload page with file picker, caption input, and Publish button; success redirect to feed.
- **Steps:**
  1. **Current page:** `/projects/[id]`, confirm “Export complete” is visible.
  2. **Navigate:** **Current page:** `/projects/[id]`, click “Upload” in top nav → lands on `/upload`, confirm “Upload” heading is visible.
  3. **Action:** **Current page:** `/upload`, click “Choose File”, confirm OS file picker opens.
  4. **Enter values:**
     - Video file = `[FILE="croignite_ai_edit.mp4"]`
     - Caption = `[CAPTION="Sora rooftop teaser edited in CROIgnite"]`
  5. Click “Publish”, wait for “Uploaded” toast and redirect to `/`.
  6. **Verify on-screen:** **Current page:** `/`, confirm the new clip appears in the feed with the caption visible.
- **Voiceover:**
  > “Upload the export and publish it to the feed.”

---

## Closing (Tracks + Impact)
- **ON SCREEN:** quick montage: `/ignite` Pro mode, `/sponsor/[postId]?mode=x402`, `/x402-demo` 402→settled, `/campaign/[id]`, `/activity`.
- **VOICEOVER:**
  > “CROIgnite ships x402 payments and the Crypto.com AI Agent on Cronos Testnet.”
- **Final line:**
  > “That’s CROIgnite—creator-first video, sponsor receipts, and x402 settlement on Cronos.”

---

## Optional “Judge-friendly” overlay captions (lower-thirds)
- “Cronos Testnet · devUSDC.e + tCRO”
- “x402: HTTP 402 → Sign → Settle”
- “Invoice Receipt = tokenized sponsorship record”
- “Ignite = Crypto.com AI Agent copilot”

---

## Strong x402 proof moment (recommended)
During `/x402-demo`, do a quick zoom on the response showing:
- `status: 402`
- `paymentRequirements.network = cronos-testnet`
- `paymentRequirements.asset = devUSDC.e`

Then show the successful second call + tx hash.
