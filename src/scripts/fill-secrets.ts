import dotenv from "dotenv";
import { Secrets } from "@gelatonetwork/ops-sdk";
dotenv.config();

export const fillSecrets = async () => {
  let secrets: Secrets = {};

  // Fill up secrets with `SECRETS_*` env
  Object.keys(process.env)
    .filter((key) => key.startsWith("SECRETS_"))
    .forEach((key) => {
      const secret = process.env[key] as string;
      secrets = {
        ...secrets,
        [key.replace("SECRETS_", "")]: secret,
      };
    });

  return secrets;
};
