# Web3 Functions Template  <!-- omit in toc -->
Use this template to write, test and deploy Web3 Functions.

## What are Web3 Functions? 
Web3 Functions are decentralized cloud functions that work similarly to AWS Lambda or Google Cloud, just for web3. They enable developers to execute on-chain transactions based on arbitrary off-chain data (APIs / subgraphs, etc) & computation. These functions are written in Typescript, stored on IPFS and run by Gelato. 

## Documentation

You can find the official Web3 Functions documentation [here](https://docs.gelato.network/developer-services/web3-functions).

## Private Beta Restriction

Web3 Functions are currently in private Beta and can only be used by whitelisted users. If you would like to be added to the waitlist, please reach out to the team on [Discord](https://discord.com/invite/ApbA39BKyJ) or apply using this [form](https://form.typeform.com/to/RrEiARiI).

## Table of Content

- [What are Web3 Functions?](#what-are-web3-functions)
- [Documentation](#documentation)
- [Private Beta Restriction](#private-beta-restriction)
- [Table of Content](#table-of-content)
- [Project Setup](#project-setup)
- [Write a Web3 Function](#write-a-web3-function)
- [Test your web3 function](#test-your-web3-function)
- [Use User arguments](#use-user-arguments)
- [Use State / Storage](#use-state--storage)
- [Use user secrets](#use-user-secrets)
- [Deploy your Web3Function on IPFS](#deploy-your-web3function-on-ipfs)
- [Create your Web3Function task](#create-your-web3function-task)
- [More examples](#more-examples)
  - [Coingecko oracle](#coingecko-oracle)
  - [Event listener](#event-listener)
  - [Secrets](#secrets)
  - [Advertising Board](#advertising-board)


## Project Setup
1. Install project dependencies
```
yarn install
```

2. Configure your local environment: 
- Copy `.env.example` to init your own `.env` file
```
cp .env.example .env
```
- Complete your `.env` file with your private settings
```
PROVIDER_URL="" # your provider URL (e.g. https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_ID)
PRIVATE_KEY="" # optional: only needed if you wish to create a task from the CLI instead of the UI
```


## Write a Web3 Function

- Go to  `src/web3-functions/my-web3-function`
- Write your Web3 Function logic within the `Web3Function.onRun` function.
- Example:
```typescript
import { Web3Function, Web3FunctionContext } from "@gelatonetwork/web3-functions-sdk";
import { Contract, ethers } from "ethers";
import ky from "ky"; // we recommend using ky as axios doesn't support fetch by default

const ORACLE_ABI = [
  "function lastUpdated() external view returns(uint256)",
  "function updatePrice(uint256)",
];

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider } = context;

  // Retrieve Last oracle update time
  const oracleAddress = "0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da";
  const oracle = new Contract(oracleAddress, ORACLE_ABI, provider);
  const lastUpdated = parseInt(await oracle.lastUpdated());
  console.log(`Last oracle update: ${lastUpdated}`);

  // Check if it's ready for a new update
  const nextUpdateTime = lastUpdated + 300; // 5 min
  const timestamp = gelatoArgs.blockTime;
  console.log(`Next oracle update: ${nextUpdateTime}`);
  if (timestamp < nextUpdateTime) {
    return { canExec: false, message: `Time not elapsed` };
  }

  // Get current price on coingecko
  const currency = "ethereum";
  const priceData: any = await ky
    .get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=usd`,
      { timeout: 5_000, retry: 0 }
    )
    .json();
  price = Math.floor(priceData[currency].usd);
  console.log(`Updating price: ${price}`);

  // Return execution call data
  return {
    canExec: true,
    callData: oracle.interface.encodeFunctionData("updatePrice", [price]),
  };
});
```
- Each  Web3 Function has a `schema.json` file to specify the runtime configuration. In later versions you will have more optionality to define what resources your Web3 Function requires. 
```json
{
  "web3FunctionVersion": "1.0.0",
  "runtime": "js-1.0",
  "memory": 128, 
  "timeout": 30,
  "userArgs": {}
}
```


## Test your web3 function

### Calling your web3 function

- Use `npx w3f test FILENAME` command to test your function

- Options:
  - `--show-logs` Show internal Web3 Function logs
  - `--debug` Show Runtime debug messages
  - `--chain-id=[number]` Specify the chainId to be used for your Web3 Function (default: `5` for Goerli)
  - `--user-args=[key]:[value]` Set your Web3 Function user args

- Example:<br/> `npx w3f test src/web3-functions/examples/oracle/index.ts --show-logs`
- Output:
  ```
  Web3Function Build result:
  ✓ File: ./.tmp/index.js
  ✓ File size: 1.70mb
  ✓ Build time: 109.93ms

  Web3Function running logs:
  > ChainId: 5
  > Last oracle update: 1665512172
  > Next oracle update: 1665512472
  > Updating price: 1586

  Web3Function Result:
  ✓ Return value: {
    canExec: true,
    callData: '0x8d6cc56d0000000000000000000000000000000000000000000000000000000000000632'
  }

  Web3Function Runtime stats:
  ✓ Duration: 5.41s
  ✓ Memory: 57.77mb
  ```

### Writing unit test for your web3 function

- Define your tests in  `src/test/my-web3-function.test.ts`
- Use `yarn test` command to run unit test suite.

You can fork a network in your unit test.
RPC methods of provider can be found in [Foundry's Anvil docs](https://book.getfoundry.sh/reference/anvil/)

Example: [`src/test/advertising-board.test.ts`](./src/test/advertising-board.test.ts)

```ts
  import { AnvilServer } from "./utils/anvil-server";

  goerliFork = await AnvilServer.fork({
    forkBlockNumber: 8483100,
    forkUrl: "https://rpc.ankr.com/eth_goerli",
  });

  const forkedProvider = goerliFork.provider;
```


## Use User arguments
1. Declare your expected `userArgs` in your schema, accepted types are 'string', 'string[]', 'number', 'number[]', 'boolean', 'boolean[]':
```json
{
  "web3FunctionVersion": "1.0.0",
  "runtime": "js-1.0",
  "memory": 128, 
  "timeout": 30,
  "userArgs": {
    "currency": "string",
    "oracle": "string"
  }
}
```

2. Access your `userArgs` from the Web3Function context:
```typescript
Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, secrets } = context;

  // User args:
  console.log('Currency:', userArgs.currency)
  console.log('Oracle:', userArgs.oracle)
  
});
```

3. Pass `user-args` to the CLI to test your web3 function:
```
npx w3f test src/web3-functions/examples/oracle/index.ts --show-logs --user-args=currency:ethereum --user-args=oracle:0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da
```

To pass array argument (eg `string[]`), you can use:
```
--user-args=arr:\[\"a\"\,\"b\"\]
```

## Use State / Storage

Web3Functions are stateless scripts, that will run in a new & empty memory context on every execution.
If you need to manage some state variable, we provide a simple key/value store that you can access from your web3 function `context`.

See the above example to read & update values from your storage:

```typescript
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { storage, provider } = context;

  // Use storage to retrieve previous state (stored values are always string)
  const lastBlockStr = (await storage.get("lastBlockNumber")) ?? "0";
  const lastBlock = parseInt(lastBlockStr);
  console.log(`Last block: ${lastBlock}`);

  const newBlock = await provider.getBlockNumber();
  console.log(`New block: ${newBlock}`);
  if (newBlock > lastBlock) {
    // Update storage to persist your current state (values must be cast to string)
    await storage.set("lastBlockNumber", newBlock.toString());
  }

  return {
    canExec: false,
    message: `Updated block number: ${newBlock.toString()}`,
  };
});
```

Test storage execution:<br/>
`npx w3f test src/web3-functions/examples/storage/index.ts  --show-logs`

You will see your updated key/values:
```
Web3Function Storage updated:
 ✓ lastBlockNumber: '8321923'
```

## Use user secrets
1. Input up your secrets in `.env` file with `SECRETS_` as prefix.

```
SECRETS_COINGECKO_API=https://api.coingecko.com/api/v3
```

2. Access your secrets from the Web3Function context: 
```typescript
  // Get api from secrets
  const coingeckoApi = await context.secrets.get("COINGECKO_API");
  if (!coingeckoApi)
    return { canExec: false, message: `COINGECKO_API not set in secrets` };
```

3. Store your secrets by using (Variables with the `SECRETS_` prefix in `.env` will be stored):<br/> `yarn set-secrets`
  
4. Test your Web3 Function using secrets:<br/>
`npx w3f test src/web3-functions/examples/secrets/index.ts --show-logs`

5. View complete list of your secrets by using:<br/> `yarn list-secrets`

6. To delete secrets, use:<br/> `yarn delete-secrets SECRET_KEY SECRET_KEY2`

  

## Deploy your Web3Function on IPFS

Use `npx w3f deploy FILENAME` command to deploy your web3 function.

Example:<br/>
`npx w3f deploy src/web3-functions/examples/oracle/index.ts`

The deployer will output your Web3Function IPFS CID, that you can use to create your task:
```
 ✓ Web3Function deployed to ipfs.
 ✓ CID: QmVfDbGGN6qfPs5ocu2ZuzLdBsXpu7zdfPwh14LwFUHLnc

To create a task that runs your Web3 Function every minute, visit:
> https://beta.app.gelato.network/new-task?cid=QmVfDbGGN6qfPs5ocu2ZuzLdBsXpu7zdfPwh14LwFUHLnc
```


## Create your Web3Function task
Use the `ops-sdk` to easily create a new task (make sure you have your private_key in .env):
```typescript
const { taskId, tx } = await opsSdk.createTask({
    name: "Web3Function - ETH Oracle",
    execAddress: oracleAddress,
    execSelector: oracleInterface.getSighash("updatePrice"),
    dedicatedMsgSender: true,
    web3FunctionHash: cid, // Pass your js web3 function IPFS CID
    web3FunctionArgs: { // Set your Web3Function arguments
      oracle: oracleAddress,
      currency: "ethereum",
    },
  });
  await tx.wait();
```

Test it with our sample task creation script:<br/>
`yarn create-task:oracle`

```
Deploying Web3Function on IPFS...
Web3Function IPFS CID: QmVfDbGGN6qfPs5ocu2ZuzLdBsXpu7zdfPwh14LwFUHLnc

Creating automate task...
Task created, taskId: 0x8438933eb9c6e4632d984b4db1e7672082d367b900e536f86295b2e23dbcaff3
> https://beta.app.gelato.network/task/0x8438933eb9c6e4632d984b4db1e7672082d367b900e536f86295b2e23dbcaff3?chainId=5
```

## More examples

### Coingecko oracle

Fetch price data from Coingecko API to update your on-chain Oracle

Source: [`src/web3-functions/examples/oracle/index.ts`](./src/web3-functions/examples/oracle/index.ts)

Run:<br/>
`npx w3f test src/web3-functions/examples/oracle/index.ts --show-logs --user-args=currency:ethereum --user-args=oracle:0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da`

Create task: <br/>
`yarn create-task:oracle`


### Event listener

Listen to smart contract events and use storage context to maintain your execution state.

Source: [`src/web3-functions/examples/event-listener/index.ts`](./src/web3-functions/examples/event-listener/index.ts)

Run:<br/>
`npx w3f test src/web3-functions/examples/event-listener/index.ts --show-logs --user-args=counter:0x8F143A5D62de01EAdAF9ef16d4d3694380066D9F --user-args=oracle:0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da`

Create task: <br/>
`yarn create-task:event`

### Secrets 

Fetch data from a private API to update your on-chain Oracle

Source: [`src/web3-functions/examples/secrets/index.ts`](./src/web3-functions/examples/secrets/index.ts)

Run:<br/>
`npx w3f test src/web3-functions/examples/secrets/index.ts --show-logs --user-args=currency:ethereum --user-args=oracle:0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da`

Create task: <br/>
`yarn create-task:secrets`

### Advertising Board

Fetch a random quote from an API and post it on chain. 

Source: [`src/web3-functions/examples/advertising-board/index.ts`](./src/web3-functions/examples/advertising-board/index.ts)

Run:<br/>
`npx w3f test src/web3-functions/examples/advertising-board/index.ts`

Create task: <br/>
`yarn create-task:ad-board`
