import MainLayout from "@/app/layouts/MainLayout";
import FlowLegend from "@/components/data-display/FlowLegend";
import YieldPanel from "@/features/yield/components/YieldPanel";
import YieldStreamingPanel from "@/features/yield/components/YieldStreamingPanel";

export default function YieldPage() {
  return (
    <MainLayout>
      <div className="w-full px-4 pb-24 pt-[100px] lg:pr-0">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <FlowLegend active="yield" />
          <YieldStreamingPanel />
          <YieldPanel
            title="Yield vault"
            description="Personal ERC-4626 vault for devUSDC.e. Testnet yield streams from a funded buffer; production swaps in audited strategies."
            yieldSourceCopy="Protocol fee donations and the streaming testnet buffer increase share value; production replaces the simulator with real strategy returns."
            receiptTitle="Yield receipt"
            receiptDescription="Latest deposit into the CroIgnite vault."
          />
        </div>
      </div>
    </MainLayout>
  );
}
