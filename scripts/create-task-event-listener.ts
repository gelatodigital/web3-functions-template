import path from "path";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { AutomateSDK } from "@gelatonetwork/automate-sdk";
import { Web3FunctionBuilder } from "@gelatonetwork/web3-functions-sdk/builder";
dotenv.config();

if (!process.env.PRIVATE_KEY) throw new Error("Missing env PRIVATE_KEY");
const pk = process.env.PRIVATE_KEY;

if (!process.env.PROVIDER_URLS) throw new Error("Missing env PROVIDER_URLS");
const providerUrl = process.env.PROVIDER_URLS.split(",")[0];

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
    "event-listener",
    "index.ts"
  );
  const cid = await Web3FunctionBuilder.deploy(web3FunctionPath);
  console.log(`Web3Function IPFS CID: ${cid}`);

  // Create task using automate-sdk
  console.log("Creating automate task...");
  const { taskId, tx } = await automate.createBatchExecTask({
    name: "Web3Function - Event Counter",
    web3FunctionHash: cid,
    web3FunctionArgs: {
      oracle: "0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da",
      counter: "0x8F143A5D62de01EAdAF9ef16d4d3694380066D9F",
    },
  });
  await tx.wait();
  console.log(`Task created, taskId: ${taskId} (tx hash: ${tx.hash})`);
  console.log(
    `> https://beta.app.gelato.network/task/${taskId}?chainId=${chainId}`
  );
};

main()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
