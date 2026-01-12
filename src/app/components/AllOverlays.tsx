"use client";

import { useGeneralStore } from "@/app/stores/general";
import ClientOnly from "./ClientOnly";
import EditProfileOverlay from "./profile/EditProfileOverlay";

export default function AllOverlays() {
  const { isEditProfileOpen } = useGeneralStore();

  return (
    <ClientOnly>
      {isEditProfileOpen ? <EditProfileOverlay /> : null}
    </ClientOnly>
  );
}
