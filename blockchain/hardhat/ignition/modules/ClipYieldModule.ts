import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ClipYieldModule", (m) => {
  const admin = m.getAccount(0);

  const asset = m.getParameter(
    "asset",
    "0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0",
  );
  const shareName = m.getParameter("shareName", "CroIgnite Vault Share");
  const shareSymbol = m.getParameter("shareSymbol", "ciSHARE");
  const creatorCutBps = m.getParameter("creatorCutBps", 1500);
  const protocolFeeBps = m.getParameter("protocolFeeBps", 500);

  const vault = m.contract("ClipYieldVault", [asset, admin, shareName, shareSymbol]);
  const boostFactory = m.contract("ClipYieldBoostVaultFactory", [
    asset,
    creatorCutBps,
    admin,
  ]);
  const invoiceReceipts = m.contract("ClipYieldInvoiceReceipts", [admin]);
  const sponsorHub = m.contract("ClipYieldSponsorHub", [
    asset,
    vault,
    invoiceReceipts,
    protocolFeeBps,
  ]);

  m.call(invoiceReceipts, "setMinter", [sponsorHub]);

  return { vault, boostFactory, sponsorHub, invoiceReceipts };
});
