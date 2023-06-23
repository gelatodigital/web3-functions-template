import path from "path";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { Web3Function, AutomateSDK } from "@gelatonetwork/automate-sdk";
import { Web3FunctionBuilder } from "@gelatonetwork/web3-functions-sdk/builder";
import { Web3FunctionLoader } from "@gelatonetwork/web3-functions-sdk/loader";
dotenv.config();

if (!process.env.PRIVATE_KEY) throw new Error("Missing env PRIVATE_KEY");
const pk = process.env.PRIVATE_KEY;

if (!process.env.PROVIDER_URLS) throw new Error("Missing env PROVIDER_URLS");
const providerUrl = process.env.PROVIDER_URLS.split(",")[0];

const w3fRootDir = path.join( "web3-functions");
const w3fName = "secrets";

const main = async () => {
  // Instanciate provider & signer
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const chainId = (await provider.getNetwork()).chainId;
  const wallet = new ethers.Wallet(pk as string, provider);
  const automate = new AutomateSDK(chainId, wallet);

  // Deploy Web3Function on IPFS
  console.log("Deploying Web3Function on IPFS...");
  const web3FunctionPath = path.join(
    "web3-functions",
    "secrets",
    "index.ts"
  );
  const cid = await Web3FunctionBuilder.deploy(web3FunctionPath);
  console.log(`Web3Function IPFS CID: ${cid}`);

  // Create task using automate-sdk
  console.log("Creating automate task...");
  const { taskId, tx } = await automate.createBatchExecTask({
    name: "Web3Function - Eth Oracle Secret Api",
    web3FunctionHash: cid,
    web3FunctionArgs: {
      oracle: "0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da",
      currency: "ethereum",
    },
  });
  await tx.wait();
  console.log(`Task created, taskId: ${taskId} (tx hash: ${tx.hash})`);
  console.log(
    `> https://beta.app.gelato.network/task/${taskId}?chainId=${chainId}`
  );

  // Set secrets
  const { secrets } = Web3FunctionLoader.load(w3fName, w3fRootDir);
  const web3FunctionHelper = new Web3Function(chainId, wallet);
  if (Object.keys(secrets).length > 0) {
    await web3FunctionHelper.secrets.set(secrets, taskId);
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
