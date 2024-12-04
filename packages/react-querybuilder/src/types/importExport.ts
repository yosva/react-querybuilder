import type { FullField, FullOperator, ValueSource, ValueSources } from './basic';
import type { RulesLogic } from 'json-logic-js';
import type { FlexibleOptionList, OptionList } from './options';
import type { RuleGroupType, RuleType } from './ruleGroups';
import type { RuleGroupTypeAny } from './ruleGroupsIC';
import type { QueryValidator } from './validation';

/**
 * Available export formats for {@link formatQuery}.
 */
export type ExportFormat =
  | 'json'
  | 'sql'
  | 'json_without_ids'
  | 'parameterized'
  | 'parameterized_named'
  | 'mongodb'
  | 'cel'
  | 'jsonlogic'
  | 'spel'
  | 'elasticsearch'
  | 'jsonata'
  | 'natural_language'
  | 'postgrest';

export type SQLPreset = 'ansi' | 'sqlite' | 'postgresql' | 'mysql' | 'mssql' | 'oracle';

/**
 * Options object shape for {@link formatQuery}.
 */
export interface FormatQueryOptions {
  /**
   * The {@link ExportFormat}.
   */
  format?: ExportFormat;
  /**
   * This function will be used to process the `value` from each rule
   * for query language formats. If not defined, the appropriate
   * `defaultValueProcessor` for the format will be used.
   */
  valueProcessor?: ValueProcessorLegacy | ValueProcessorByRule;
  /**
   * This function will be used to process each rule for query language
   * formats. If not defined, the appropriate `defaultRuleProcessor`
   * for the format will be used.
   */
  ruleProcessor?: RuleProcessor;
  /**
   * In the "sql", "parameterized", "parameterized_named", and "jsonata" export
   * formats, field names will be bracketed by this string. If an array of strings
   * is passed, field names will be preceded by the first element and
   * succeeded by the second element.
   *
   * A common value for this option is the backtick (```'`'```).
   *
   * Tip: Use `fieldIdentifierSeparator` to bracket identifiers individually within field names.
   *
   * @default '' // the empty string
   *
   * @example
   * formatQuery(query, { format: 'sql', quoteFieldNamesWith: '`' })
   * // "`First name` = 'Steve'"
   *
   * @example
   * formatQuery(query, { format: 'sql', quoteFieldNamesWith: ['[', ']'] })
   * // "[First name] = 'Steve'"
   */
  quoteFieldNamesWith?: string | [string, string];
  /**
   * When used in conjunction with the `quoteFieldNamesWith` option, field names will
   * be split by this string, each part being individually processed as per the rules
   * of the `quoteFieldNamesWith` configuration. The parts will then be re-joined
   * by the same string.
   *
   * A common value for this option is `'.'`.
   *
   * A value of `''` (the empty string) will disable splitting/rejoining.
   *
   * @default ''
   *
   * @example
   * formatQuery(query, {
   *   format: 'sql',
   *   quoteFieldNamesWith: ['[', ']'],
   *   fieldIdentifierSeparator: '.',
   * })
   * // "[dbo].[Musicians].[First name] = 'Steve'"
   */
  fieldIdentifierSeparator?: string;
  /**
   * Character to use for quoting string values in the SQL format.
   * @default `'`
   */
  quoteValuesWith?: string;
  /**
   * Validator function for the entire query. Can be the same function passed
   * as `validator` prop to {@link QueryBuilder}.
   */
  validator?: QueryValidator;
  /**
   * This can be the same {@link FullField} array passed to {@link QueryBuilder}, but
   * really all you need to provide is the `name` and `validator` for each field.
   *
   * The full field object from this array, where the field's identifying property
   * matches the rule's `field`, will be passed to the rule processor.
   */
  fields?: FlexibleOptionList<FullField>;
  /**
   * This can be the same `getOperators` function passed to {@link QueryBuilder}.
   *
   * The full operator object from this array, where the operator's identifying property
   * matches the rule's `operator`, will be passed to the rule processor.
   */
  getOperators?(
    field: string,
    misc: { fieldData: FullField }
  ): FlexibleOptionList<FullOperator> | null;
  /**
   * This string will be inserted in place of invalid groups for non-JSON formats.
   * Defaults to `'(1 = 1)'` for "sql"/"parameterized"/"parameterized_named" and
   * `'$and:[{$expr:true}]'` for "mongodb".
   */
  fallbackExpression?: string;
  /**
   * This string will be placed in front of named parameters (aka bind variables)
   * when using the "parameterized_named" export format.
   *
   * @default ":"
   */
  paramPrefix?: string;
  /**
   * Maintains the parameter prefix in the `params` object keys when using the
   * "parameterized_named" export format. Recommended when using SQLite.
   *
   * @default false
   *
   * @example
   * console.log(formatQuery(query, {
   *   format: "parameterized_named",
   *   paramPrefix: "$",
   *   paramsKeepPrefix: true
   * }).params)
   * // { $firstName: "Stev" }
   * // Default (`paramsKeepPrefix` is `false`):
   * // { firstName: "Stev" }
   */
  paramsKeepPrefix?: boolean;
  /**
   * Renders parameter placeholders as a series of sequential numbers
   * instead of '?' like the default. This option will respect the
   * `paramPrefix` option like the 'parameterized_named' format.
   *
   * @default false
   */
  numberedParams?: boolean;
  /**
   * Renders values as either `number`-types or unquoted strings, as
   * appropriate and when possible. Each `string`-type value is evaluated
   * against {@link numericRegex} to determine if it can be represented as a
   * plain numeric value. If so, `parseFloat` is used to convert it to a number.
   */
  parseNumbers?: boolean;
  /**
   * Any rules where the field is equal to this value will be ignored.
   *
   * @default '~'
   */
  placeholderFieldName?: string;
  /**
   * Any rules where the operator is equal to this value will be ignored.
   *
   * @default '~'
   */
  placeholderOperatorName?: string;
  /**
   * Operator to use when concatenating wildcard characters and field names in "sql" format.
   * The ANSI standard is `||`, while SQL Server uses `+`. MySQL does not implement a concatenation
   * operator by default, and therefore requires use of the `CONCAT` function.
   *
   * If `concatOperator` is set to `"CONCAT"` (case-insensitive), the `CONCAT` function will be
   * used. Note that Oracle SQL does not support more than two values in the `CONCAT` function,
   * so this option should not be used in that context. The default setting (`"||"`) is already
   * compatible with Oracle SQL.
   *
   * @default '||'
   */
  concatOperator?: '||' | '+' | 'CONCAT' | (string & {});
  /**
   * Option presets to maximize compatibility with various SQL dialects.
   */
  preset?: SQLPreset;
}

