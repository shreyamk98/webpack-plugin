import * as ts from "typescript";

export enum LogLevel {
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export type PropFilter = (props: PropItem, component: Component) => boolean;

export type InterfaceOrTypeAliasDeclaration =
  | ts.TypeAliasDeclaration
  | ts.InterfaceDeclaration;

export interface PropItem {
  name: string;
  required: boolean;
  type: PropItemType;
  description: string;
  defaultValue: any;
  parent?: ParentType;
  declarations?: ParentType[];
  tags?: {};
}

export interface PropItemType {
  name: string;
  value?: any;
  raw?: string;
}

export interface ParentType {
  name: string;
  fileName: string;
}

export interface Component {
  name: string;
}

export type ComponentNameResolver = (
  exp: ts.Symbol,
  source: ts.SourceFile,
) => string | undefined | null | false;

export interface StaticPropFilter {
  skipPropsWithName?: string[] | string;
  skipPropsWithoutDoc?: boolean;
}

export interface JSDoc {
  description: string;
  fullComment: string;
  tags: StringIndexedObject<string>;
}

export const defaultJSDoc: JSDoc = {
  description: "",
  fullComment: "",
  tags: {},
};

//TODO
export interface ParserOptions {
  propFilter?: StaticPropFilter | PropFilter;
  componentNameResolver?: ComponentNameResolver;
  shouldExtractLiteralValuesFromEnum?: boolean;
  shouldRemoveUndefinedFromOptional?: boolean;
  shouldExtractValuesFromUnion?: boolean;
  shouldSortUnions?: boolean;
  skipChildrenPropWithoutDoc?: boolean;
  savePropValueAsString?: boolean;
  shouldIncludePropTagMap?: boolean;
  shouldIncludeExpression?: boolean;
  customComponentTypes?: string[];
}
export interface ComponentDoc {
  expression?: ts.Symbol;
  rootExpression?: ts.Symbol;
  displayName: string;
  filePath: string;
  description: string;
  props: Props;
  // methods: Method[];
  tags?: StringIndexedObject<string>;
}

export interface MethodParameter {
  name: string;
  description?: string | null;
  type: MethodParameterType;
}

export interface MethodParameterType {
  name: string;
}
export interface Method {
  name: string;
  docblock: string;
  modifiers: string[];
  params: MethodParameter[];
  returns?: {
    description?: string | null;
    type?: string;
  } | null;
  description: string;
}

export interface StringIndexedObject<T> {
  [key: string]: T;
}

export interface Props extends StringIndexedObject<PropItem> {}

export function buildFilter(opts: ParserOptions): PropFilter {
  return (prop: PropItem, component: Component) => {
    const { propFilter } = opts;
    // skip children property in case it has no custom documentation
    if (
      prop.name === "children" &&
      prop.description.length === 0 &&
      opts.skipChildrenPropWithoutDoc !== false
    ) {
      return false;
    }
    if (typeof propFilter === "function") {
      const keep = propFilter(prop, component);
      if (!keep) {
        return false;
      }
    } else if (typeof propFilter === "object") {
      const { skipPropsWithName, skipPropsWithoutDoc } =
        propFilter as StaticPropFilter;
      if (
        typeof skipPropsWithName === "string" &&
        skipPropsWithName === prop.name
      ) {
        return false;
      } else if (
        Array.isArray(skipPropsWithName) &&
        skipPropsWithName.indexOf(prop.name) > -1
      ) {
        return false;
      }
      if (skipPropsWithoutDoc && prop.description.length === 0) {
        return false;
      }
    }
    return true;
  };
}

export interface FileParser {
  parse(filePathOrPaths: string | string[]): ComponentDoc[];
}
