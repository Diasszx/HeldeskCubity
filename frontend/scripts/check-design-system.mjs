import ts from 'typescript'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const literalColor = /#[\da-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab)\(/i
const palette =
  /\b(?:bg|text|border|ring|outline|fill|stroke|shadow|from|via|to|divide|decoration)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b/

export function inspectSource(source, filename) {
  const issues = []
  const ast = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  function report(node, message) {
    const { line } = ast.getLineAndCharacterOfPosition(node.getStart(ast))
    issues.push(`${filename}:${line + 1}: ${message}`)
  }
  function visit(node) {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier.text === 'class-variance-authority'
    )
      report(node, 'Use tailwind-variants, não cva.')
    if (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) {
      const value = node.getText(ast)
      if (literalColor.test(value) || palette.test(value))
        report(node, 'Use tokens semânticos de cor.')
    }
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(ast) === 'className' &&
      node.initializer &&
      ts.isJsxExpression(node.initializer)
    ) {
      const expression = node.initializer.expression
      if (
        expression &&
        (ts.isConditionalExpression(expression) ||
          ts.isTemplateExpression(expression) ||
          ts.isBinaryExpression(expression))
      )
        report(node, 'Defina variantes de classes com tv.')
    }
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(ast) === 'button' &&
      !filename.replaceAll('\\', '/').includes('/components/ui/')
    )
      report(node, 'Use o Button shadcn/ui compartilhado.')
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'tv') {
      const recipe = node.arguments[0]
      if (!recipe || !ts.isObjectLiteralExpression(recipe))
        report(node, 'tv deve receber uma receita explícita.')
      else {
        const names = recipe.properties.map((property) =>
          property.name?.getText(ast),
        )
        if (!names.includes('variants') || !names.includes('defaultVariants'))
          report(node, 'Receitas tv devem declarar variants e defaultVariants.')
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return issues
}

export function inspectTheme(source, filename) {
  // Literais só são permitidos nas declarações de tokens do bloco :root.
  const outsideTokens = source.replace(/:root\s*\{[^}]*\}/g, (block) =>
    block.replace(/--[\w-]+\s*:[^;]+;/g, ''),
  )
  return literalColor.test(outsideTokens) ||
    /(?:background|color|border(?:-color)?)\s*:[^;]*(?:\bwhite\b|\bblack\b)/i.test(
      outsideTokens,
    )
    ? [`${filename}: cores literais fora das definições de tokens.`]
    : []
}

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const groups = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name)
      return entry.isDirectory() ? collect(target) : [target]
    }),
  )
  return groups.flat()
}

async function main() {
  const root = fileURLToPath(new URL('../src/', import.meta.url))
  const files = await collect(root)
  const issues = []
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    if (/\.tsx?$/.test(file)) issues.push(...inspectSource(source, file))
    if (file.endsWith('.css')) issues.push(...inspectTheme(source, file))
  }
  if (issues.length) {
    process.stderr.write(`${issues.join('\n')}\n`)
    process.exitCode = 1
  } else
    process.stdout.write(
      'Design system: verificações de tokens, tv e Button passaram.\n',
    )
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main()
