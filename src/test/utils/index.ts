import {
  Web3FunctionContextData,
  MultiChainProviderConfig,
} from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionRunner } from "@gelatonetwork/web3-functions-sdk/runtime";
import { Web3FunctionBuilder } from "@gelatonetwork/web3-functions-sdk/builder";
import { ethers } from "ethers";

export const runWeb3Function = async (
  web3FunctionPath: string,
  context: Web3FunctionContextData,
  providers?: ethers.providers.JsonRpcProvider[]
) => {
  const buildRes = await Web3FunctionBuilder.build(web3FunctionPath, {
    debug: false,
  });

  if (!buildRes.success)
    throw new Error(`Fail to build web3Function: ${buildRes.error}`);

  const runner = new Web3FunctionRunner(false);
  const runtime: "docker" | "thread" = "thread";
  const memory = buildRes.schema.memory;
  const rpcLimit = 100;
  const timeout = buildRes.schema.timeout * 1000;
  const version = buildRes.schema.web3FunctionVersion;

  const options = {
    runtime,
    showLogs: true,
    memory,
    rpcLimit,
    timeout,
  };
  const script = buildRes.filePath;

  const multiChainProviderConfig: MultiChainProviderConfig = {};

  if (!providers) {
    if (!process.env.PROVIDER_URLS) {
      console.error(`Missing PROVIDER_URLS in .env file`);
      process.exit();
    }

    const urls = process.env.PROVIDER_URLS.split(",");
    providers = [];
    for (const url of urls) {
      providers.push(new ethers.providers.StaticJsonRpcProvider(url));
    }
  }

  for (const provider of providers) {
    const chainId = (await provider.getNetwork()).chainId;

    multiChainProviderConfig[chainId] = provider;
  }

  const res = await runner.run({
    script,
    context,
    options,
    version,
    multiChainProviderConfig,
  });

  if (!res.success) throw new Error(`Fail to run web3 function: ${res.error}`);

  return res;
};
