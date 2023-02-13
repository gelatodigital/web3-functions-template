import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  roots: ["<rootDir>/src/"],
  preset: "ts-jest",
  testEnvironment: "node",
};
export default config;
