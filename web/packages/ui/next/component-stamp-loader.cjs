// Turbopack loader (JAVA-1092): stamps the root host element of every component with
// data-jd-component="<Name>" and data-jd-source="<repo-relative path>", so a right-clicked DOM node
// can say which component drew it. Production builds mangle function names; the DOM cannot be asked.
const { relative, sep } = require("node:path");
const babel = require("@babel/core");

const isComponentName = (name) => /^[A-Z]/.test(name ?? "");

function plugin({ types: t }) {
  const nameOf = (fnPath) => {
    const node = fnPath.node;
    if (node.id?.name) return node.id.name;
    let parent = fnPath.parentPath;
    // memo(...) / forwardRef(...) wrappers: the name belongs to the variable they are assigned to.
    while (parent?.isCallExpression()) parent = parent.parentPath;
    if (parent?.isVariableDeclarator() && t.isIdentifier(parent.node.id)) return parent.node.id.name;
    if (parent?.isExportDefaultDeclaration()) return null;
    return null;
  };

  // The JSX elements a component can return as its root: through ternaries and && / ||.
  const rootsOf = (expr, out) => {
    if (!expr) return;
    if (t.isJSXElement(expr)) out.push(expr);
    else if (t.isConditionalExpression(expr)) {
      rootsOf(expr.consequent, out);
      rootsOf(expr.alternate, out);
    } else if (t.isLogicalExpression(expr)) rootsOf(expr.right, out);
    else if (t.isParenthesizedExpression(expr)) rootsOf(expr.expression, out);
  };

  const stamp = (element, name, source, file) => {
    const opening = element.openingElement;
    const tag = opening.name;
    // Only host elements: a capitalized root is another component, which stamps its own root.
    if (!t.isJSXIdentifier(tag) || isComponentName(tag.name)) return;
    file.metadata.stamped = true;
    const has = (attr) =>
      opening.attributes.some((a) => t.isJSXAttribute(a) && a.name.name === attr);
    if (!has("data-jd-component"))
      opening.attributes.push(t.jsxAttribute(t.jsxIdentifier("data-jd-component"), t.stringLiteral(name)));
    if (!has("data-jd-source"))
      opening.attributes.push(t.jsxAttribute(t.jsxIdentifier("data-jd-source"), t.stringLiteral(source)));
  };

  return {
    visitor: {
      Function(path, state) {
        const name = nameOf(path);
        if (!isComponentName(name)) return;
        const roots = [];
        if (t.isExpression(path.node.body)) rootsOf(path.node.body, roots);
        else {
          path.get("body").traverse({
            Function: (inner) => inner.skip(),
            ReturnStatement: (ret) => rootsOf(ret.node.argument, roots),
          });
        }
        for (const el of roots) stamp(el, name, state.opts.source, state.file);
      },
    },
  };
}

module.exports = function componentStampLoader(source) {
  const callback = this.async();
  const { root } = this.getOptions();
  const file = this.resourcePath;
  const rel = relative(root, file).split(sep).join("/");
  if (rel.startsWith("..") || rel.includes("node_modules/")) return callback(null, source);
  babel
    .transformAsync(source, {
      filename: file,
      babelrc: false,
      configFile: false,
      sourceType: "module",
      sourceMaps: true,
      parserOpts: { plugins: ["jsx", "typescript"] },
      generatorOpts: { retainLines: true },
      plugins: [[plugin, { source: rel }]],
    })
    // A file that stamped nothing keeps its original source and map: no regenerated code to debug.
    .then((result) =>
      result?.metadata?.stamped ? callback(null, result.code, result.map) : callback(null, source),
    )
    .catch(callback);
};
