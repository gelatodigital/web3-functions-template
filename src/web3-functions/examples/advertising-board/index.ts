import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { utils } from "ethers";
import ky from "ky"; // we recommend using ky as axios doesn't support fetch by default

const AD_BOARD_ABI = [
  "function postMessage(string)",
  "function viewMessage(address)",
];

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { storage, gelatoArgs } = context;

  const lastPost = Number(await storage.get("lastPost")) ?? 0;
  const adBoardInterface = new utils.Interface(AD_BOARD_ABI);

  const nextPostTime = lastPost + 3600; // 1h
  const timestamp = gelatoArgs.blockTime;

  if (timestamp < nextPostTime) {
    return { canExec: false, message: `Time not elapsed` };
  }

  let message = "";
  try {
    const randomQuoteApi = `https://zenquotes.io/api/random`;

    const quote: { q: string; a: string }[] = await ky
      .get(randomQuoteApi, { timeout: 5_000, retry: 0 })
      .json();

    message = `${quote[0].a}: ${quote[0].q}`;
    console.log(message);
  } catch (err) {
    return { canExec: false, message: `QuoteApi call failed` };
  }

  await storage.set("lastPost", timestamp.toString());

  return {
    canExec: true,
    callData: adBoardInterface.encodeFunctionData("postMessage", [message]),
  };
});
