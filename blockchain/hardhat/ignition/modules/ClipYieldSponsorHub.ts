import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ClipYieldSponsorHub", (m) => {
  const admin = m.getAccount(0);
  const wmnt = m.getParameter(
    "wmnt",
    "0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0",
  );
  const yieldVault = m.getParameter("yieldVault");
  const protocolFeeBps = m.getParameter("protocolFeeBps", 500);

  const invoiceReceipts = m.contract("ClipYieldInvoiceReceipts", [admin]);
  const hub = m.contract("ClipYieldSponsorHub", [
    wmnt,
    yieldVault,
    invoiceReceipts,
    protocolFeeBps,
  ]);

  m.call(invoiceReceipts, "setMinter", [hub]);

  return { hub, invoiceReceipts };
});
