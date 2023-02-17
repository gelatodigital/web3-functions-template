import { Web3FunctionContextData } from "@gelatonetwork/web3-functions-sdk";
import { fillSecrets } from "../scripts/fill-secrets";
import { runWeb3Function } from "./utils";
import { AnvilServer } from "./utils/anvil-server";

const oracleWeb3FunctionPath =
  "src/web3-functions/examples/advertising-board/index.ts";

describe("Advertising Board Web3 Function test", () => {
  let context: Web3FunctionContextData;
  let goerliFork: AnvilServer;

  beforeAll(async () => {
    goerliFork = await AnvilServer.fork({
      forkBlockNumber: 8483100,
      forkUrl: "https://rpc.ankr.com/eth_goerli",
    });

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

  afterAll(async () => {
    goerliFork.kill();
  });

  it("canExec: false - Time not elapsed", async () => {
    const blockTime = (await goerliFork.provider.getBlock("latest")).timestamp;

    // mock storage state of "lastPost"
    context.storage = { lastPost: blockTime.toString() };
    // pass current block time
    context.gelatoArgs.blockTime = blockTime;

    const res = await runWeb3Function(
      oracleWeb3FunctionPath,
      context,
      goerliFork.provider
    );

    expect(res.result.canExec).toEqual(false);
  });

  it("canExec: True - Time elapsed", async () => {
    const blockTimeBefore = (await goerliFork.provider.getBlock("latest"))
      .timestamp;
    const nextPostTime = blockTimeBefore + 3600;

    // fast forward block time
    await goerliFork.provider.send("evm_mine", [nextPostTime]);

    // pass current block time
    const blockTime = (await goerliFork.provider.getBlock("latest")).timestamp;
    context.gelatoArgs.blockTime = blockTime;

    const res = await runWeb3Function(
      oracleWeb3FunctionPath,
      context,
      goerliFork.provider
    );

    expect(res.result.canExec).toEqual(true);

    // expect "lastPost" to be updated
    expect(res.storage.state).toEqual("updated");
    expect(res.storage.storage["lastPost"]).toEqual(blockTime.toString());
  });
});
