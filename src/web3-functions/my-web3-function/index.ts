import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

// Fill this out with your Web3 Function logic
Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider } = context;

  // Return execution call data
  return {
    canExec: true,
    callData: "YOUR_EXECUTION_PAYLOAD",
  };
});
