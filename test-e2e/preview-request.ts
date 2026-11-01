import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { parseUnits } from "viem";
import { createSignedRequest, encode } from "../packages/shared/src/index";

async function main() {
  const merchant = privateKeyToAccount(generatePrivateKey());
  const signed = await createSignedRequest(merchant, "bluebottle.eth", parseUnits("14.50", 6));
  const payload = encode(signed);
  const b64url = Buffer.from(payload, "utf8").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  console.log(`http://localhost:5173/pay?req=${b64url}`);
}
main();
