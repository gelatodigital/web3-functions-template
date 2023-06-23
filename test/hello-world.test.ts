import path from "path";
import { Web3FunctionContextData } from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionLoader } from "@gelatonetwork/web3-functions-sdk/loader";
import { runWeb3Function } from "./utils";
import { ethers } from "ethers";

const w3fName = "hello-world";
const w3fRootDir = path.join("web3-functions");
const w3fPath = path.join(w3fRootDir, w3fName, "index.ts");

describe("My Web3 Function test", () => {
  let context: Web3FunctionContextData;

  beforeAll(async () => {
    const { secrets } = Web3FunctionLoader.load(w3fName, w3fRootDir);

    context = {
      secrets,
      storage: {},
      gelatoArgs: {
        chainId: 5,
        gasPrice: ethers.utils.parseUnits("100", "gwei").toString(),
      },
      userArgs: {},
    };
  }, 10000);

  it("canExec: true", async () => {
    const res = await runWeb3Function(w3fPath, context);

    expect(res.result.canExec).toEqual(true);
  });
});
