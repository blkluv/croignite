import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SimulatedYieldStreamerModule", (m) => {
  const admin = m.getAccount(0);
  const asset = m.getParameter(
    "asset",
    "0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0",
  );
  const vault = m.getParameter("vault");
  const ratePerSecond = m.getParameter("ratePerSecond", 100n);

  const streamer = m.contract("SimulatedYieldStreamer", [
    asset,
    vault,
    ratePerSecond,
    admin,
  ]);

  return { streamer };
});
