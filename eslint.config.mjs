import nextPlugin from "eslint-config-next";

const config = [
  {
    ignores: ["node_modules", ".next", "dist", "*.config.*"],
  },
  ...nextPlugin,
];

export default config;