/**
 * Options object for {@link ValueProcessorByRule} functions.
 */
export interface ValueProcessorOptions extends FormatQueryOptions {
  valueProcessor?: ValueProcessorByRule;
  escapeQuotes?: boolean;
  /**
   * The full field object, if `fields` was provided in the
   * {@link formatQuery} options parameter.
   */
  fieldData?: FullField;
  /**
   * Included for the "parameterized" format only. Represents the total number of
   * parameters for all query rules processed up to that point.
   */
  // TODO: Is this actually useful?
  // paramCount?: number;
  /**
   * Included for the "parameterized_named" format only. Keys of this object represent
   * field names and values represent the current list of parameter names for that
   * field based on the query rules processed up to that point. Use this list to
   * ensure that parameter names generated by the custom rule processor are unique.
   */
  fieldParamNames?: Record<string, string[]>;
  /**
   * Included for the "parameterized_named" format only. Call this function with a
   * field name to get a unique parameter name, as yet unused during query processing.
   */
  getNextNamedParam?: (field: string) => string;
}

/**
 * Function that produces a processed value for a given {@link RuleType}.
 */
export type ValueProcessorByRule = (rule: RuleType, options?: ValueProcessorOptions) => string;

/**
 * Function that produces a processed value for a given `field`, `operator`, `value`,
 * and `valueSource`.
 */
export type ValueProcessorLegacy = (
  field: string,
  operator: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  valueSource?: ValueSource
) => string;

export type ValueProcessor = ValueProcessorLegacy;

/**
 * Function to produce a result that {@link formatQuery} uses when processing a
 * {@link RuleType} object.
 *
 * See the default rule processor for each format to know what type to return.
 * | Format                | Default rule processor                    |
 * | --------------------- | ----------------------------------------- |
 * | `sql`                 | {@link defaultRuleProcessorSQL}           |
 * | `parameterized`       | {@link defaultRuleProcessorParameterized} |
 * | `parameterized_named` | {@link defaultRuleProcessorParameterized} |
 * | `mongodb`             | {@link defaultRuleProcessorMongoDB}       |
 * | `cel`                 | {@link defaultRuleProcessorCEL}           |
 * | `spel`                | {@link defaultRuleProcessorSpEL}          |
 * | `jsonlogic`           | {@link defaultRuleProcessorJsonLogic}     |
 * | `elasticsearch`       | {@link defaultRuleProcessorElasticSearch} |
 * | `jsonata`             | {@link defaultRuleProcessorJSONata} |
 * | `postgrest`           | {@link defaultRuleProcessorPostgREST} |
 */
