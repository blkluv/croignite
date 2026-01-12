import type { MediaFile, TextElement } from "@/app/types";
import { TextSequenceItem } from "./items/text-sequence-item";
import { AudioSequenceItem } from "./items/audio-sequence-item";
import { VideoSequenceItem } from "./items/video-sequence-item";
import { ImageSequenceItem } from "./items/image-sequence-item";

interface SequenceItemOptions {
  handleTextChange?: (id: string, text: string) => void;
  fps: number;
  renderScale: number;
  editableTextId?: string | null;
  currentTime?: number;
}

type SequenceItemRenderers = {
  video: (item: MediaFile, options: SequenceItemOptions) => JSX.Element;
  text: (item: TextElement, options: SequenceItemOptions) => JSX.Element;
  image: (item: MediaFile, options: SequenceItemOptions) => JSX.Element;
  audio: (item: MediaFile, options: SequenceItemOptions) => JSX.Element;
  unknown: (item: MediaFile, options: SequenceItemOptions) => JSX.Element;
};

export const SequenceItem: SequenceItemRenderers = {
  video: (item: MediaFile, options: SequenceItemOptions) => {
    return <VideoSequenceItem item={item} options={options} />;
  },
  text: (item: TextElement, options: SequenceItemOptions) => {
    return <TextSequenceItem item={item} options={options} />;
  },
  image: (item: MediaFile, options: SequenceItemOptions) => {
    return <ImageSequenceItem item={item} options={options} />;
  },
  audio: (item: MediaFile, options: SequenceItemOptions) => {
    return <AudioSequenceItem item={item} options={options} />;
  },
  unknown: () => {
    return <></>;
  },
};
