import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import { ComponentDoc, FileParser, ParserOptions } from "./types";
import { Parser } from "./parser";

// this will actually be passed in

export function withCustomConfig(
  tsconfigPath: string,
  parserOpts: ParserOptions,
): FileParser {
  const basePath = path.dirname(tsconfigPath);
  const { config, error } = ts.readConfigFile(tsconfigPath, (filename) =>
    fs.readFileSync(filename, "utf8"),
  );

  if (error !== undefined) {
    // tslint:disable-next-line: max-line-length
    const errorText = `Cannot load custom tsconfig.json from provided path: ${tsconfigPath}, with error code: ${error.code}, message: ${error.messageText}`;
    throw new Error(errorText);
  }

  const { options, errors } = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    basePath,
    {},
    tsconfigPath,
  );

  if (errors && errors.length) {
    if (errors[0] instanceof Error) throw errors[0];
    else if (errors[0].messageText)
      throw new Error(`TS${errors[0].code}: ${errors[0].messageText}`);
    else throw new Error(JSON.stringify(errors[0]));
  }

  return withCompilerOptions(options, parserOpts);
}

export function withCompilerOptions(
  compilerOptions: ts.CompilerOptions,
  parserOpts: ParserOptions = {},
): FileParser {
  return {
    parse(filePathOrPaths: string | string[]): ComponentDoc[] {
      return parseWithProgramProvider(
        filePathOrPaths,
        compilerOptions,
        parserOpts,
      );
    },
    parseWithProgramProvider(filePathOrPaths, programProvider) {
      return parseWithProgramProvider(
        filePathOrPaths,
        compilerOptions,
        parserOpts,
        programProvider,
      );
    },
  };
}

function parseWithProgramProvider(
  filePathOrPaths: string | string[],
  compilerOptions: ts.CompilerOptions,
  parserOpts: ParserOptions,
  programProvider?: () => ts.Program,
): ComponentDoc[] {
  const filePaths = Array.isArray(filePathOrPaths)
    ? filePathOrPaths
    : [filePathOrPaths];

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
        return docs;
      }
      const symbolList = findReactComponents(sourceFile, checker);
      const componentDocs: ComponentDoc[] = [];

      // First document all components
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

function isReactComponent(node: ts.Node, typeChecker: ts.TypeChecker) {
  // Check if it's a variable statement with a FunctionComponent type or an arrow function
  if (ts.isVariableStatement(node)) {
    const declarationList = node.declarationList;
    if (declarationList.flags) {
      for (const declaration of declarationList.declarations) {
        if (
          declaration.initializer &&
          ts.isArrowFunction(declaration.initializer)
        ) {
          const type = typeChecker.getTypeAtLocation(declaration.name);
          const symbol = type.aliasSymbol ?? type.symbol;
          if (symbol?.getName() === "FunctionComponent") {
            // @ts-ignore
            return node.symbol;
          }
        }
      }
    }
  }
  // Check if it's a function declaration
  else if (ts.isFunctionDeclaration(node)) {
    const type = typeChecker.getTypeAtLocation(node);
    const callSignatures = type.getCallSignatures();
    for (const signature of callSignatures) {
      const returnType = typeChecker.getReturnTypeOfSignature(signature);
      if (returnType.symbol?.getName() === "Element") {
        // @ts-ignore
        return node.symbol;
      }
    }
  }
  // Check if it's a function expression assigned to a variable
  else if (
    ts.isVariableDeclaration(node) &&
    node.initializer &&
    (ts.isFunctionExpression(node.initializer) ||
      ts.isArrowFunction(node.initializer))
  ) {
    const type = typeChecker.getTypeAtLocation(node);
    const callSignatures = type.getCallSignatures();
    for (const signature of callSignatures) {
      const returnType = typeChecker.getReturnTypeOfSignature(signature);
      if (isJsxElementType(returnType, typeChecker)) {
        // @ts-ignore
        return node.symbol;
      }
    }
  }

  return false;
}

function findReactComponents(
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
) {
  const symbolList: ts.Symbol[] = [];
  function visit(node: ts.Node) {
    const result = isReactComponent(node, typeChecker);
    result && symbolList.push(result);
    ts.forEachChild(node, (sourceFile) => {
      visit(sourceFile);
    });
  }

  visit(sourceFile);
  return symbolList;
}

function isJsxElementType(type: ts.Type, typeChecker: ts.TypeChecker): boolean {
  if (!type) return false;

  const symbol = type.getSymbol();
  if (symbol) {
    const name = typeChecker.symbolToString(symbol);
    if (name === "JSX.Element" || name.includes("ReactElement")) {
      return true;
    }
  }

  // Check union types
  if (type.isUnion()) {
    return type.types.some((t: ts.Type) => isJsxElementType(t, typeChecker));
  }

  return false;
}

const isJSXElement = (node: ts.Node) => {
  return (
    ts.isJsxElement(node) ||
    ts.isJsxSelfClosingElement(node) ||
    ts.isJsxFragment(node)
  );
};