export type RuleProcessor = (
  rule: RuleType,
  options?: ValueProcessorOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: { processedParams?: Record<string, any> | any[] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => any;

/**
 * Object produced by {@link formatQuery} for the `"parameterized"` format.
 */
export interface ParameterizedSQL {
  /** The SQL `WHERE` clause fragment with `?` placeholders for each value. */
  sql: string;
  /**
   * Parameter values in the same order their respective placeholders
   * appear in the `sql` string.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[];
}

/**
 * Object produced by {@link formatQuery} for the `"parameterized_named"` format.
 */
export interface ParameterizedNamedSQL {
  /** The SQL `WHERE` clause fragment with bind variable placeholders for each value. */
  sql: string;
  /**
   * Map of bind variable names from the `sql` string to the associated values.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>;
}

export interface RQBJsonLogicStartsWith {
  startsWith: [RQBJsonLogic, RQBJsonLogic, ...RQBJsonLogic[]];
}
export interface RQBJsonLogicEndsWith {
  endsWith: [RQBJsonLogic, RQBJsonLogic, ...RQBJsonLogic[]];
}
export interface RQBJsonLogicVar {
  var: string;
}

/**
 * JsonLogic rule object with additional operators generated by {@link formatQuery}
 * and accepted by {@link parseJsonLogic}.
 */
export type RQBJsonLogic = RulesLogic<RQBJsonLogicStartsWith | RQBJsonLogicEndsWith>;

export interface RQBPostgRESTStartsWith {
  startsWith: [RQBPostgREST, RQBPostgREST, ...RQBPostgREST[]];
}
export interface RQBPostgRESTEndsWith {
  endsWith: [RQBPostgREST, RQBPostgREST, ...RQBPostgREST[]];
}
export interface RQBPostgRESTVar {
  var: string;
}

/**
 * PostgREST rule object with additional operators generated by {@link formatQuery}
 * and accepted by {@link parsePostgREST}.
 */
export type RQBPostgREST = RulesLogic<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith>;

/**
 * Options common to all parsers.
 */
interface ParserCommonOptions {
  fields?: OptionList<FullField> | Record<string, FullField>;
  getValueSources?: (field: string, operator: string) => ValueSources;
  listsAsArrays?: boolean;
  independentCombinators?: boolean;
}

/**
 * Options object for {@link parseSQL}.
 */
export interface ParseSQLOptions extends ParserCommonOptions {
  paramPrefix?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any[] | Record<string, any>;
}

/**
 * Options object for {@link parseCEL}.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ParseCELOptions extends ParserCommonOptions {}

/**
 * Options object for {@link parseSpEL}.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ParseSpELOptions extends ParserCommonOptions {}

/**
 * Options object for {@link parseJSONata}.
 *
 * Note: `listsAsArrays` is ignored by `parseJSONata`; lists are _always_ arrays.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ParseJSONataOptions extends ParserCommonOptions {}

/**
 * Options object for {@link parseJsonLogic}.
 */
export interface ParseJsonLogicOptions extends ParserCommonOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonLogicOperations?: Record<string, (value: any) => RuleType | RuleGroupTypeAny | false>;
}

/**
 * Options object for {@link parsePostREST}.
 */
export interface ParsePostRESTOptions extends ParserCommonOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postgRESTOperations?: Record<string, (value: any) => RuleType | RuleGroupTypeAny | false>;
}

/**
 * Options object for {@link parseMongoDB}.
 */
export interface ParseMongoDbOptions extends ParserCommonOptions {
  /**
   * When `true`, MongoDB rules in the form of `{ fieldName: { $not: { <...rule> } } }`
   * will be parsed into a rule group with the `not` attribute set to `true`. By default
   * (i.e., when this attribute is `false`), such "`$not`" rules will be parsed into a
   * rule with a negated operator.
   *
   * For example, with `preventOperatorNegation` set to `true`, a MongoDB rule like this...
   *
   * ```ts
   * { fieldName: { $not: { $eq: 1 } } }
   * ```
   *
   * ...would yield a rule group like this:
   *
   * ```ts
   * {
   *   combinator: 'and',
   *   not: true,
   *   rules: [{ field: 'fieldName', operator: '=', value: 1 }]
   * }
   * ```
   *
   * By default, the same MongoDB rule would yield a rule like this:
   *
   * ```ts
   * { field: 'fieldName', operator: '!=', value: 1 }
   * //              negated operator ^
   * ```
   *
   * @default false
   */
  preventOperatorNegation?: boolean;
  /**
   * Map of additional operators to their respective processing functions. Operators
   * must begin with `"$"`. Processing functions should return either a {@link RuleType}
   * or {@link RuleGroupType}.
   *
   * (The functions should _not_ return {@link RuleGroupTypeIC}, even if using independent
   * combinators. If the `independentCombinators` option is `true`, `parseMongoDB`
   * will convert the final query to {@link RuleGroupTypeIC} before returning it.)
   *
   * @default {}
   */
  additionalOperators?: Record<
    `$${string}`,
    (
      field: string,
      operator: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: any,
      options: ParserCommonOptions
    ) => RuleType | RuleGroupType
  >;
}
