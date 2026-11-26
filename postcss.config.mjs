import { fileURLToPath } from "node:url";

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    [fileURLToPath(new URL("./postcss-legacy-flex-layout.cjs", import.meta.url))]: {},
  },
};

export default config;
