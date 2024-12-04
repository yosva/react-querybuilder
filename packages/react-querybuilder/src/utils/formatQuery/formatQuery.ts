import { produce } from 'immer';
import { defaultPlaceholderFieldName, defaultPlaceholderOperatorName } from '../../defaults';
import type {
  DefaultCombinatorName,
  ExportFormat,
  FormatQueryOptions,
  FullField,
  FullOperator,
  FullOptionList,
  ParameterizedNamedSQL,
  ParameterizedSQL,
  QueryValidator,
  RQBJsonLogic,
  RQBPostgREST,
  RuleGroupType,
  RuleGroupTypeAny,
  RuleProcessor,
  RuleType,
  RuleValidator,
  SQLPreset,
  ValidationMap,
  ValidationResult,
} from '../../types/index.noReact';
import { convertFromIC } from '../convertQuery';
import { isRuleGroup, isRuleGroupType } from '../isRuleGroup';
import { isRuleOrGroupValid } from '../isRuleOrGroupValid';
import { isPojo } from '../misc';
import { getOption, toFlatOptionArray, toFullOptionList } from '../optGroupUtils';
import { defaultRuleProcessorCEL } from './defaultRuleProcessorCEL';
import { defaultRuleProcessorElasticSearch } from './defaultRuleProcessorElasticSearch';
import { defaultRuleProcessorJSONata } from './defaultRuleProcessorJSONata';
import { defaultRuleProcessorJsonLogic } from './defaultRuleProcessorJsonLogic';
import { defaultRuleProcessorMongoDB } from './defaultRuleProcessorMongoDB';
import { defaultRuleProcessorNL } from './defaultRuleProcessorNL';
import { defaultRuleProcessorParameterized } from './defaultRuleProcessorParameterized';
import { defaultRuleProcessorSpEL } from './defaultRuleProcessorSpEL';
import { defaultRuleProcessorSQL } from './defaultRuleProcessorSQL';
import { defaultValueProcessorByRule } from './defaultValueProcessorByRule';
import { defaultValueProcessorNL } from './defaultValueProcessorNL';
import { defaultRuleProcessorPostgREST } from './defaultRuleProcessorPostgREST';
import {
  celCombinatorMap,
  getQuoteFieldNamesWithArray,
  isValueProcessorLegacy,
  numerifyValues,
} from './utils';

const sqlDialectPresets = {
  ansi: {},
  sqlite: {
    paramsKeepPrefix: true,
  },
  oracle: {},
  mssql: {
    concatOperator: '+',
    quoteFieldNamesWith: ['[', ']'],
    fieldIdentifierSeparator: '.',
  },
  mysql: {
    concatOperator: 'CONCAT',
  },
  postgresql: {
    quoteFieldNamesWith: '"',
    numberedParams: true,
    paramPrefix: '$',
  },
} satisfies Record<SQLPreset, FormatQueryOptions>;

/**
 * Generates a formatted (indented two spaces) JSON string from a query object.
 */
function formatQuery(ruleGroup: RuleGroupTypeAny): string;
/**
 * Generates a {@link ParameterizedSQL} object from a query object.
 */
function formatQuery(
  ruleGroup: RuleGroupTypeAny,
  options: 'parameterized' | (FormatQueryOptions & { format: 'parameterized' })
): ParameterizedSQL;
/**
 * Generates a {@link ParameterizedNamedSQL} object from a query object.
 */
function formatQuery(
  ruleGroup: RuleGroupTypeAny,
  options: 'parameterized_named' | (FormatQueryOptions & { format: 'parameterized_named' })
): ParameterizedNamedSQL;
/**
 * Generates a {@link JsonLogic} object from a query object.
 */
function formatQuery(
  ruleGroup: RuleGroupTypeAny,
  options: 'jsonlogic' | (FormatQueryOptions & { format: 'jsonlogic' })
): RQBJsonLogic;
/**
 * Generates an ElasticSearch query object from an RQB query object.
 *
 * NOTE: Support for the ElasticSearch format is experimental.
 * You may have better results exporting "sql" format then using
 * [ElasticSearch SQL](https://www.elastic.co/guide/en/elasticsearch/reference/current/xpack-sql.html).
 */
