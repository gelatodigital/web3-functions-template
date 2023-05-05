import { Log } from "@ethersproject/providers";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { Contract } from "ethers";

const MAX_RANGE = 100; // limit range of events to comply with rpc providers
const MAX_REQUESTS = 100; // limit number of requests on every execution to avoid hitting timeout
const ORACLE_ABI = ["event PriceUpdated(uint256 indexed time, uint256 price)"];
const COUNTER_ABI = ["function increaseCount(uint256)"];

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, storage, multiChainProvider } = context;

  const provider = multiChainProvider.default();

  // Create oracle & counter contract
  const oracleAddress =
    (userArgs.oracle as string) ?? "0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da";
  const counterAddress =
    (userArgs.counter as string) ??
    "0x8F143A5D62de01EAdAF9ef16d4d3694380066D9F";
  const oracle = new Contract(oracleAddress, ORACLE_ABI, provider);
  const counter = new Contract(counterAddress, COUNTER_ABI, provider);
  const topics = [oracle.interface.getEventTopic("PriceUpdated")];
  const currentBlock = await provider.getBlockNumber();

  // Retrieve last processed block number & nb events matched from storage
  const lastBlockStr = await storage.get("lastBlockNumber");
  let lastBlock = lastBlockStr ? parseInt(lastBlockStr) : currentBlock - 2000;
  let totalEvents = parseInt((await storage.get("totalEvents")) ?? "0");
  console.log(`Last processed block: ${lastBlock}`);
  console.log(`Total events matched: ${totalEvents}`);

  // Fetch recent logs in range of 100 blocks
  const logs: Log[] = [];
  let nbRequests = 0;
  while (lastBlock < currentBlock && nbRequests < MAX_REQUESTS) {
    nbRequests++;
    const fromBlock = lastBlock + 1;
    const toBlock = Math.min(fromBlock + MAX_RANGE, currentBlock);
    console.log(`Fetching log events from blocks ${fromBlock} to ${toBlock}`);
    try {
      const eventFilter = {
        address: oracleAddress,
        topics,
        fromBlock,
        toBlock,
      };
      const result = await provider.getLogs(eventFilter);
      logs.push(...result);
      lastBlock = toBlock;
    } catch (err) {
      return { canExec: false, message: `Rpc call failed: ${err.message}` };
    }
  }

  // Parse retrieved events
  console.log(`Matched ${logs.length} new events`);
  const nbNewEvents = logs.length;
  totalEvents += logs.length;
  for (const log of logs) {
    const event = oracle.interface.parseLog(log);
    const [time, price] = event.args;
    console.log(
      `Price updated: ${price}$ at ${new Date(time * 1000).toUTCString()}`
    );
  }

  // Update storage for next run
  await storage.set("lastBlockNumber", currentBlock.toString());
  await storage.set("totalEvents", totalEvents.toString());

  if (nbNewEvents === 0) {
    return {
      canExec: false,
      message: `Total events matched: ${totalEvents} (at block #${currentBlock.toString()})`,
    };
  }

  // Increase number of events matched on our OracleCounter contract
  return {
    canExec: true,
    callData: [
      {
        to: counterAddress,
        data: counter.interface.encodeFunctionData("increaseCount", [
          nbNewEvents,
        ]),
      },
    ],
  };
});
