import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { gelatoArgs, multiChainProvider } = context;

  return {
    canExec: true,
    callData: [],
  };
});
