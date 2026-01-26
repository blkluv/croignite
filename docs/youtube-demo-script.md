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
  > “We open Sponsor, fill the campaign terms, set the devUSDC.e amount, approve the sponsor hub, and submit. The receipt view confirms the invoice and we open the Cronos tx to prove it settled.”

---

## 8. Sponsor via x402 (Gasless Flow)
- **URL:** /sponsor/[postId]?mode=x402
- **Shot:** Sponsor page auto-scrolls to the x402 card.
- **Steps:**
  1. **Current page:** `/sponsor/[postId]`, confirm the page is visible.
  2. **Navigate:** **Current page:** `/sponsor/[postId]`, click the “x402” CTA (or open `/sponsor/[postId]?mode=x402`) and confirm the x402 panel is in view.
  3. **Action:** **Current page:** `/sponsor/[postId]`, fill the same campaign terms used above.
  4. **Enter values:**
     - Sponsor name = `[SPONSOR_NAME=CroIgnite Launch Fund]`
     - Objective = `[SPONSOR_OBJECTIVE=Launch week push for the remix challenge]`
     - Deliverables (one per line)
       - `1x 15s clip featuring the campaign`
       - `1x caption + link in bio`
       - `1x behind the scenes remix`
     - Start date = `[SPONSOR_START_DATE=2026-01-12]`
     - End date = `[SPONSOR_END_DATE=2026-01-19]`
  5. **Action:** **Current page:** `/sponsor/[postId]`, in the x402 card, click the amount input and set `1` devUSDC.e.
  6. **Action:** **Current page:** `/sponsor/[postId]`, click “Sponsor via x402”, confirm the signature request appears.
  7. **Verify on-screen:** **Current page:** `/sponsor/[postId]`, confirm x402 status shows **confirmed** and a Cronos explorer tx link is visible.
  8. **Action:** **Current page:** `/sponsor/[postId]`, click the explorer link to open the settled x402 transaction.
- **Voiceover:**
  > “Now we repeat the same sponsorship, but settle via x402. We sign the payment authorization, the facilitator settles on Cronos, and we open the tx hash for proof.”

---

## 9. Projects + AI Editor + Export (Creator Workspace)
- **URL:** /projects
- **Shot:** Projects list with a new project flow, then AI Studio generation, timeline edit, and export UI.
- **Steps:**
  1. **Current page:** `/settings`, confirm settings heading is visible (OpenAI key already saved).
  2. **Navigate:** **Current page:** `/settings`, click "Projects" in the sidebar/nav → lands on `/projects`, confirm project list heading appears.
  3. **Action:** **Current page:** `/projects`, click "New project", confirm the create dialog appears.
  4. **Enter values:**
     - Project name = `[PROJECT_NAME="Creator draft"]`
  5. **Action:** **Current page:** `/projects`, click "Create", confirm the new project row appears.
  6. **Action:** **Current page:** `/projects`, click "Open" on "Creator draft", confirm navigation to `/projects/[id]`.
  7. **Action:** **Current page:** `/projects/[id]`, open "AI Studio" → click "Generate" to open "Generate with Sora".
  8. **Enter values:**
      - Prompt = `[SORA_PROMPT="A creator filming a short clip on a city rooftop at sunrise, cinematic, smooth handheld motion"]`
  9. **Action:** **Current page:** `/projects/[id]`, click "Generate clip", confirm the job appears in "History" and the clip shows in the Library when ready.
  10. **Action:** **Current page:** `/projects/[id]`, drag the generated clip onto the timeline, confirm the clip block appears.
  11. **Action:** **Current page:** `/projects/[id]`, click "Text" in the left sidebar, set "Default text" to `[TITLE_TEXT="CroIgnite launch teaser"]`, click "Title", confirm the title appears on the canvas.
  12. **Action:** **Current page:** `/projects/[id]`, click "Preview", confirm playback starts and playhead moves.
  13. **Action:** **Current page:** `/projects/[id]`, click "Export" then "Start Export", wait for "Export complete" state.
  14. **Verify on-screen:** **Current page:** `/projects/[id]`, confirm "Export complete" and "Download MP4" are visible.
- **Voiceover:**
  > “We create a new project, generate a Sora clip, drop it on the timeline, add a title, preview the edit, and export an MP4—everything happens inside the creator workspace.”

---

## 10. Upload (Publish AI Edit to Feed)
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
  > “We upload the exported MP4, add a caption, publish, and the new clip appears in the feed ready for sponsorship and boosts.”
