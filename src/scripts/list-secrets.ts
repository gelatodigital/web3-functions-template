import dotenv from "dotenv";
import { ethers } from "ethers";
import { Web3Function } from "@gelatonetwork/automate-sdk";
dotenv.config();

const main = async () => {
  if (!process.env.PRIVATE_KEY) throw new Error("Missing env PRIVATE_KEY");
  const pk = process.env.PRIVATE_KEY;

  if (!process.env.PROVIDER_URLS) throw new Error("Missing env PROVIDER_URLS");
  const providerUrl = process.env.PROVIDER_URLS.split(",")[0];

  const chainId = Number(process.argv[2]);
  if (!chainId) throw new Error("Missing positional argument 'chainId'");

  const taskId = process.argv[3];

  // Instanciate provider & signer
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(pk as string, provider);
  const web3Function = new Web3Function(chainId, wallet);

  // Get updated list of secrets
  const secretsList = await web3Function.secrets.list(taskId);
  console.log(`Secrets list: `);
  console.dir(secretsList);
};

main()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
