# JsResolver template
Start building you JsResolvers to Automate on Gelato Network
<br /><br />

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
import { JsResolverSdk, JsResolverContext } from "../lib";
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


## Create your JsResolver task:
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
`yarn create-task`





