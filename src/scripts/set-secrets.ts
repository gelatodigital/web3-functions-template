import dotenv from "dotenv";
import { ethers } from "ethers";
import { Web3Function, Secrets } from "@gelatonetwork/ops-sdk";
dotenv.config();

if (!process.env.PRIVATE_KEY) throw new Error("Missing env PRIVATE_KEY");
const pk = process.env.PRIVATE_KEY;

if (!process.env.PROVIDER_URL) throw new Error("Missing env PROVIDER_URL");
const providerUrl = process.env.PROVIDER_URL;

// Default Setting
const chainId = 5;

const setSecrets = async () => {
  // Instanciate provider & signer
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(pk as string, provider);
  const web3Function = new Web3Function(chainId, wallet);

  let secrets: Secrets = {};

  // Fill up secrets with `SECRETS_*` env
  console.log("Setting secrets...");
  Object.keys(process.env)
    .filter((key) => key.startsWith("SECRETS_"))
    .forEach((key) => {
      const secret = process.env[key] as string;
      secrets = {
        ...secrets,
        [key.replace("SECRETS_", "")]: secret,
      };
    });

  await web3Function.secrets.set(secrets);

  // Get updated list of secrets
  const secretsList = await web3Function.secrets.list();
  console.log(`Updated secrets list: `);
  console.dir(secretsList);
};

export default setSecrets;
