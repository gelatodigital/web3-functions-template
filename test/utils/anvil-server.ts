/* eslint-disable no-console */
import net from "net";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";

import { getAnvilCommand, checkAnvil, run } from "@foundry-rs/easy-foundryup";
import { ethers } from "ethers";

export declare interface AnvilOptions {
  url?: string;
  accountKeysPath?: string; // Translates to: account_keys_path
  accounts?: object[] | object;
  hostname?: string;
  allowUnlimitedContractSize?: boolean;
  blockTime?: number;
  debug?: boolean;
  defaultBalanceEther?: number; // Translates to: default_balance_ether
  forkUrl?: string;
  forkBlockNumber?: string | number; // Translates to: fork_block_number
  gasLimit?: number;
  gasPrice?: string | number;
  hdPath?: string; // Translates to: hd_path
  install?: boolean; // Install anvil binary if missing
  mnemonic?: string;
  path?: string; // path to the anvil exec
  locked?: boolean;
  noStorageCaching?: boolean;
  hardfork?: string;
  chainId?: number;
  port?: number;
  totalAccounts?: number; // Translates to: total_accounts
  silent?: boolean;
  vmErrorsOnRPCResponse?: boolean;
  ws?: boolean;
}

export class AnvilServer {
  private readonly _anvil: ChildProcessWithoutNullStreams;
  private readonly _options: AnvilOptions;
  public provider: ethers.providers.JsonRpcProvider;

  private constructor(
    options: AnvilOptions,
    anvil: ChildProcessWithoutNullStreams,
    provider: ethers.providers.JsonRpcProvider
  ) {
    this._options = options;
    this._anvil = anvil;
    this.provider = provider;
  }

  private static async _getAvailablePort(): Promise<number> {
    return new Promise((res, rej) => {
      const srv = net.createServer();
      srv.listen(0, () => {
        const address = srv.address();
        const port = address && typeof address === "object" ? address.port : -1;
        srv.close(() => (port ? res(port) : rej()));
      });
    });
  }

  private static _optionsToArgs(options: AnvilOptions): string[] {
    const anvilArgs: string[] = [];
    if (options.port) {
      anvilArgs.push("--port", options.port.toString());
    }
    if (options.totalAccounts) {
      anvilArgs.push("--accounts", options.totalAccounts.toString());
    }
    if (options.mnemonic) {
      anvilArgs.push("--mnemonic", options.mnemonic);
    }
    if (options.defaultBalanceEther) {
      anvilArgs.push("--balance", options.defaultBalanceEther.toString());
    }
    if (options.hdPath) {
      anvilArgs.push("--derivation-path", options.hdPath);
    }
    if (options.silent) {
      anvilArgs.push("--silent", options.silent.toString());
    }
    if (options.blockTime) {
      anvilArgs.push("--block-time", options.blockTime.toString());
    }
    if (options.gasLimit) {
      anvilArgs.push("--gas-limit", options.gasLimit.toString());
    }
    if (options.gasPrice && options.gasPrice !== "auto") {
      anvilArgs.push("--gas-price", options.gasPrice.toString());
    }
    if (options.chainId) {
      anvilArgs.push("--chain-id", options.chainId.toString());
    }
    if (options.forkUrl) {
      anvilArgs.push("--fork-url", options.forkUrl);
      if (options.forkBlockNumber) {
        anvilArgs.push(
          "--fork-block-number",
          options.forkBlockNumber.toString()
        );
      }
    }
    if (options.noStorageCaching) {
      anvilArgs.push("--no-storage-caching");
    }
    if (options.hardfork && options.hardfork !== "arrowGlacier") {
      anvilArgs.push("--hardfork", options.hardfork);
    }
    return anvilArgs;
  }

  public static async fork(options: AnvilOptions): Promise<AnvilServer> {
    if (options.install) {
      if (!(await checkAnvil())) {
        if (options.debug) console.log("Installing anvil");
        await run();
      }
    }

    if (!options.port) options.port = await AnvilServer._getAvailablePort();

    if (options.debug) console.log("Launching anvil");
    const start = Date.now();
    const anvilPath = options.path ?? (await getAnvilCommand());
    const anvilArgs = AnvilServer._optionsToArgs(options);
    const anvil = spawn(anvilPath, anvilArgs, { shell: true });

    anvil.on("close", (code: string) => {
      if (options.debug)
        console.log(`anvil child process exited with code ${code}`);
    });

    let isServerReady = false;
    let setUpTime = 0;
    anvil.stdout.on("data", (data: string) => {
      const output = data.toString();
      if (output.includes("Listening")) {
        isServerReady = true;
        setUpTime = Date.now() - start;
      }
      if (options.debug) console.log(`${data}`);
    });

    anvil.stderr.on("data", (data: string) => {
      if (options.debug) console.log(`${data}`);
    });

    // wait until server ready
    const retries = 50; // 5secs
    for (let index = 0; index < retries; index++) {
      if (isServerReady) {
        if (options.debug) console.log(`anvil server ready in ${setUpTime}ms`);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const providerUrl = `http://127.0.0.1:${options.port}`;
    const anvilProvider = new ethers.providers.StaticJsonRpcProvider(
      providerUrl
    );
    return new AnvilServer(options, anvil, anvilProvider);
  }

  public kill() {
    this._anvil?.kill();
  }

  public async waitUntilClosed(): Promise<void> {
    return new Promise((resolve) => {
      this._anvil.once("close", resolve);
    });
  }
}
