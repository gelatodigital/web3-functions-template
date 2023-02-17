import { Web3FunctionContextData } from "@gelatonetwork/web3-functions-sdk";
import { fillSecrets } from "../scripts/fill-secrets";
import { runWeb3Function } from "./utils";

const myWeb3FunctionPath = "src/web3-functions/my-web3-function/index.ts";

describe("My Web3 Function test", () => {
  let context: Web3FunctionContextData;

  beforeAll(async () => {
    // Fill up secrets with `SECRETS_*` env
    const secrets = await fillSecrets();

    context = {
      secrets,
      storage: {},
      gelatoArgs: {
        chainId: 5,
        blockTime: Math.floor(Date.now() / 1000),
        gasPrice: "10",
      },
      userArgs: {},
    };
  }, 10000);

  it("canExec: true", async () => {
    const res = await runWeb3Function(myWeb3FunctionPath, context);

    expect(res.result.canExec).toEqual(true);
  });
});
