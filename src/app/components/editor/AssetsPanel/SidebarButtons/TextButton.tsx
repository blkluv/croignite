import SidebarButton from "./SidebarButton";
import { Type } from "lucide-react";

export default function TextButton({
  onClick,
  active = false,
}: {
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <SidebarButton
      label="Text"
      icon={<Type className="h-6 w-6" />}
      onClick={onClick}
      active={active}
    />
  );
}
