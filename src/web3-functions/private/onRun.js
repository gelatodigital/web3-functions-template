return (async () => {
  const ORACLE_ABI = [
    "function lastUpdated() external view returns(uint256)",
    "function updatePrice(uint256)",
  ];

  const { userArgs, multiChainProvider } = context;
  const args = JSON.parse(userArgs.args);

  const provider = multiChainProvider.default();

  // Retrieve Last oracle update time
  let lastUpdated;
  let oracle;

  const oracleAddress =
    args.oracle ?? "0x71B9B0F6C999CBbB0FeF9c92B80D54e4973214da";

  try {
    oracle = new ethers.Contract(oracleAddress, ORACLE_ABI, provider);
    lastUpdated = parseInt(await oracle.lastUpdated());
    console.log(`Last oracle update: ${lastUpdated}`);
  } catch (err) {
    console.log("Error: ", err);
    return { canExec: false, message: `Rpc call failed` };
  }

  // Check if it's ready for a new update
  const nextUpdateTime = lastUpdated + 300; // 5 min
  const timestamp = (await provider.getBlock("latest")).timestamp;
  console.log(`Next oracle update: ${nextUpdateTime}`);
  if (timestamp < nextUpdateTime) {
    return { canExec: false, message: `Time not elapsed` };
  }

  // Get current price on coingecko
  const currency = args.currency ?? "ethereum";
  let price = 0;
  try {
    const priceData = await ky
      .get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=usd`,
        { timeout: 5_000, retry: 0 }
      )
      .json();
    price = Math.floor(priceData[currency].usd);
  } catch (err) {
    return { canExec: false, message: `Coingecko call failed` };
  }
  console.log(`Updating price: ${price}`);

  // Return execution call data
  return {
    canExec: true,
    callData: [
      {
        to: oracleAddress,
        data: oracle.interface.encodeFunctionData("updatePrice", [price]),
      },
    ],
  };
})();
