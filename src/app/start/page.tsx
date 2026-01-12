import { getYouTubeVideoId } from "@/lib/utils";
import StartClient from "./StartClient";

export default function StartPage() {
  const demoVideoUrl =
    process.env.DEMO_VIDEO_URL?.trim() ||
    "https://www.youtube.com/";
  const demoVideoId = getYouTubeVideoId(demoVideoUrl);
  const demoEmbedSrc = demoVideoId
    ? `https://www.youtube-nocookie.com/embed/${demoVideoId}?rel=0&modestbranding=1`
    : null;

  return <StartClient demoEmbedSrc={demoEmbedSrc} />;
}