function formatQuery(
  ruleGroup: RuleGroupTypeAny,
  options: 'elasticsearch' | (FormatQueryOptions & { format: 'elasticsearch' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any>;
/**
 * Generates a JSONata query string from an RQB query object.
 *
 * NOTE: The `parseNumbers` option is recommended for this format.
 */
function formatQuery(
  ruleGroup: RuleGroupTypeAny,
  options: 'jsonata' | (FormatQueryOptions & { format: 'jsonata' })
): string;
/**
 * Generates a formatted (indented two spaces) JSON string from a query object.
 */
function formatQuery(ruleGroup: RuleGroupTypeAny, options: FormatQueryOptions): string;
/**
 * Generates a query string in the requested format.
 */
function formatQuery(
  ruleGroup: RuleGroupTypeAny,
  options: Exclude<
    ExportFormat,
    'parameterized' | 'parameterized_named' | 'jsonlogic' | 'elasticsearch' | 'jsonata' | 'postgrest'
  >
): string;
/**
 * Generates a query string in the requested format.
 */
function formatQuery(
  ruleGroup: RuleGroupTypeAny,
  options: FormatQueryOptions & {
    format: Exclude<
      ExportFormat,
      'parameterized' | 'parameterized_named' | 'jsonlogic' | 'elasticsearch' | 'jsonata' | 'postgrest'
    >;
  }
): string;
function formatQuery(ruleGroup: RuleGroupTypeAny, options: FormatQueryOptions | ExportFormat = {}) {
  let format: ExportFormat = 'json';
  let valueProcessorInternal = defaultValueProcessorByRule;
  let ruleProcessorInternal: RuleProcessor | null = null;
  let quoteFieldNamesWith: [string, string] = ['', ''];
  let fieldIdentifierSeparator: string = '';
  let validator: QueryValidator = () => true;
  let fields: FullOptionList<FullField> = [];
  let getOperators: (
    field: string,
    misc: { fieldData: FullField }
  ) => FullOptionList<FullOperator> | null = () => [];
  let validationMap: ValidationMap = {};
  let fallbackExpression = '';
  let paramPrefix = ':';
  let paramsKeepPrefix = false;
  let numberedParams = false;
  let parseNumbers = false;
  let placeholderFieldName: string = defaultPlaceholderFieldName;
  let placeholderOperatorName: string = defaultPlaceholderOperatorName;
  let quoteValuesWith = "'";
  let concatOperator = '||';

  if (typeof options === 'string') {
    format = options.toLowerCase() as ExportFormat;
    switch (format) {
      case 'natural_language':
        ruleProcessorInternal = defaultRuleProcessorNL;
        break;
      case 'mongodb':
        ruleProcessorInternal = defaultRuleProcessorMongoDB;
        break;
      case 'parameterized':
        ruleProcessorInternal = defaultRuleProcessorParameterized;
        break;
      case 'parameterized_named':
        ruleProcessorInternal = defaultRuleProcessorParameterized;
        break;
      case 'cel':
        ruleProcessorInternal = defaultRuleProcessorCEL;
        break;
      case 'spel':
        ruleProcessorInternal = defaultRuleProcessorSpEL;
        break;
      case 'jsonlogic':
        ruleProcessorInternal = defaultRuleProcessorJsonLogic;
        break;
      case 'elasticsearch':
        ruleProcessorInternal = defaultRuleProcessorElasticSearch;
        break;
      case 'jsonata':
        ruleProcessorInternal = defaultRuleProcessorJSONata;
        break;
      case 'postgrest':
          ruleProcessorInternal = defaultRuleProcessorPostgREST;
          break;
      default:
    }
  } else {
    const optionsWithPresets = {
      ...(sqlDialectPresets[options.preset ?? 'ansi'] ?? null),
      ...options,
    };
    format = (optionsWithPresets.format ?? 'json').toLowerCase() as ExportFormat;
    const { valueProcessor = null, ruleProcessor = null } = optionsWithPresets;
    if (typeof ruleProcessor === 'function') {
      ruleProcessorInternal = ruleProcessor;
    }
    valueProcessorInternal =
      typeof valueProcessor === 'function'
        ? (r, opts) =>
            isValueProcessorLegacy(valueProcessor)
              ? valueProcessor(r.field, r.operator, r.value, r.valueSource)
              : valueProcessor(r, opts)
        : format === 'natural_language'
          ? defaultValueProcessorNL
          : format === 'mongodb'
            ? (ruleProcessorInternal ?? defaultRuleProcessorMongoDB)
            : format === 'cel'
              ? (ruleProcessorInternal ?? defaultRuleProcessorCEL)
              : format === 'spel'
                ? (ruleProcessorInternal ?? defaultRuleProcessorSpEL)
                : format === 'jsonlogic'
                  ? (ruleProcessorInternal ?? defaultRuleProcessorJsonLogic)
                  : format === 'elasticsearch'
                    ? (ruleProcessorInternal ?? defaultRuleProcessorElasticSearch)
                    : format === 'jsonata'
                      ? (ruleProcessorInternal ?? defaultRuleProcessorJSONata)
                      : format === 'postgrest'
                      ? (ruleProcessorInternal ?? defaultRuleProcessorPostgREST)
                        : defaultValueProcessorByRule;
    quoteFieldNamesWith = getQuoteFieldNamesWithArray(optionsWithPresets.quoteFieldNamesWith);
    fieldIdentifierSeparator = optionsWithPresets.fieldIdentifierSeparator ?? '';
    validator = optionsWithPresets.validator ?? (() => true);
    fields = toFullOptionList(optionsWithPresets.fields ?? []);
    getOperators = (f, m) => toFullOptionList(optionsWithPresets.getOperators?.(f, m) ?? []);
    fallbackExpression = optionsWithPresets.fallbackExpression ?? '';
    paramPrefix = optionsWithPresets.paramPrefix ?? ':';
    paramsKeepPrefix = !!optionsWithPresets.paramsKeepPrefix;
    numberedParams = !!optionsWithPresets.numberedParams;
    parseNumbers = !!optionsWithPresets.parseNumbers;
    placeholderFieldName = optionsWithPresets.placeholderFieldName ?? defaultPlaceholderFieldName;
    placeholderOperatorName =
      optionsWithPresets.placeholderOperatorName ?? defaultPlaceholderOperatorName;
    quoteValuesWith = optionsWithPresets.quoteValuesWith ?? "'";
    concatOperator = optionsWithPresets.concatOperator ?? '||';
  }
  if (!fallbackExpression) {
    fallbackExpression =
      format === 'mongodb'
        ? '"$and":[{"$expr":true}]'
        : format === 'cel' || format === 'spel'
          ? '1 == 1'
          : format === 'natural_language'
            ? '1 is 1'
            : '(1 = 1)';
  }

  // #region JSON
  if (format === 'json' || format === 'json_without_ids') {
    const rg = parseNumbers ? produce(ruleGroup, numerifyValues) : ruleGroup;
    if (format === 'json_without_ids') {
      return JSON.stringify(rg, (key, value) =>
        // Remove `id` and `path` keys; leave everything else unchanged.
        key === 'id' || key === 'path' ? undefined : value
      );
    }
    return JSON.stringify(rg, null, 2);
  }
  // #endregion

  // #region Validation
  // istanbul ignore else
  if (typeof validator === 'function') {
    const validationResult = validator(ruleGroup);
    if (typeof validationResult === 'boolean') {
      if (validationResult === false) {
        return format === 'parameterized'
          ? { sql: fallbackExpression, params: [] }
          : format === 'parameterized_named'
            ? { sql: fallbackExpression, params: {} }
            : format === 'mongodb'
              ? `{${fallbackExpression}}`
              : format === 'jsonlogic'
                ? false
                : format === 'elasticsearch'
                  ? {}
                  : fallbackExpression;
      }
    } else {
      validationMap = validationResult;
    }
  }

  const validatorMap: Record<string, RuleValidator> = {};
  const uniqueFields = toFlatOptionArray(fields) satisfies FullField[];
  for (const f of uniqueFields) {
    // istanbul ignore else
    if (typeof f.validator === 'function') {
      validatorMap[(f.value ?? /* istanbul ignore next */ f.name)!] = f.validator;
    }
  }

  const validateRule = (rule: RuleType) => {
    let validationResult: boolean | ValidationResult | undefined;
    let fieldValidator: RuleValidator | undefined;
    if (rule.id) {
      validationResult = validationMap[rule.id];
    }
    if (uniqueFields.length > 0) {
      const fieldArr = uniqueFields.filter(f => f.name === rule.field);
      if (fieldArr.length > 0) {
        const field = fieldArr[0];
        // istanbul ignore else
        if (typeof field.validator === 'function') {
          fieldValidator = field.validator;
        }
      }
    }
    return [validationResult, fieldValidator] as const;
  };
  // #endregion

  // #region SQL
  if (format === 'sql') {
    const processRuleGroup = (rg: RuleGroupTypeAny, outermostOrLonelyInGroup?: boolean): string => {
      if (!isRuleOrGroupValid(rg, validationMap[rg.id ?? /* istanbul ignore next */ ''])) {
        // TODO: test for the last case and remove "ignore" comment
        return outermostOrLonelyInGroup ? fallbackExpression : /* istanbul ignore next */ '';
      }

      const processedRules = rg.rules.map(rule => {
        // Independent combinators
        if (typeof rule === 'string') {
          return rule;
        }

        // Groups
        if (isRuleGroup(rule)) {
          return processRuleGroup(rule, rg.rules.length === 1);
        }

        // Basic rule validation
        const [validationResult, fieldValidator] = validateRule(rule);
        if (
          !isRuleOrGroupValid(rule, validationResult, fieldValidator) ||
          rule.field === placeholderFieldName ||
          rule.operator === placeholderOperatorName
        ) {
          return '';
        }

        const escapeQuotes = (rule.valueSource ?? 'value') === 'value';

        const fieldData = getOption(fields, rule.field);

        // Use custom rule processor if provided...
        if (typeof ruleProcessorInternal === 'function') {
          return ruleProcessorInternal(rule, {
            parseNumbers,
            escapeQuotes,
            quoteFieldNamesWith,
            fieldIdentifierSeparator,
            fieldData,
            format,
            quoteValuesWith,
            concatOperator,
          });
        }
        // ...otherwise use default rule processor and pass in the value
        // processor (which may be custom)
        return defaultRuleProcessorSQL(rule, {
          parseNumbers,
          escapeQuotes,
          valueProcessor: valueProcessorInternal,
          quoteFieldNamesWith,
          fieldIdentifierSeparator,
          fieldData,
          format,
          quoteValuesWith,
          concatOperator,
        });
      });

      if (processedRules.length === 0) {
        return fallbackExpression;
      }

      return `${rg.not ? 'NOT ' : ''}(${processedRules
        .filter(Boolean)
        .join(isRuleGroupType(rg) ? ` ${rg.combinator} ` : ' ')})`;
    };

    return processRuleGroup(ruleGroup, true);
  }
  // #endregion

  // #region Parameterized SQL
  if (format === 'parameterized' || format === 'parameterized_named') {
    const parameterized = format === 'parameterized';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paramsNamed: Record<string, any> = {};
    const fieldParams: Map<string, Set<string>> = new Map();

    const getNextNamedParam = (field: string) => {
      if (!fieldParams.has(field)) {
        fieldParams.set(field, new Set());
      }
      const nextNamedParam = `${field}_${fieldParams.get(field)!.size + 1}`;
      fieldParams.get(field)!.add(nextNamedParam);
      return nextNamedParam;
    };

    const processRule = (rule: RuleType) => {
      const [validationResult, fieldValidator] = validateRule(rule);
      if (
        !isRuleOrGroupValid(rule, validationResult, fieldValidator) ||
        rule.field === placeholderFieldName ||
        rule.operator === placeholderOperatorName
      ) {
        return '';
      }

      const fieldData = getOption(fields, rule.field);

      const fieldParamNames = Object.fromEntries(
        ([...fieldParams.entries()] as [string, Set<string>][]).map(([f, s]) => [f, [...s]])
      );

      const processedRule = (
        typeof ruleProcessorInternal === 'function'
          ? ruleProcessorInternal
          : defaultRuleProcessorParameterized
      )(
        rule,
        {
          getNextNamedParam,
          fieldParamNames,
          parseNumbers,
          quoteFieldNamesWith,
          concatOperator,
          fieldIdentifierSeparator,
          fieldData,
          format,
          paramPrefix,
          paramsKeepPrefix,
          numberedParams,
          fallbackExpression,
          valueProcessor: valueProcessorInternal,
          fields,
          placeholderFieldName,
          placeholderOperatorName,
          validator,
        },
        {
          processedParams: params,
        }
      );

      if (!isPojo(processedRule)) {
        return '';
      }

      const { sql, params: customParams } = processedRule;

      if (typeof sql !== 'string' || !sql) {
        return '';
      }

      // istanbul ignore else
      if (format === 'parameterized' && Array.isArray(customParams)) {
        params.push(...customParams);
      } else if (format === 'parameterized_named' && isPojo(customParams)) {
        Object.assign(paramsNamed, customParams);
        // `getNextNamedParam` already adds new params to the list, but a custom
        // rule processor might not call it so we need to make sure we add
        // any new params here.
        for (const p of Object.keys(customParams)) fieldParams.get(rule.field)?.add(p);
      }

      return sql;
    };

    const processRuleGroup = (rg: RuleGroupTypeAny, outermostOrLonelyInGroup?: boolean): string => {
      if (!isRuleOrGroupValid(rg, validationMap[rg.id ?? /* istanbul ignore next */ ''])) {
        // TODO: test for the last case and remove "ignore" comment
        return outermostOrLonelyInGroup ? fallbackExpression : /* istanbul ignore next */ '';
      }

      const processedRules = rg.rules.map(rule => {
        if (typeof rule === 'string') {
          return rule;
        }
        if (isRuleGroup(rule)) {
          return processRuleGroup(rule, rg.rules.length === 1);
        }
        return processRule(rule);
      });

      if (processedRules.length === 0) {
        return fallbackExpression;
      }

      return `${rg.not ? 'NOT ' : ''}(${processedRules
        .filter(Boolean)
        .join(isRuleGroupType(rg) ? ` ${rg.combinator} ` : ' ')})`;
    };

    if (parameterized) {
      return { sql: processRuleGroup(ruleGroup, true), params };
    }
    return { sql: processRuleGroup(ruleGroup, true), params: paramsNamed };
  }
  // #endregion

  // #region MongoDB
  if (format === 'mongodb') {
    const processRuleGroup = (rg: RuleGroupType, outermost?: boolean) => {
      if (!isRuleOrGroupValid(rg, validationMap[rg.id ?? /* istanbul ignore next */ ''])) {
        return outermost ? fallbackExpression : '';
      }

      const combinator = `"$${rg.combinator.toLowerCase()}"`;
      let hasChildRules = false;

      const expressions: string[] = rg.rules
        .map(rule => {
          if (isRuleGroup(rule)) {
            const processedRuleGroup = processRuleGroup(rule);
            if (processedRuleGroup) {
              hasChildRules = true;
              // Don't wrap in curly braces if the result already is.
              return /^{.+}$/.test(processedRuleGroup)
                ? processedRuleGroup
                : `{${processedRuleGroup}}`;
            }
            return '';
          }
          const [validationResult, fieldValidator] = validateRule(rule);
          if (
            !isRuleOrGroupValid(rule, validationResult, fieldValidator) ||
            rule.field === placeholderFieldName ||
            rule.operator === placeholderOperatorName
          ) {
            return '';
          }
          const fieldData = getOption(fields, rule.field);
          return (ruleProcessorInternal ?? valueProcessorInternal)(rule, {
            parseNumbers,
            fieldData,
            format,
          });
        })
        .filter(Boolean);

      return expressions.length > 0
        ? expressions.length === 1 && !hasChildRules
          ? expressions[0]
          : `${combinator}:[${expressions.join(',')}]`
        : fallbackExpression;
    };

    const rgStandard = isRuleGroupType(ruleGroup) ? ruleGroup : convertFromIC(ruleGroup);
    const processedQuery = processRuleGroup(rgStandard, true);
    return /^{.+}$/.test(processedQuery) ? processedQuery : `{${processedQuery}}`;
  }
  // #endregion

  // #region CEL
  if (format === 'cel') {
    const processRuleGroup = (rg: RuleGroupTypeAny, outermost?: boolean) => {
      if (!isRuleOrGroupValid(rg, validationMap[rg.id ?? /* istanbul ignore next */ ''])) {
        return outermost ? fallbackExpression : '';
      }

      const expression: string = rg.rules
        .map(rule => {
          if (typeof rule === 'string') {
            return celCombinatorMap[rule as DefaultCombinatorName];
          }
          if (isRuleGroup(rule)) {
            return processRuleGroup(rule);
          }
          const [validationResult, fieldValidator] = validateRule(rule);
          if (
            !isRuleOrGroupValid(rule, validationResult, fieldValidator) ||
            rule.field === placeholderFieldName ||
            rule.operator === placeholderOperatorName
          ) {
            return '';
          }
          const fieldData = getOption(fields, rule.field);
          return (ruleProcessorInternal ?? valueProcessorInternal)(rule, {
            parseNumbers,
            escapeQuotes: (rule.valueSource ?? 'value') === 'value',
            fieldData,
            format,
          });
        })
        .filter(Boolean)
        .join(
          isRuleGroupType(rg)
            ? ` ${celCombinatorMap[rg.combinator as DefaultCombinatorName]} `
            : ' '
        );

      const [prefix, suffix] = rg.not || !outermost ? [`${rg.not ? '!' : ''}(`, ')'] : ['', ''];

      return expression ? `${prefix}${expression}${suffix}` : fallbackExpression;
    };

    return processRuleGroup(ruleGroup, true);
  }
  // #endregion

  // #region SpEL
  if (format === 'spel') {
    const processRuleGroup = (rg: RuleGroupTypeAny, outermost?: boolean) => {
      if (!isRuleOrGroupValid(rg, validationMap[rg.id ?? /* istanbul ignore next */ ''])) {
        return outermost ? fallbackExpression : '';
      }

      const expression: string = rg.rules
        .map(rule => {
          if (typeof rule === 'string') {
            return rule;
          }
          if (isRuleGroup(rule)) {
            return processRuleGroup(rule);
          }
          const [validationResult, fieldValidator] = validateRule(rule);
          if (
            !isRuleOrGroupValid(rule, validationResult, fieldValidator) ||
            rule.field === placeholderFieldName ||
            rule.operator === placeholderOperatorName
          ) {
            return '';
          }
          const fieldData = getOption(fields, rule.field);
          return (ruleProcessorInternal ?? valueProcessorInternal)(rule, {
            parseNumbers,
            escapeQuotes: (rule.valueSource ?? 'value') === 'value',
            fieldData,
            format,
          });
        })
        .filter(Boolean)
        .join(isRuleGroupType(rg) ? ` ${rg.combinator} ` : ' ');

      const [prefix, suffix] = rg.not || !outermost ? [`${rg.not ? '!' : ''}(`, ')'] : ['', ''];

      return expression ? `${prefix}${expression}${suffix}` : fallbackExpression;
    };

    return processRuleGroup(ruleGroup, true);
  }
  // #endregion

  // #region JSONata
  if (format === 'jsonata') {
    const processRuleGroup = (rg: RuleGroupTypeAny, outermost?: boolean) => {
      if (!isRuleOrGroupValid(rg, validationMap[rg.id ?? /* istanbul ignore next */ ''])) {
        return outermost ? fallbackExpression : '';
      }

      const expression: string = rg.rules
        .map(rule => {
          if (typeof rule === 'string') {
            return rule;
          }
          if (isRuleGroup(rule)) {
            return processRuleGroup(rule);
          }
          const [validationResult, fieldValidator] = validateRule(rule);
          if (
            !isRuleOrGroupValid(rule, validationResult, fieldValidator) ||
            rule.field === placeholderFieldName ||
            rule.operator === placeholderOperatorName
          ) {
            return '';
          }
          const fieldData = getOption(fields, rule.field);
          return (ruleProcessorInternal ?? valueProcessorInternal)(rule, {
            parseNumbers,
            escapeQuotes: (rule.valueSource ?? 'value') === 'value',
            fieldData,
            format,
            quoteFieldNamesWith,
            fieldIdentifierSeparator,
          });
        })
        .filter(Boolean)
        .join(isRuleGroupType(rg) ? ` ${rg.combinator} ` : ' ');

      const [prefix, suffix] = rg.not || !outermost ? [`${rg.not ? '$not' : ''}(`, ')'] : ['', ''];

      return expression ? `${prefix}${expression}${suffix}` : fallbackExpression;
    };

    return processRuleGroup(ruleGroup, true);
  }
  // #endregion

  // #region JsonLogic
  if (format === 'jsonlogic') {
    const query = isRuleGroupType(ruleGroup) ? ruleGroup : convertFromIC(ruleGroup);

    const processRuleGroup = (rg: RuleGroupType, _outermost?: boolean): RQBJsonLogic => {
      if (!isRuleOrGroupValid(rg, validationMap[rg.id ?? /* istanbul ignore next */ ''])) {
        return false;
      }

      const processedRules = rg.rules
        .map(rule => {
          if (isRuleGroup(rule)) {
            return processRuleGroup(rule);
          }
          const [validationResult, fieldValidator] = validateRule(rule);
          if (
            !isRuleOrGroupValid(rule, validationResult, fieldValidator) ||
            rule.field === placeholderFieldName ||
            rule.operator === placeholderOperatorName
          ) {
            return false;
          }
          const fieldData = getOption(fields, rule.field);
          return (ruleProcessorInternal ?? valueProcessorInternal)(rule, {
            parseNumbers,
            fieldData,
            format,
          });
        })
        .filter(Boolean);

      if (processedRules.length === 0) {
        return false;
      }

      const jsonRuleGroup: RQBJsonLogic = { [rg.combinator]: processedRules } as {
        [k in DefaultCombinatorName]: [RQBJsonLogic, RQBJsonLogic, ...RQBJsonLogic[]];
      };

      return rg.not ? { '!': jsonRuleGroup } : jsonRuleGroup;
    };

    return processRuleGroup(query, true);
  }
  // #endregion

  // #region ElasticSearch
  if (format === 'elasticsearch') {
    const query = isRuleGroupType(ruleGroup) ? ruleGroup : convertFromIC(ruleGroup);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processRuleGroup = (rg: RuleGroupType): Record<string, any> | false => {
      if (!isRuleOrGroupValid(rg, validationMap[rg.id ?? /* istanbul ignore next */ ''])) {
        return false;
      }

      const processedRules = rg.rules
        .map(rule => {
          if (isRuleGroup(rule)) {
            return processRuleGroup(rule);
          }
          const [validationResult, fieldValidator] = validateRule(rule);
          if (
            !isRuleOrGroupValid(rule, validationResult, fieldValidator) ||
            rule.field === placeholderFieldName ||
            rule.operator === placeholderOperatorName
          ) {
            return false;
          }
          const fieldData = getOption(fields, rule.field);
          return (ruleProcessorInternal ?? valueProcessorInternal)(rule, {
            parseNumbers,
            fieldData,
            format,
          });
        })
        .filter(Boolean);

      if (processedRules.length === 0) {
        return false;
      }

      return {
        bool: rg.not
          ? {
              must_not:
                rg.combinator === 'or' ? { bool: { should: processedRules } } : processedRules,
            }
          : { [rg.combinator === 'or' ? 'should' : 'must']: processedRules },
      };
    };

    const processedRuleGroup = processRuleGroup(query);
    return processedRuleGroup === false ? {} : processedRuleGroup;
  }
  // #endregion

  // #region Natural language
  if (format === 'natural_language') {
    const processRuleGroup = (rg: RuleGroupTypeAny, outermostOrLonelyInGroup?: boolean): string => {
      if (!isRuleOrGroupValid(rg, validationMap[rg.id ?? /* istanbul ignore next */ ''])) {
        // TODO: test for the last case and remove "ignore" comment
        return outermostOrLonelyInGroup ? fallbackExpression : /* istanbul ignore next */ '';
      }

      const processedRules = rg.rules.map(rule => {
        // Independent combinators
        if (typeof rule === 'string') {
          return `, ${rule} `;
        }

        // Groups
        if (isRuleGroup(rule)) {
          return processRuleGroup(rule, rg.rules.length === 1);
        }

        // Basic rule validation
        const [validationResult, fieldValidator] = validateRule(rule);
        if (
          !isRuleOrGroupValid(rule, validationResult, fieldValidator) ||
          rule.field === placeholderFieldName ||
          rule.operator === placeholderOperatorName
        ) {
          return '';
        }

        const escapeQuotes = (rule.valueSource ?? 'value') === 'value';

        const fieldData = getOption(fields, rule.field);

        // Use custom rule processor if provided...
        if (typeof ruleProcessorInternal === 'function') {
          return ruleProcessorInternal(rule, {
            fields,
            parseNumbers,
            escapeQuotes,
            quoteFieldNamesWith,
            fieldIdentifierSeparator,
            fieldData,
            format,
            quoteValuesWith,
            concatOperator,
            getOperators,
          });
        }
        // ...otherwise use default rule processor and pass in the value
        // processor (which may be custom)
        return defaultRuleProcessorNL(rule, {
          fields,
          parseNumbers,
          escapeQuotes,
          valueProcessor: valueProcessorInternal,
          quoteFieldNamesWith,
          fieldIdentifierSeparator,
          fieldData,
          format,
          quoteValuesWith,
          concatOperator,
          getOperators,
        });
      });

      if (processedRules.length === 0) {
        return fallbackExpression;
      }

      const prefix = rg.not || !outermostOrLonelyInGroup ? '(' : '';
      const suffix = rg.not || !outermostOrLonelyInGroup ? `) is${rg.not ? ' not' : ''} true` : '';

      return `${prefix}${processedRules
        .filter(Boolean)
        .join(isRuleGroupType(rg) ? `, ${rg.combinator} ` : '')}${suffix}`;
    };

    return processRuleGroup(ruleGroup, true);
  }
  // #endregion

    // #region PostgREST
    if (format === 'postgrest') {
      const query = isRuleGroupType(ruleGroup) ? ruleGroup : convertFromIC(ruleGroup);
  
      const processRuleGroup = (rg: RuleGroupType, _outermost?: boolean): RQBJsonLogic => {
        if (!isRuleOrGroupValid(rg, validationMap[rg.id ?? /* istanbul ignore next */ ''])) {
          return false;
        }
  
        const processedRules = rg.rules
          .map(rule => {
            if (isRuleGroup(rule)) {
              return processRuleGroup(rule);
            }
            const [validationResult, fieldValidator] = validateRule(rule);
            if (
              !isRuleOrGroupValid(rule, validationResult, fieldValidator) ||
              rule.field === placeholderFieldName ||
              rule.operator === placeholderOperatorName
            ) {
              return false;
            }
            const fieldData = getOption(fields, rule.field);
            return (ruleProcessorInternal ?? valueProcessorInternal)(rule, {
              parseNumbers,
              fieldData,
              format,
            });
          })
          .filter(Boolean);
  
        if (processedRules.length === 0) {
          return false;
        }
  
        const jsonRuleGroup: RQBPostgREST = { [rg.combinator]: processedRules } as {
          [k in DefaultCombinatorName]: [RQBPostgREST, RQBPostgREST, ...RQBPostgREST[]];
        };
  
        return rg.not ? { '!': jsonRuleGroup } : jsonRuleGroup;
      };
  
      return processRuleGroup(query, true);
    }
    // #endregion

  return '';
}

export { formatQuery };
