import SidebarButton from "./SidebarButton";
import { Library } from "lucide-react";

export default function LibraryButton({
  onClick,
  active = false,
}: {
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <SidebarButton
      label="Library"
      icon={<Library className="h-6 w-6" />}
      onClick={onClick}
      active={active}
    />
  );
}
