// The one place every next.config gets component stamping from (JAVA-1092):
//   export default withComponentStamps(nextConfig);
// scripts/test/component-stamps.test.mjs fails when a next.config does not use it.
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(dirname(dirname(here)));

export function withComponentStamps(config) {
  const rules = config.turbopack?.rules ?? {};
  const stamp = {
    loader: require.resolve("./component-stamp-loader.cjs"),
    options: { root: repoRoot },
  };
  // Webpack builds (`next build --webpack`, the landing's dev server) do not read turbopack.rules.
  const webpack = (webpackConfig, context) => {
    const base = config.webpack ? config.webpack(webpackConfig, context) : webpackConfig;
    base.module.rules.push({ test: /\.tsx$/, exclude: /node_modules/, use: [stamp] });
    return base;
  };
  return {
    ...config,
    webpack,
    turbopack: {
      ...config.turbopack,
      rules: {
        ...rules,
        "*.tsx": {
          condition: { not: "foreign" },
          loaders: [...(rules["*.tsx"]?.loaders ?? []), stamp],
        },
      },
    },
  };
}
