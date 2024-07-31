"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
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
var ts = require("typescript");
var path = require("path");
var fs = require("fs");
// this will actually be passed in
function withCustomConfig(tsconfigPath, parserOpts) {
    var basePath = path.dirname(tsconfigPath);
    var _a = ts.readConfigFile(tsconfigPath, function (filename) {
        return fs.readFileSync(filename, 'utf8');
    }), config = _a.config, error = _a.error;
    if (error !== undefined) {
        // tslint:disable-next-line: max-line-length
        var errorText = "Cannot load custom tsconfig.json from provided path: ".concat(tsconfigPath, ", with error code: ").concat(error.code, ", message: ").concat(error.messageText);
        throw new Error(errorText);
    }
    var _b = ts.parseJsonConfigFileContent(config, ts.sys, basePath, {}, tsconfigPath), options = _b.options, errors = _b.errors;
    if (errors && errors.length) {
        if (errors[0] instanceof Error)
            throw errors[0];
        else if (errors[0].messageText)
            throw new Error("TS".concat(errors[0].code, ": ").concat(errors[0].messageText));
        else
            throw new Error(JSON.stringify(errors[0]));
    }
    return withCompilerOptions(options, parserOpts);
}
function withCompilerOptions(compilerOptions, parserOpts) {
    if (parserOpts === void 0) { parserOpts = {}; }
    return {
        parse: function (filePathOrPaths) {
            return parseWithProgramProvider(filePathOrPaths, compilerOptions, parserOpts);
        },
        parseWithProgramProvider: function (filePathOrPaths, programProvider) {
            return parseWithProgramProvider(filePathOrPaths, compilerOptions, parserOpts, programProvider);
        },
    };
}
function parseWithProgramProvider(filePathOrPaths, compilerOptions, parserOpts, programProvider) {
    var filePaths = Array.isArray(filePathOrPaths)
        ? filePathOrPaths
        : [filePathOrPaths];
    var program = programProvider
        ? programProvider()
        : ts.createProgram(filePaths, compilerOptions);
    var parser = new react_docgen_typescript_1.Parser(program, parserOpts);
    var checker = program.getTypeChecker();
    return filePaths
        .map(function (filePath) { return program.getSourceFile(filePath); })
        .filter(function (sourceFile) {
        return typeof sourceFile !== 'undefined';
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
            var doc = parser.getComponentInfo(exp, sourceFile, parserOpts.componentNameResolver, parserOpts.customComponentTypes);
            if (doc) {
                componentDocs.push(doc);
            }
            if (!exp.exports) {
                return;
            }
            // Then document any static sub-components
            exp.exports.forEach(function (symbol) {
                if (symbol.flags & ts.SymbolFlags.Prototype) {
                    return;
                }
                if (symbol.flags & ts.SymbolFlags.Method) {
                    var signature = parser.getCallSignature(symbol);
                    var returnType = checker.typeToString(signature.getReturnType());
                    if (returnType !== 'Element') {
                        return;
                    }
                }
                var doc = parser.getComponentInfo(symbol, sourceFile, parserOpts.componentNameResolver, parserOpts.customComponentTypes);
                if (doc) {
                    var prefix = exp.escapedName === 'default' ? '' : "".concat(exp.escapedName, ".");
                    componentDocs.push(__assign(__assign({}, doc), { displayName: "".concat(prefix).concat(symbol.escapedName) }));
                }
            });
        });
        // Remove any duplicates (for HOC where the names are the same)
        var componentDocsNoDuplicates = componentDocs.reduce(function (prevVal, comp) {
            var duplicate = prevVal.find(function (compDoc) {
                return compDoc.displayName === comp.displayName;
            });
            if (duplicate)
                return prevVal;
            return __spreadArray(__spreadArray([], prevVal, true), [comp], false);
        }, []);
        var filteredComponentDocs = componentDocsNoDuplicates.filter(function (comp, index, comps) {
            return comps
                .slice(index + 1)
                .every(function (innerComp) { return innerComp.displayName !== comp.displayName; });
        });
        return __spreadArray(__spreadArray([], docs, true), filteredComponentDocs, true);
    }, []);
}
function isReactComponent(node, typeChecker) {
    var _a, _b;
    // Check if it's a variable statement with a FunctionComponent type or an arrow function
    if (ts.isVariableStatement(node)) {
        var declarationList = node.declarationList;
        if (declarationList.flags) {
            for (var _i = 0, _c = declarationList.declarations; _i < _c.length; _i++) {
                var declaration = _c[_i];
                if (declaration.initializer &&
                    ts.isArrowFunction(declaration.initializer)) {
                    var type = typeChecker.getTypeAtLocation(declaration.name);
                    var symbol = (_a = type.aliasSymbol) !== null && _a !== void 0 ? _a : type.symbol;
                    if ((symbol === null || symbol === void 0 ? void 0 : symbol.getName()) === 'FunctionComponent') {
                        var symbol_1 = typeChecker.getSymbolAtLocation(node);
                        return symbol_1;
                    }
                }
            }
        }
    }
    // Check if it's a function declaration
    else if (ts.isFunctionDeclaration(node)) {
        var type = typeChecker.getTypeAtLocation(node);
        var callSignatures = type.getCallSignatures();
        for (var _d = 0, callSignatures_1 = callSignatures; _d < callSignatures_1.length; _d++) {
            var signature = callSignatures_1[_d];
            var returnType = typeChecker.getReturnTypeOfSignature(signature);
            if (((_b = returnType.symbol) === null || _b === void 0 ? void 0 : _b.getName()) === 'Element') {
                // @ts-ignore
                return node.symbol;
            }
        }
    }
    // Check if it's a function expression assigned to a variable
    else if (ts.isVariableDeclaration(node) && node.initializer && (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer))) {
        var type = typeChecker.getTypeAtLocation(node);
        var callSignatures = type.getCallSignatures();
        for (var _e = 0, callSignatures_2 = callSignatures; _e < callSignatures_2.length; _e++) {
            var signature = callSignatures_2[_e];
            var returnType = typeChecker.getReturnTypeOfSignature(signature);
            if (isJsxElementType(returnType, typeChecker)) {
                // @ts-ignore
                return node.symbol;
            }
        }
    }
    return false;
}
function findReactComponents(sourceFile, typeChecker) {
    var symbolList = [];
    function visit(node) {
        var result = isReactComponent(node, typeChecker);
        result && symbolList.push(result);
        ts.forEachChild(node, function (sourceFile) {
            visit(sourceFile);
        });
    }
    visit(sourceFile);
    return symbolList;
}
function isJsxElementType(type, typeChecker) {
    if (!type)
        return false;
    var symbol = type.getSymbol();
    if (symbol) {
        var name_1 = typeChecker.symbolToString(symbol);
        if (name_1 === 'JSX.Element' || name_1.includes('ReactElement')) {
            return true;
        }
    }
    // Check union types
    if (type.isUnion()) {
        return type.types.some(function (t) { return isJsxElementType(t, typeChecker); });
    }
    return false;
}
var isJSXElement = function (node) {
    return (ts.isJsxElement(node) ||
        ts.isJsxSelfClosingElement(node) ||
        ts.isJsxFragment(node));
};
