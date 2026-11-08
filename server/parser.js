const fs = require("fs");
const path = require("path");
const babel = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const IGNORE = new Set(["node_modules", ".git", "dist", "build", "coverage"]);
const EXT = [".js", ".jsx", ".mjs"];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

const rel = (root, p) => path.relative(root, p).split(path.sep).join("/");

function resolveImport(fromFile, spec, fileSet) {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    ...EXT.map((e) => base + e),
    ...EXT.map((e) => path.join(base, "index" + e)),
  ];
  return candidates.find((c) => fileSet.has(c)) || null;
}

function fnNameOf(p) {
  if (p.isFunctionDeclaration() && p.node.id) return p.node.id.name;
  if (
    (p.isArrowFunctionExpression() || p.isFunctionExpression()) &&
    p.parentPath.isVariableDeclarator() &&
    p.parentPath.node.id.type === "Identifier"
  )
    return p.parentPath.node.id.name;
  return null;
}

// Badlav (a): nearest NAAM wala function dhoondho (anonymous callbacks skip)
function callerOf(p, fKey) {
  const fn = p.findParent((x) => x.isFunction() && fnNameOf(x));
  return fn ? `${fKey}::${fnNameOf(fn)}` : fKey;
}

function analyzeRepo(root) {
  root = path.resolve(root);
  const files = walk(root);
  const fileSet = new Set(files);
  const nodes = new Map();
  const edges = new Map();
  const rawCalls = [];
  const rawRenders = []; // Badlav (b)
  const fileImports = new Map();

  const addNode = (n) => nodes.set(n.key, n);
  const addEdge = (from, to, type) =>
    edges.set(`${from}|${to}|${type}`, { from, to, type });

  for (const file of files) {
    const fKey = rel(root, file);
    const src = fs.readFileSync(file, "utf8");
    addNode({ key: fKey, type: "File", name: path.basename(file), filePath: fKey });
    fileImports.set(fKey, []);

    let ast;
    try {
      ast = babel.parse(src, {
        sourceType: "unambiguous",
        plugins: ["jsx"],
        errorRecovery: true,
      });
    } catch (e) {
      console.warn("Parse failed:", fKey);
      continue;
    }

    const handleImport = (spec) => {
      const target = resolveImport(file, spec, fileSet);
      if (target) {
        const tKey = rel(root, target);
        addEdge(fKey, tKey, "IMPORTS");
        fileImports.get(fKey).push(tKey);
      } else if (!spec.startsWith(".")) {
        const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
        addNode({ key: "pkg:" + pkg, type: "Package", name: pkg });
        addEdge(fKey, "pkg:" + pkg, "IMPORTS");
      }
    };

    const addFn = (name, node, type = "Function") => {
      const key = `${fKey}::${name}`;
      addNode({
        key, type, name, filePath: fKey,
        startLine: node.loc.start.line,
        endLine: node.loc.end.line,
        code: src.slice(node.start, node.end).slice(0, 2000),
      });
      addEdge(fKey, key, "DEFINES");
    };

    traverse(ast, {
      ImportDeclaration(p) { handleImport(p.node.source.value); },
      ClassDeclaration(p) { if (p.node.id) addFn(p.node.id.name, p.node, "Class"); },
      FunctionDeclaration(p) { if (p.node.id) addFn(p.node.id.name, p.node); },
      VariableDeclarator(p) {
        const init = p.node.init;
        if (
          p.node.id.type === "Identifier" && init &&
          (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression")
        ) addFn(p.node.id.name, p.node);
      },
      // Badlav (c): naya CallExpression + JSXOpeningElement
      CallExpression(p) {
        const c = p.node.callee;
        const arg = p.node.arguments[0];
        if (c.type === "Identifier" && c.name === "require" && arg && arg.type === "StringLiteral") {
          handleImport(arg.value);
          return;
        }
        if (c.type === "Identifier") {
          rawCalls.push({ from: callerOf(p, fKey), fKey, name: c.name });
        }
      },
      JSXOpeningElement(p) {
        const n = p.node.name;
        if (n.type === "JSXIdentifier" && /^[A-Z]/.test(n.name)) {
          rawRenders.push({ from: callerOf(p, fKey), fKey, name: n.name });
        }
      },
    });
  }

  // Badlav (d): naya second pass (CALLS + RENDERS)
  const resolveName = (fKey, name, from) => {
    const same = `${fKey}::${name}`;
    if (nodes.has(same) && same !== from) return same;
    for (const imp of fileImports.get(fKey) || []) {
      const k = `${imp}::${name}`;
      if (nodes.has(k)) return k;
    }
    return null;
  };

  for (const { from, fKey, name } of rawCalls) {
    const t = resolveName(fKey, name, from);
    if (t) addEdge(from, t, "CALLS");
  }
  for (const { from, fKey, name } of rawRenders) {
    const t = resolveName(fKey, name, from);
    if (t) addEdge(from, t, "RENDERS");
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

module.exports = { analyzeRepo };