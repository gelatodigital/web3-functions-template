import dotenv from "dotenv";
import { ethers } from "ethers";
import { Web3Function } from "@gelatonetwork/ops-sdk";
dotenv.config();

if (!process.env.PRIVATE_KEY) throw new Error("Missing env PRIVATE_KEY");
const pk = process.env.PRIVATE_KEY;

if (!process.env.PROVIDER_URL) throw new Error("Missing env PROVIDER_URL");
const providerUrl = process.env.PROVIDER_URL;

// Default Setting
const chainId = 5;

const main = async () => {
  // Instanciate provider & signer
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(pk as string, provider);
  const Web3Function = new Web3Function(chainId, wallet);

  // Remove each key passed as argument
  if (process.argv.length > 2) {
    const keys = process.argv.slice(2);
    for (const key of keys) {
      await Web3Function.secrets.delete(key.trim());
    }
  }
};

main()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
