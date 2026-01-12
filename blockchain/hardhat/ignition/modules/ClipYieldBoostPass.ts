import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ClipYieldBoostPass", (m) => {
  const admin = m.getAccount(0);
  const baseUri = m.getParameter("baseUri");

  const boostPass = m.contract("ClipYieldBoostPass", [baseUri, admin]);

  return { boostPass };
});
