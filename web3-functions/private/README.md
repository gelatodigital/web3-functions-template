# Private web3 function

Private web3 function can be achieved by storing the contents of `onRun` function in a secret Github gist. This `onRun` function is fetched and executed during runtime.

## Writing your secret onRun function.

onRun function should be in JavaScript and named `onRun.js`.

### 1. `onRun.js` file structure

`onRun.js` should return a promise.

```js
return (async () => {
  // ... your code here
})();
```

### 2. Using dependencies

Dependencies that are used in `onRun.js` should be imported in the web3 function `index.ts` file, not in `onRun.js`.

In `/web3-functions/private/index.ts`:

```ts
// import dependencies used in onRun.js
import { ethers } from "ethers";
import ky from "ky";
```

The dependencies `ky` and `ethers` are used in `onRun.js`. They will be passed into `onRun.js`

In `/web3-functions/private/index.ts`:

```ts
const onRunFunction = new Function("context", "ky", "ethers", onRunScript);
```

In `onRun.js`, you can use the dependencies as if they are already imported.

### 3. Accessing web3 function context

Web3 function context which includes, `secrets`, `userArgs`, `multiChainProvider` can be accessed normally in `onRun.js` as `context` is passed as arguments.

In `/web3-functions/private/index.ts`:

```ts
const onRunFunction = new Function("context", "ky", "ethers", onRunScript);
```

### 4. Return web3 function result

Results returned in `onRun.js` will be bubbled.

In `/web3-functions/private/onRun.js`:

```ts
return {
  canExec: true,
  callData: [
    {
      to: oracleAddress,
      data: oracle.interface.encodeFunctionData("updatePrice", [price]),
    },
  ],
};
```

## Creating your private web3 function task.

### Secrets required (strict)

- `GIST_ID` (Github gist id to fecth `onRun.js` from)

### Arguments required (not strict)

- `args` (JSON string of arguments to have more linean arguments in case content of `onRun.js` is updated)

Example:

In `/web3-functions/private/schema.json`

```json
  "userArgs": {
    "args": "string"
  }
```

In `/web3-functions/private/userArgs.json`

```json
{
  "args": "{\"currency\":\"ethereum\",\"oracle\":\"0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da\"}"
}
```

## Testing

Create a `.env` file with secrets:

```
GIST_ID=0c58ee8ce55bc7af5f42a2d75c27433c
```

Run `$ npx w3f test ./web3-functions/private/index.ts --logs --debug`
