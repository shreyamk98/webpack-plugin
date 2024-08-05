import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import { ComponentDoc, FileParser, ParserOptions } from "./types";
import { Parser } from "./parser";
import { getScoppedLogger } from "../../logger";

// this will actually be passed in
const parserLogger = getScoppedLogger("parser");

export function withCustomConfig(
  tsconfigPath: string,
  parserOpts: ParserOptions,
): FileParser {
  const basePath = path.dirname(tsconfigPath);
  try {
    const { config, error } = ts.readConfigFile(tsconfigPath, (filename) =>
      fs.readFileSync(filename, "utf8"),
    );
    const { options, errors } = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      basePath,
      {},
      tsconfigPath,
    );
    if (error || errors.length > 0) {
      throw new Error(
        `Error parsing tsconfig.json: ${JSON.stringify(error || errors)}`,
      );
    }
    return {
      parse(filePathOrPaths: string | string[]): ComponentDoc[] {
        return parseWithProgramProvider(filePathOrPaths, options, parserOpts);
      },
    };
  } catch (e) {
    parserLogger.error(`%O`, e);
    throw new Error(`${e}`);
  }
}

function parseWithProgramProvider(
  filePathOrPaths: string | string[],
  compilerOptions: ts.CompilerOptions,
  parserOpts: ParserOptions,
  // not being used currently
  programProvider?: () => ts.Program,
): ComponentDoc[] {
  const filePaths = Array.isArray(filePathOrPaths)
    ? filePathOrPaths
    : [filePathOrPaths];
  parserOpts &&
    parserLogger.verbose(`Parsing with options: ${JSON.stringify(parserOpts)}`);
  const program = programProvider
    ? programProvider()
    : ts.createProgram(filePaths, compilerOptions);
  const parser = new Parser(program, parserOpts);
  const checker = program.getTypeChecker();

  return filePaths
    .map((filePath) => program.getSourceFile(filePath))
    .filter(
      (sourceFile): sourceFile is ts.SourceFile =>
        typeof sourceFile !== "undefined",
    )
    .reduce<ComponentDoc[]>((docs, sourceFile) => {
      const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

      if (!moduleSymbol) {
        parserLogger.warn(
          `No module symbol found for ${sourceFile.fileName}. Skipping.`,
        );
        return docs;
      }
      parserLogger.info(
        "Finding all React Componet Symbol in :",
        sourceFile.fileName,
      );
      const symbolList = getReactComponentSymbols(sourceFile, checker);
      const componentDocs: ComponentDoc[] = [];
      parserLogger.info(
        "Finding Component Props and Types in :",
        sourceFile.fileName,
      );
      symbolList.forEach((exp) => {
        const doc = parser.getComponentInfo(
          exp,
          sourceFile,
          parserOpts.componentNameResolver,
          parserOpts.customComponentTypes,
        );

        if (doc) {
          componentDocs.push(doc);
        }

        if (!exp.exports) {
          return;
        }

        // Then document any static sub-components
        exp.exports.forEach((symbol) => {
          if (symbol.flags & ts.SymbolFlags.Prototype) {
            return;
          }

          if (symbol.flags & ts.SymbolFlags.Method) {
            const signature = parser.getCallSignature(symbol);
            const returnType = checker.typeToString(signature.getReturnType());

            if (returnType !== "Element") {
              return;
            }
          }

          const doc = parser.getComponentInfo(
            symbol,
            sourceFile,
            parserOpts.componentNameResolver,
            parserOpts.customComponentTypes,
          );

          if (doc) {
            const prefix =
              exp.escapedName === "default" ? "" : `${exp.escapedName}.`;

            componentDocs.push({
              ...doc,
              displayName: `${prefix}${symbol.escapedName}`,
            });
          }
        });
      });

      // Remove any duplicates (for HOC where the names are the same)
      const componentDocsNoDuplicates = componentDocs.reduce(
        (prevVal, comp) => {
          const duplicate = prevVal.find((compDoc) => {
            return compDoc!.displayName === comp!.displayName;
          });
          if (duplicate) return prevVal;
          return [...prevVal, comp];
        },
        [] as ComponentDoc[],
      );

      const filteredComponentDocs = componentDocsNoDuplicates.filter(
        (comp, index, comps) =>
          comps
            .slice(index + 1)
            .every((innerComp) => innerComp!.displayName !== comp!.displayName),
      );

      return [...docs, ...filteredComponentDocs];
    }, []);
}

