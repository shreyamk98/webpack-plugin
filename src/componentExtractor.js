"use strict";
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.withCustomConfig = withCustomConfig;
exports.withCompilerOptions = withCompilerOptions;
var react_docgen_typescript_1 = require("react-docgen-typescript");
var typescript_1 = require("typescript");
var path_1 = require("path");
var fs_1 = require("fs");
// this will actually be passed in
function withCustomConfig(tsconfigPath, parserOpts) {
  var basePath = path_1.default.dirname(tsconfigPath);
  var _a = typescript_1.default.readConfigFile(
      tsconfigPath,
      function (filename) {
        return fs_1.default.readFileSync(filename, "utf8");
      },
    ),
    config = _a.config,
    error = _a.error;
  if (error !== undefined) {
    // tslint:disable-next-line: max-line-length
    var errorText = "Cannot load custom tsconfig.json from provided path: "
      .concat(tsconfigPath, ", with error code: ")
      .concat(error.code, ", message: ")
      .concat(error.messageText);
    throw new Error(errorText);
  }
  var _b = typescript_1.default.parseJsonConfigFileContent(
      config,
      typescript_1.default.sys,
      basePath,
      {},
      tsconfigPath,
    ),
    options = _b.options,
    errors = _b.errors;
  if (errors && errors.length) {
    if (errors[0] instanceof Error) throw errors[0];
    else if (errors[0].messageText)
      throw new Error(
        "TS".concat(errors[0].code, ": ").concat(errors[0].messageText),
      );
    else throw new Error(JSON.stringify(errors[0]));
  }
  return withCompilerOptions(options, parserOpts);
}
function withCompilerOptions(compilerOptions, parserOpts) {
  if (parserOpts === void 0) {
    parserOpts = {};
  }
  return {
    parse: function (filePathOrPaths) {
      return parseWithProgramProvider(
        filePathOrPaths,
        compilerOptions,
        parserOpts,
      );
    },
    parseWithProgramProvider: function (filePathOrPaths, programProvider) {
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
  filePathOrPaths,
  compilerOptions,
  parserOpts,
  programProvider,
) {
  var filePaths = Array.isArray(filePathOrPaths)
    ? filePathOrPaths
    : [filePathOrPaths];
  var program = programProvider
    ? programProvider()
    : typescript_1.default.createProgram(filePaths, compilerOptions);
  var parser = new react_docgen_typescript_1.Parser(program, parserOpts);
  var checker = program.getTypeChecker();
  return filePaths
    .map(function (filePath) {
      return program.getSourceFile(filePath);
    })
    .filter(function (sourceFile) {
      return typeof sourceFile !== "undefined";
    })
    .reduce(function (docs, sourceFile) {
      var moduleSymbol = checker.getSymbolAtLocation(sourceFile);
      if (!moduleSymbol) {
        return docs;
      }
      var symbolList = findReactComponents(sourceFile, checker);
      var componentDocs = [];
      // First document all components
      symbolList.forEach(function (exp) {
        var doc = parser.getComponentInfo(
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
        exp.exports.forEach(function (symbol) {
          if (symbol.flags & typescript_1.default.SymbolFlags.Prototype) {
            return;
          }
          if (symbol.flags & typescript_1.default.SymbolFlags.Method) {
            var signature = parser.getCallSignature(symbol);
            var returnType = checker.typeToString(signature.getReturnType());
            if (returnType !== "Element") {
              return;
            }
          }
          var doc = parser.getComponentInfo(
            symbol,
            sourceFile,
            parserOpts.componentNameResolver,
            parserOpts.customComponentTypes,
          );
          if (doc) {
            var prefix =
              exp.escapedName === "default"
                ? ""
                : "".concat(exp.escapedName, ".");
            componentDocs.push(
              __assign(__assign({}, doc), {
                displayName: "".concat(prefix).concat(symbol.escapedName),
              }),
            );
          }
        });
      });
      // Remove any duplicates (for HOC where the names are the same)
      var componentDocsNoDuplicates = componentDocs.reduce(function (
        prevVal,
        comp,
      ) {
        var duplicate = prevVal.find(function (compDoc) {
          return compDoc.displayName === comp.displayName;
        });
        if (duplicate) return prevVal;
        return __spreadArray(__spreadArray([], prevVal, true), [comp], false);
      }, []);
      var filteredComponentDocs = componentDocsNoDuplicates.filter(
        function (comp, index, comps) {
          return comps.slice(index + 1).every(function (innerComp) {
            return innerComp.displayName !== comp.displayName;
          });
        },
      );
      return __spreadArray(
        __spreadArray([], docs, true),
        filteredComponentDocs,
        true,
      );
    }, []);
}
function isReactComponent(node, typeChecker) {
  var _a, _b, _c, _d, _e, _f;
  var isJSXElement = function (node) {
    return (
      typescript_1.default.isJsxElement(node) ||
      typescript_1.default.isJsxSelfClosingElement(node) ||
      typescript_1.default.isJsxFragment(node)
    );
  };
  // Check if it's a variable statement with a FunctionComponent type or an arrow function
  if (typescript_1.default.isVariableStatement(node)) {
    var declarationList = node.declarationList;
    if (declarationList.flags) {
      for (
        var _i = 0, _g = declarationList.declarations;
        _i < _g.length;
        _i++
      ) {
        var declaration = _g[_i];
        if (
          declaration.initializer &&
          typescript_1.default.isArrowFunction(declaration.initializer)
        ) {
          var type = typeChecker.getTypeAtLocation(declaration.name);
          var symbol =
            (_a = type.aliasSymbol) !== null && _a !== void 0
              ? _a
              : type.symbol;
          if (
            (symbol === null || symbol === void 0
              ? void 0
              : symbol.getName()) === "FunctionComponent"
          ) {
            return (_b = type.aliasSymbol) !== null && _b !== void 0
              ? _b
              : type.symbol;
          }
        }
      }
    }
  }
  // Check if it's a function declaration
  else if (
    typescript_1.default.isFunctionDeclaration(node) ||
    typescript_1.default.isArrowFunction(node)
  ) {
    var type = typeChecker.getTypeAtLocation(node);
    var callSignatures = type.getCallSignatures();
    for (
      var _h = 0, callSignatures_1 = callSignatures;
      _h < callSignatures_1.length;
      _h++
    ) {
      var signature = callSignatures_1[_h];
      var returnType = typeChecker.getReturnTypeOfSignature(signature);
      if (
        ((_c = returnType.symbol) === null || _c === void 0
          ? void 0
          : _c.getName()) === "Element"
      ) {
        return (_d = type.aliasSymbol) !== null && _d !== void 0
          ? _d
          : type.symbol;
      }
    }
  }
  // Check if it's a function expression assigned to a variable
  else if (
    typescript_1.default.isVariableDeclaration(node) &&
    node.initializer &&
    (typescript_1.default.isFunctionExpression(node.initializer) ||
      typescript_1.default.isArrowFunction(node.initializer))
  ) {
    var type = typeChecker.getTypeAtLocation(node.name);
    var callSignatures = type.getCallSignatures();
    for (
      var _j = 0, callSignatures_2 = callSignatures;
      _j < callSignatures_2.length;
      _j++
    ) {
      var signature = callSignatures_2[_j];
      var returnType = typeChecker.getReturnTypeOfSignature(signature);
      if (
        ((_e = returnType.symbol) === null || _e === void 0
          ? void 0
          : _e.getName()) === "Element"
      ) {
        return (_f = type.aliasSymbol) !== null && _f !== void 0
          ? _f
          : type.symbol;
      }
    }
  } else {
  }
  return false;
}
function findReactComponents(sourceFile, typeChecker) {
  var symbolList = [];
  function visit(node) {
    var result = isReactComponent(node, typeChecker);
    result && symbolList.push(result);
    typescript_1.default.forEachChild(node, function (sourceFile) {
      visit(sourceFile);
    });
  }
  visit(sourceFile);
  return symbolList;
}
