import ts from "typescript";
import * as path from "path";

import {
  InterfaceOrTypeAliasDeclaration,
  ParentType,
  ParserOptions,
} from "./types";

export function computeComponentName(
  exp: ts.Symbol,
  source: ts.SourceFile,
  customComponentTypes: ParserOptions["customComponentTypes"] = [],
) {
  const exportName = exp.getName();

  const statelessDisplayName = getTextValueOfFunctionProperty(
    exp,
    source,
    "displayName",
  );

  const statefulDisplayName =
    exp.valueDeclaration &&
    ts.isClassDeclaration(exp.valueDeclaration) &&
    getTextValueOfClassMember(exp.valueDeclaration, "displayName");

  if (statelessDisplayName || statefulDisplayName) {
    return statelessDisplayName || statefulDisplayName || "";
  }

  const defaultComponentTypes = [
    "default",
    "__function",
    "Stateless",
    "StyledComponentClass",
    "StyledComponent",
    "IStyledComponent",
    "FunctionComponent",
    "StatelessComponent",
    "ForwardRefExoticComponent",
    "MemoExoticComponent",
  ];

  const supportedComponentTypes = [
    ...defaultComponentTypes,
    ...customComponentTypes,
  ];

  if (supportedComponentTypes.indexOf(exportName) !== -1) {
    return getDefaultExportForFile(source);
  } else {
    return exportName;
  }
}

export function getDefaultExportForFile(source: ts.SourceFile) {
  const name = path.basename(source.fileName).split(".")[0];
  const filename =
    name === "index" ? path.basename(path.dirname(source.fileName)) : name;

  // JS identifiers must starts with a letter, and contain letters and/or numbers
  // So, you could not take filename as is
  const identifier = filename
    .replace(/^[^A-Z]*/gi, "")
    .replace(/[^A-Z0-9]*/gi, "");

  return identifier.length ? identifier : "DefaultName";
}

function getTextValueOfClassMember(
  classDeclaration: ts.ClassDeclaration,
  memberName: string,
): string {
  const classDeclarationMembers = classDeclaration.members || [];
  const [textValue] =
    classDeclarationMembers &&
    classDeclarationMembers
      .filter((member) => ts.isPropertyDeclaration(member))
      .filter((member) => {
        const name = ts.getNameOfDeclaration(member) as ts.Identifier;
        return name && name.text === memberName;
      })
      .map((member) => {
        const property = member as ts.PropertyDeclaration;
        return (
          property.initializer && (property.initializer as ts.Identifier).text
        );
      });

  return textValue || "";
}

function getTextValueOfFunctionProperty(
  exp: ts.Symbol,
  source: ts.SourceFile,
  propertyName: string,
) {
  const [textValue] = source.statements
    .filter((statement) => ts.isExpressionStatement(statement))
    .filter((statement) => {
      const expr = (statement as ts.ExpressionStatement)
        .expression as ts.BinaryExpression;
      return (
        expr.left &&
        (expr.left as ts.PropertyAccessExpression).name &&
        (expr.left as ts.PropertyAccessExpression).name.escapedText ===
          propertyName
      );
    })
    .filter((statement) => {
      return ts.isStringLiteral(
        (
          (statement as ts.ExpressionStatement)
            .expression as ts.BinaryExpression
        ).right,
      );
    })
    .map((statement) => {
      return (
        (
          (statement as ts.ExpressionStatement)
            .expression as ts.BinaryExpression
        ).right as ts.Identifier
      ).text;
    });

  return textValue || "";
}

export function isTypeLiteral(node: ts.Node): node is ts.TypeLiteralNode {
  return node.kind === ts.SyntaxKind.TypeLiteral;
}

