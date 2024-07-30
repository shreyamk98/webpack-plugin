const path = require("path");
const { Parser } = require("react-docgen-typescript");
const ts = require("typescript");
var fs = require("fs");



// this will actually be passed in


function withCustomConfig(tsconfigPath, parserOpts) {
    var basePath = path.dirname(tsconfigPath);
    var _a = ts.readConfigFile(tsconfigPath, function (filename) {
        return fs.readFileSync(filename, 'utf8');
    }), config = _a.config, error = _a.error;
    if (error !== undefined) {
        // tslint:disable-next-line: max-line-length
        var errorText = "Cannot load custom tsconfig.json from provided path: " + tsconfigPath + ", with error code: " + error.code + ", message: " + error.messageText;
        throw new Error(errorText);
    }
    var _b = ts.parseJsonConfigFileContent(config, ts.sys, basePath, {}, tsconfigPath), options = _b.options, errors = _b.errors;
    if (errors && errors.length) {
        throw errors[0];
    }
    return withCompilerOptions(options, parserOpts);
}

function withCompilerOptions(compilerOptions, parserOpts) {
    if (parserOpts === void 0) { parserOpts = exports.defaultParserOpts; }
    return {
        parse: function (filePathOrPaths) {
            return parseWithProgramProvider(filePathOrPaths, compilerOptions, parserOpts);
        },
        parseWithProgramProvider: function (filePathOrPaths, programProvider) {
            return parseWithProgramProvider(filePathOrPaths, compilerOptions, parserOpts, programProvider);
        }
    };
}

function parseWithProgramProvider(filePathOrPaths, compilerOptions, parserOpts, programProvider) {
    var filePaths = Array.isArray(filePathOrPaths)
        ? filePathOrPaths
        : [filePathOrPaths];
    var program = programProvider
        ? programProvider()
        : ts.createProgram(filePaths, compilerOptions);
    var parser = new Parser(program, parserOpts);
    var checker = program.getTypeChecker();
    return filePaths
        .map(function (filePath) { return program.getSourceFile(filePath); })
        .filter(function (sourceFile) {
        return typeof sourceFile !== 'undefined';
    })
        .reduce(function (docs, sourceFile) {
        const symbolList =  findReactComponents(sourceFile, checker);   
        var moduleSymbol = checker.getSymbolAtLocation(sourceFile);
        if (!moduleSymbol) {
            return docs;
        }
        Array.prototype.push.apply(docs, symbolList
            .map(function (exp) {
                console.log( exp.getName(), 'my code')
            return parser.getComponentInfo(exp, sourceFile, parserOpts.componentNameResolver);
        })
            .filter(function (comp) { return comp !== null; })
            .filter(function (comp, index, comps) {
            return comps
                .slice(index + 1)
                .every(function (innerComp) { return innerComp.displayName !== comp.displayName; });
        }));
        return docs;
    }, []);
}


function isReactComponent(node, typeChecker) {
    const isJSXElement = (node) => {
        return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node);
    };
    
    ts.isFunctionDeclaration(node) && console.log(node.escapedName, "AB")
    ts.isArrowFunction(node) && console.log(node.escapedName, "BC")
	// Check if it's a variable statement with a FunctionComponent type or an arrow function

	if (ts.isVariableStatement(node)) {
		const declarationList = node.declarationList;
		if (declarationList.flags && ts.NodeFlags.Const) {
			for (const declaration of declarationList.declarations) {
				if (declaration.initializer && ts.isArrowFunction(declaration.initializer)) {
					const type = typeChecker.getTypeAtLocation(declaration.name);
					const symbol = type.aliasSymbol ?? type.symbol;

					if (symbol?.getName() === 'FunctionComponent') {
						return type.aliasSymbol ?? type.symbol ;
					}
				}
			}
		}
	}
	// Check if it's a function declaration
	else if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {

		const type = typeChecker.getTypeAtLocation(node);
		const callSignatures = type.getCallSignatures();

		for (const signature of callSignatures) {
			const returnType = typeChecker.getReturnTypeOfSignature(signature);
			if (returnType.symbol?.getName() === 'Element') {
				return type.aliasSymbol ?? type.symbol ;
			}
		}
	}
	// Check if it's a function expression assigned to a variable
	else if (ts.isVariableDeclaration(node) && node.initializer && (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer))) {

		const type = typeChecker.getTypeAtLocation(node.name);
		const callSignatures = type.getCallSignatures();

		for (const signature of callSignatures) {
			const returnType = typeChecker.getReturnTypeOfSignature(signature);
			if (returnType.symbol?.getName() === 'Element') {
				return type.aliasSymbol ?? type.symbol ;
			}
		}
	}
    else{
    }

	return false;
}


function findReactComponents(sourceFile, typeChecker, symbolList = []) {
	function visit(node) {
		const result = isReactComponent(node, typeChecker);
        result && symbolList.push(result);
		ts.forEachChild(node, (sourceFile) =>{
            node.escapedName === 'MyButton' && console.log(node, 'my codedshfaslkjfujaspoiuufdspoiufdpoisfdusapfdsaop Somwerthinbg \n\n\n')
            visit(sourceFile)});
	}

	visit(sourceFile);
    return symbolList;
}


module.exports = {withCustomConfig}