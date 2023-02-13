import dotenv from "dotenv";
import { ethers } from "ethers";
import { Web3Function, GelatoOpsSDK } from "@gelatonetwork/ops-sdk";
import { Web3FunctionBuilder } from "@gelatonetwork/web3-functions-sdk/builder";
import { fillSecrets } from "./fill-secrets";
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
  const web3Function = new Web3Function(chainId, wallet);

  // Deploy Web3Function on IPFS
  console.log("Deploying Web3Function on IPFS...");
  const web3FunctionPath = "./src/web3-functions/examples/secrets/index.ts";
  const cid = await Web3FunctionBuilder.deploy(web3FunctionPath);
  console.log(`Web3Function IPFS CID: ${cid}`);

  // Create task using ops-sdk
  console.log("Creating automate task...");
  const oracleInterface = new ethers.utils.Interface(oracleAbi);
  const { taskId, tx } = await opsSdk.createTask({
    name: "Web3Function - Eth Oracle Secret Api",
    execAddress: oracleAddress,
    execSelector: oracleInterface.getSighash("updatePrice"),
    dedicatedMsgSender: true,
    web3FunctionHash: cid,
    web3FunctionArgs: {
      oracle: "0x6a3c82330164822A8a39C7C0224D20DB35DD030a",
      currency: "ethereum",
    },
  });
  await tx.wait();
  console.log(`Task created, taskId: ${taskId} (tx hash: ${tx.hash})`);
  console.log(
    `> https://beta.app.gelato.network/task/${taskId}?chainId=${chainId}`
  );

  const secrets = await fillSecrets();
  await web3Function.secrets.set(secrets);

  // Get updated list of secrets
  const secretsList = await web3Function.secrets.list();
  console.log(`Updated secrets list: `);
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
