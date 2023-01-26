# JsResolver template  <!-- omit in toc -->
Start building you JsResolvers to Automate on Gelato Network
<br /><br />


Example task automation using Gelato Ops SDK:
- [Project Setup](#project-setup)
- [Write a Js Resolver](#write-a-js-resolver)
- [Test your resolver](#test-your-resolver)
- [Use User arguments](#use-user-arguments)
- [Use State / Storage](#use-state--storage)
- [Upload your JsResolver on IPFS](#upload-your-jsresolver-on-ipfs)
- [Create your JsResolver task](#create-your-jsresolver-task)
- [More examples](#more-examples)
  - [Coingecko oracle](#coingecko-oracle)
  - [Event listener](#event-listener)


## Project Setup
1. Install project dependencies
```
yarn install
```

2. Configure your local environment: 
   - Copy `.env_example` to init your own `.env` file
  ```
  cp .env_example .env
  ```
   - Complete your `.env` file with your private settings
  ```
  PROVIDER_URL="" <= görli provider url
  PRIVATE_KEY="" <= your deployer private key
  ```


## Write a Js Resolver

- Create a new file in `src/resolvers`
- Register your resolver main function using `JsResolverSdk.onChecker`
- Example:
```typescript
import { JsResolverSdk, JsResolverContext } from "@gelatonetwork/js-resolver-sdk";
import { Contract, ethers } from "ethers";
import ky from "ky"; // we recommend using ky as axios doesn't support fetch by default

const ORACLE_ABI = [
  "function lastUpdated() external view returns(uint256)",
  "function updatePrice(uint256)",
];

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  const { userArgs, gelatoArgs, provider } = context;

  // Retrieve Last oracle update time
  const oracleAddress = "0x6a3c82330164822A8a39C7C0224D20DB35DD030a";
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
- create your resolver `schema.json` to specify your runtime configuration:
```json
{
  "jsResolverVersion": "1.0.0",
  "runtime": "js-1.0",
  "memory": 128, 
  "timeout": 60,
  "userArgs": {}
}
```


## Test your resolver

- Use `npx js-resolver test FILENAME` command to test your resolver

- Options:
  - `--show-logs` Show internal Resolver logs
  - `--debug` Show Runtime debug messages
  - `--chain-id=[number]` Specify the chainId to be used for your Resolver (default: `5`)
  - `--user-args=[key]:[value]` Set your Resolver user args

- Example: `npx js-resolver test src/resolvers/oracle/index.ts --show-logs`
- Output:
  ```
  JsResolver Build result:
  ✓ File: ./.tmp/resolver.cjs
  ✓ File size: 1.70mb
  ✓ Build time: 109.93ms

  JsResolver running logs:
  > ChainId: 5
  > Last oracle update: 1665512172
  > Next oracle update: 1665512472
  > Updating price: 1586

  JsResolver Result:
  ✓ Return value: {
    canExec: true,
    callData: '0x8d6cc56d0000000000000000000000000000000000000000000000000000000000000632'
  }

  JsResolver Runtime stats:
  ✓ Duration: 5.41s
  ✓ Memory: 57.77mb
  ```

## Use User arguments
1. Declare your expected `userArgs` in you schema, accepted types are 'string', 'string[]', 'number', 'number[]', 'boolean', 'boolean[]':
```json
{
  "jsResolverVersion": "1.0.0",
  "runtime": "js-1.0",
  "memory": 128, 
  "timeout": 60,
  "userArgs": {
    "currency": "string",
    "oracle": "string"
  }
}
```

2. Access your `userArgs` from the JsResolver context:
```typescript
JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  const { userArgs, gelatoArgs, secrets } = context;

  // User args:
  console.log('Currency:', userArgs.currency)
  console.log('Oracle:', userArgs.oracle)
  
});
```

3. Pass `user-args` to the CLI to test your resolver:
```
npx js-resolver test src/resolvers/oracle/index.ts --show-logs --user-args=currency:ethereum --user-args=oracle:0x6a3c82330164822A8a39C7C0224D20DB35DD030a
```

To pass array argument (eg `string[]`), you can use:
```
--user-args=arr:\[\"a\"\,\"b\"\]
```

## Use State / Storage

JsResolvers are stateless scripts, that will run in a new & empty memory context on every execution.
If you need to manage some state variable, we provide a simple key/value store that you can access from your resolver `context`.

See the above example to read & update values from your storage:

```typescript
import {
  JsResolverSdk,
  JsResolverContext,
} from "@gelatonetwork/js-resolver-sdk";

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
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

Test storage execution:
```
npx js-resolver test RESOLVER_FILE
```

You will see your updated key/values:
```
JsResolver Storage updated:
 ✓ lastBlockNumber: '8321923'
```

## Use user secrets
1. Fill up your secrets in `.env` file with `SECRETS_` as prefix.

```
SECRETS_COINGECKO_API=https://api.coingecko.com/api/v3
```

2. Access your secrets from the JsResolver context: 
```typescript
  // Get api from secrets
  const coingeckoApi = await context.secrets.get("COINGECKO_API");
  if (!coingeckoApi)
    return { canExec: false, message: `COINGECKO_API not set in secrets` };
```

3. Store your secrets by using `yarn set-secrets`. (Variables with the `SECRETS_` prefix in `.env` will be stored.)

4. View complete list of your secrets by using `yarn list-secrets`.

5. To delete secrets, use `yarn delete-secrets SECRET_KEY SECRET_KEY2`


## Upload your JsResolver on IPFS

Use `npx js-resolver upload FILENAME` command to upload your resolver.
Example:
```
npx js-resolver upload src/resolvers/oracle/index.ts
```

The uploader will output your JsResolver IPFS CID, that you can use to create your task:
```
 ✓ JsResolver uploaded to ipfs. CID: QmUavazADkj9WL9uVJ7eYkoSybhBSsitEsWFNfVojMYJSk
```


## Create your JsResolver task
Use the `ops-sdk` to easily create a new task:
```typescript
const { taskId, tx } = await opsSdk.createTask({
    name: "JsResolver - ETH Oracle",
    execAddress: oracleAddress,
    execSelector: oracleInterface.getSighash("updatePrice"),
    dedicatedMsgSender: true,
    jsResolverHash: cid, // Pass your js resolver IPFS CID
    jsResolverArgs: { // Set your JsResolver arguments
      oracle: oracleAddress,
      currency: "ethereum",
    },
  });
  await tx.wait();
```

Test it with our sample task creation script:
`yarn create-task:oracle`

```
Deploying JsResolver on IPFS...
JsResolver IPFS CID: QmUavazADkj9WL9uVJ7eYkoSybhBSsitEsWFNfVojMYJSk

Creating automate task...
Task created, taskId: 0xedcc73b5cc1e7b3dc79cc899f239193791f6bb16dd2a67be1c0fdf3495533325 
> https://beta.app.gelato.network/task/0xedcc73b5cc1e7b3dc79cc899f239193791f6bb16dd2a67be1c0fdf3495533325?chainId=5
```

## More examples

### Coingecko oracle

Fetch price data from Coingecko API to update your on-chain Oracle

Source: [`src/resolvers/oracle/index.ts`](./src/resolvers/oracle/index.ts)

Run:
```
npx js-resolver test src/resolvers/oracle/index.ts --show-logs --user-args=currency:ethereum --user-args=oracle:0x6a3c82330164822A8a39C7C0224D20DB35DD030a
```

Create task: 
```
yarn create-task:oracle
```


### Event listener

Listen to smart contract events and use storage context to maintain your execution state.

Source: [`src/resolvers/event-listener/index.ts`](./src/resolvers/event-listener/index.ts)

Run:
```
npx js-resolver test src/resolvers/event-listener/index.ts --show-logs --user-args=counter:0x8F143A5D62de01EAdAF9ef16d4d3694380066D9F --user-args=oracle:0x6a3c82330164822A8a39C7C0224D20DB35DD030a
```

Create task: 
```
yarn create-task:event
```





