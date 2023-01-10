import dotenv from "dotenv";
import { ethers } from "ethers";
import { GelatoOpsSDK } from "@gelatonetwork/ops-sdk";
import { JsResolverBuilder } from "@gelatonetwork/js-resolver-sdk/builder";
import setSecrets from "./set-secrets";
dotenv.config();

if (!process.env.PRIVATE_KEY) throw new Error("Missing env PRIVATE_KEY");
const pk = process.env.PRIVATE_KEY;

if (!process.env.PROVIDER_URL) throw new Error("Missing env PROVIDER_URL");
const providerUrl = process.env.PROVIDER_URL;

// Default Setting
const chainId = 5;
const oracleAddress = "0x6a3c82330164822A8a39C7C0224D20DB35DD030a";
const oracleAbi = [
  "function lastUpdated() external view returns(uint256)",
  "function updatePrice(uint256)",
];

const main = async () => {
  // Instanciate provider & signer
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(pk as string, provider);
  const opsSdk = new GelatoOpsSDK(chainId, wallet);

  // Deploy JsResolver on IPFS
  console.log("Deploying JsResolver on IPFS...");
  const jsResolver = "./src/resolvers/oraclePvtApi/index.ts";
  const cid = await JsResolverBuilder.deploy(jsResolver);
  console.log(`JsResolver IPFS CID: ${cid}`);

  // Create task using ops-sdk
  console.log("Creating automate task...");
  const oracleInterface = new ethers.utils.Interface(oracleAbi);
  const { taskId, tx } = await opsSdk.createTask({
    name: "JsResolver - Eth Oracle Pvt Api",
    execAddress: oracleAddress,
    execSelector: oracleInterface.getSighash("updatePrice"),
    dedicatedMsgSender: true,
    jsResolverHash: cid,
    jsResolverArgs: {
      oracle: "0x6a3c82330164822A8a39C7C0224D20DB35DD030a",
      currency: "ethereum",
    },
  });
  await tx.wait();
  console.log(`Task created, taskId: ${taskId} (tx hash: ${tx.hash})`);
  console.log(
    `> https://beta.app.gelato.network/task/${taskId}?chainId=${chainId}`
  );

  await setSecrets();
};

main()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