function isReactComponentDeclarationNode(
  node: ts.Node,
  typeChecker: ts.TypeChecker,
) {
  // TODO add more cases
  if (
    !(
      ts.isFunctionDeclaration(node) ||
      ts.isVariableDeclaration(node) ||
      ts.isClassDeclaration(node)
    )
  ) {
    return false;
  }
  if (ts.isFunctionDeclaration(node)) {
    // Check if it's a function declaration
    const functionSignature = typeChecker.getSignatureFromDeclaration(node);
    const returnType =
      functionSignature &&
      typeChecker.getReturnTypeOfSignature(functionSignature);
    if (returnType && isJsxElementType(returnType, typeChecker)) {
      return true;
    }
  }
  // Check if it's a function expression or arrow function assigned to a variable
  else if (
    ts.isVariableDeclaration(node) &&
    node.initializer &&
    (ts.isFunctionExpression(node.initializer) ||
      ts.isArrowFunction(node.initializer))
  ) {
    const functionSignature = typeChecker.getSignatureFromDeclaration(
      node.initializer,
    );
    const returnType =
      functionSignature &&
      typeChecker.getReturnTypeOfSignature(functionSignature);
    if (returnType && isJsxElementType(returnType, typeChecker)) {
      return true;
    }
  }
  //Check if it's a class declaration
  else if (ts.isClassDeclaration(node)) {
    let hasComponentInBaseClassType = false;
    if (node.heritageClauses) {
      for (const heritageClause of node.heritageClauses) {
        for (const type of heritageClause.types) {
          const typeSymbol = typeChecker.getSymbolAtLocation(type.expression);
          if (typeSymbol) {
            const name = typeChecker.getFullyQualifiedName(typeSymbol);
            if (name.includes("Component")) {
              hasComponentInBaseClassType = true;
            }
          }
        }
      }
    }
    // Check if the class has a render method
    let hasARenderMethod = false;
    if (node.members) {
      for (const member of node.members) {
        if (
          ts.isMethodDeclaration(member) &&
          member.name &&
          ts.isIdentifier(member.name)
        ) {
          const x = member.name.getText();
          if (member.name.getText() === "render") {
            hasARenderMethod = true;
          }
        }
      }
    }
    return hasComponentInBaseClassType && hasARenderMethod;
  }

  return false;
}

function getReactComponentSymbols(
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
) {
  const symbolList: ts.Symbol[] = [];
  function visit(node: ts.Node) {
    parserLogger.verbose(`Visiting node: ${node.getText()}`);
    const result =
      isReactComponentDeclarationNode(node, typeChecker) &&
      getSymbolForReactComponent(node);
    if (result) {
      symbolList.push(result);
    }
    ts.forEachChild(node, (sourceFile) => {
      visit(sourceFile);
    });
  }

  visit(sourceFile);
  return symbolList;
}

// Assert the symbol to any to access the internal properties
function getSymbolParent(symbol: ts.Symbol): ts.Symbol | undefined {
  const internalSymbol = symbol as any;

  return internalSymbol.parent as ts.Symbol | undefined;
}
// Assert the node to have a symbol property and return it
function getNodeSymbol(node: ts.Node): ts.Symbol | undefined {
  const symbol = (node as any).symbol;
  !symbol && parserLogger.warn(`Symbol not found for node: ${node.getText()}`);

  return symbol as ts.Symbol | undefined;
}

const getSymbolForReactComponent = (node: ts.Node) => {
  const symbol = getNodeSymbol(node);
  if (symbol) {
    parserLogger.verbose(
      `Found React Component Symbol for: ${symbol.escapedName || symbol.name}`,
    );
    return symbol;
  } else {
    parserLogger.warn(`Symbol not found for component: ${node.getText()}`);
  }
};

function isJsxElementType(type: ts.Type, typeChecker: ts.TypeChecker): boolean {
  if (!type) return false;

  const symbol = type.getSymbol();
  if (symbol) {
    const parent = getSymbolParent(symbol);
    // const name = typeChecker.symbolToString(symbol);
    const parentName = parent && typeChecker.symbolToString(parent);
    if (
      parentName &&
      (parentName?.includes("JSX") || parentName?.includes("Element"))
    ) {
      return true;
    }
  }

  // Check union types
  if (type.isUnion()) {
    return type.types.some((t: ts.Type) => isJsxElementType(t, typeChecker));
  }

  return false;
}
