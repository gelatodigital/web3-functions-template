import { Web3FunctionContextData } from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionRunner } from "@gelatonetwork/web3-functions-sdk/runtime";
import { Web3FunctionBuilder } from "@gelatonetwork/web3-functions-sdk/builder";
import { ethers } from "ethers";

export const runWeb3Function = async (
  web3FunctionPath: string,
  context: Web3FunctionContextData,
  provider?: ethers.providers.JsonRpcProvider
) => {
  const buildRes = await Web3FunctionBuilder.build(web3FunctionPath, false);

  if (!buildRes.success)
    throw new Error(`Fail to build web3Function: ${buildRes.error}`);

  const runner = new Web3FunctionRunner(false);
  const runtime: "docker" | "thread" = "thread";
  const memory = buildRes.schema.memory;
  const rpcLimit = 100;
  const timeout = buildRes.schema.timeout * 1000;

  const options = {
    runtime,
    showLogs: true,
    memory,
    rpcLimit,
    timeout,
  };
  const script = buildRes.filePath;

  if (!provider) {
    if (!process.env.PROVIDER_URL) {
      console.error(`Missing PROVIDER_URL in .env file`);
      process.exit();
    }

    provider = new ethers.providers.StaticJsonRpcProvider(
      process.env.PROVIDER_URL
    );
  }

  const res = await runner.run({ script, context, options, provider });

  if (!res.success) throw new Error(`Fail to run web3 function: ${res.error}`);

  return res;
};
