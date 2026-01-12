import SidebarButton from "./SidebarButton";
import { Download } from "lucide-react";

export default function ExportButton({
  onClick,
  active = false,
}: {
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <SidebarButton
      label="Export"
      icon={<Download className="h-6 w-6" />}
      onClick={onClick}
      active={active}
    />
  );
}