export function getDeclarations(prop: ts.Symbol): ParentType[] | undefined {
  const declarations = prop.getDeclarations();

  if (declarations === undefined || declarations.length === 0) {
    return undefined;
  }

  const parents: ParentType[] = [];

  for (let declaration of declarations) {
    const { parent } = declaration;

    if (!isTypeLiteral(parent) && !isInterfaceOrTypeAliasDeclaration(parent)) {
      continue;
    }

    const parentName =
      "name" in parent
        ? (parent as InterfaceOrTypeAliasDeclaration).name.text
        : "TypeLiteral";

    const { fileName } = (
      parent as InterfaceOrTypeAliasDeclaration | ts.TypeLiteralNode
    ).getSourceFile();

    parents.push({
      fileName: trimFileName(fileName),
      name: parentName,
    });
  }

  return parents;
}

export function getParentType(prop: ts.Symbol): ParentType | undefined {
  const declarations = prop.getDeclarations();

  if (declarations == null || declarations.length === 0) {
    return undefined;
  }

  // Props can be declared only in one place
  const { parent } = declarations[0];

  if (!isInterfaceOrTypeAliasDeclaration(parent)) {
    return undefined;
  }

  const parentName = parent.name.text;
  const { fileName } = parent.getSourceFile();

  return {
    fileName: trimFileName(fileName),
    name: parentName,
  };
}

export const isOptional = (prop: ts.Symbol) =>
  // tslint:disable-next-line:no-bitwise
  (prop.getFlags() & ts.SymbolFlags.Optional) !== 0;

function isInterfaceOrTypeAliasDeclaration(
  node: ts.Node,
): node is ts.InterfaceDeclaration | ts.TypeAliasDeclaration {
  return (
    node.kind === ts.SyntaxKind.InterfaceDeclaration ||
    node.kind === ts.SyntaxKind.TypeAliasDeclaration
  );
}

export function formatTag(tag: ts.JSDocTagInfo) {
  let result = "@" + tag.name;
  if (tag.text) {
    result += " " + ts.displayPartsToString(tag.text);
  }
  return result;
}

export function statementIsClassDeclaration(
  statement: ts.Statement,
): statement is ts.ClassDeclaration {
  return !!(statement as ts.ClassDeclaration).members;
}

export function getPropertyName(
  name: ts.PropertyName | ts.BindingPattern,
): string | null {
  switch (name.kind) {
    case ts.SyntaxKind.NumericLiteral:
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.Identifier:
      return name.text;
    case ts.SyntaxKind.ComputedPropertyName:
      return name.getText();
    default:
      return null;
  }
}

const slashRegex = /[\\/]/g;

export function trimFileName(
  fileName: string,
  cwd: string = process.cwd(),
  platform?: "posix" | "win32",
) {
  // This allows tests to run regardless of current platform
  const pathLib = platform ? path[platform] : path;

  // Typescript formats Windows paths with forward slashes. For easier use of
  // the path utilities, normalize to platform-standard slashes, then restore
  // the original slashes when returning the result.
  const originalSep = fileName.match(slashRegex)?.[0] || pathLib.sep;
  const normalizedFileName = pathLib.normalize(fileName);
  const root = pathLib.parse(cwd).root;

  // Walk up paths from the current directory until we find a common ancestor,
  // and return the path relative to that. This will work in either a single-
  // package repo or a monorepo (where dependencies may be installed at the
  // root, but commands may be run in a package folder).
  let parent = cwd;
  do {
    if (normalizedFileName.startsWith(parent)) {
      return (
        pathLib
          // Preserve the parent directory name to match existing behavior
          .relative(pathLib.dirname(parent), normalizedFileName)
          // Restore original type of slashes
          .replace(slashRegex, originalSep)
      );
    }
    parent = pathLib.dirname(parent);
  } while (parent !== root);

  // No common ancestor, so return the path as-is
  return fileName;
}

export function statementIsStatelessWithDefaultProps(
  statement: ts.Statement,
): boolean {
  const children = (statement as ts.ExpressionStatement).getChildren();
  for (const child of children) {
    const { left } = child as ts.BinaryExpression;
    if (left) {
      const { name } = left as ts.PropertyAccessExpression;
      if (name && name.escapedText === "defaultProps") {
        return true;
      }
    }
  }
  return false;
}
