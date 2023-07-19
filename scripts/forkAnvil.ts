import * as dotenv from "dotenv";
dotenv.config();

const forkChain = async () => {
  const { spawn } = await import("child_process");

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const RPC = process.env["RPC"]!;
  const params = ["-f", RPC];

  let blockNumber;

  if (blockNumber) {
    params.push(`--fork-block-number=${blockNumber}`);
  }

  /// You can add as much customs params as wanted
  const childProcess = spawn("anvil", params, {
    stdio: "inherit",
  });

  childProcess.once("close", (status) => {
    childProcess.removeAllListeners("error");

    if (status === 0) {
      console.log("ok");
    } else {
      console.log("error");
    }
  });

  childProcess.once("error", (_status) => {
    childProcess.removeAllListeners("close");
    console.log("error");
  });
};

forkChain();
