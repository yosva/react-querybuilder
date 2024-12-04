import { defaultOperatorNegationMap } from '../../defaults';
import type {
  DefaultOperatorName,
  DefaultRuleGroupType,
  DefaultRuleGroupTypeAny,
  DefaultRuleGroupTypeIC,
  DefaultRuleType,
  ParsePostgRESTOptions,
  RQBPostgREST,
  RQBPostgRESTVar,
  ValueSource,
} from '../../types/index.noReact';
import { joinWith } from '../arrayUtils';
import { convertToIC } from '../convertQuery';
import { isRuleGroup, isRuleGroupType } from '../isRuleGroup';
import { isPojo } from '../misc';
import { objectKeys } from '../objectUtils';
import { fieldIsValidUtil, getFieldsArray } from '../parserUtils';
import {
  isPostgRESTAnd,
  isPostgRESTBetweenExclusive,
  isPostgRESTBetweenInclusive,
  isPostgRESTDoubleNegation,
  isPostgRESTEqual,
  isPostgRESTGreaterThan,
  isPostgRESTGreaterThanOrEqual,
  isPostgRESTInArray,
  isPostgRESTInString,
  isPostgRESTLessThan,
  isPostgRESTLessThanOrEqual,
  isPostgRESTNegation,
  isPostgRESTNotEqual,
  isPostgRESTOr,
  isPostgRESTStrictEqual,
  isPostgRESTStrictNotEqual,
  isRQBPostgRESTEndsWith,
  isRQBPostgRESTStartsWith,
  isRQBPostgRESTVar,
} from './utils';

const emptyRuleGroup: DefaultRuleGroupType = { combinator: 'and', rules: [] };

/**
 * Converts a PostgREST object into a query suitable for the
 * {@link QueryBuilder} component's `query` or `defaultQuery` props
 * ({@link DefaultRuleGroupType}).
 */
function parsePostgREST(rqbPostgREST: string | RQBPostgREST): DefaultRuleGroupType;
/**
 * Converts a PostgREST object into a query suitable for the
 * {@link QueryBuilder} component's `query` or `defaultQuery` props
 * ({@link DefaultRuleGroupType}).
 */
function parsePostgREST(
  rqbPostgREST: string | RQBPostgREST,
  options: Omit<ParsePostgRESTOptions, 'independentCombinators'> & {
    independentCombinators?: false;
  }
): DefaultRuleGroupType;
/**
 * Converts a PostgREST object into a query suitable for the
 * {@link QueryBuilder} component's `query` or `defaultQuery` props
 * ({@link DefaultRuleGroupTypeIC}).
 */
function parsePostgREST(
  rqbPostgREST: string | RQBPostgREST,
  options: Omit<ParsePostgRESTOptions, 'independentCombinators'> & {
    independentCombinators: true;
  }
): DefaultRuleGroupTypeIC;
function parsePostgREST(
  rqbPostgREST: string | RQBPostgREST,
  options: ParsePostgRESTOptions = {}
): DefaultRuleGroupTypeAny {
  const fieldsFlat = getFieldsArray(options.fields);
  const { getValueSources, listsAsArrays, PostgRESTOperations } = options;

  const fieldIsValid = (
    fieldName: string,
    operator: DefaultOperatorName,
    subordinateFieldName?: string
  ) =>
    fieldIsValidUtil({
      fieldName,
      fieldsFlat,
      operator,
      subordinateFieldName,
      getValueSources,
    });

  // Overload 1: Always return a rule group or false for the outermost logic object
  function processLogic(logic: RQBPostgREST, outermost: true): DefaultRuleGroupType | false;
  // Overload 2: If not the outermost object, return value could also be a rule
  function processLogic(
    logic: RQBPostgREST,
    outermost?: false
  ): DefaultRuleGroupType | DefaultRuleType | false;
  // Implementation
  function processLogic(
    logic: RQBPostgREST,
    outermost?: boolean
  ): DefaultRuleGroupType | DefaultRuleType | false {
    // Bail if the outermost logic is not a plain object
    if (outermost && !isPojo(logic)) {
      return false;
    }
    const [key, keyValue] = Object.entries(logic || {})?.[0] ?? [];

    // Custom operations process logic
    if (PostgRESTOperations && objectKeys(PostgRESTOperations).includes(key)) {
      const rule = PostgRESTOperations[key](keyValue) as DefaultRuleType;
      return rule
        ? outermost && !isRuleGroup(rule)
          ? { combinator: 'and', rules: [rule] }
          : rule
        : false;
    }

    // Rule groups
    if (isPostgRESTAnd(logic)) {
      return {
        combinator: 'and',
        rules: logic.and.map(l => processLogic(l)).filter(Boolean) as (
          | DefaultRuleType
          | DefaultRuleGroupType
        )[],
      };
    } else if (isPostgRESTOr(logic)) {
      return {
        combinator: 'or',
        rules: logic.or.map(l => processLogic(l)).filter(Boolean) as (
          | DefaultRuleType
          | DefaultRuleGroupType
        )[],
      };
    } else if (isPostgRESTNegation(logic)) {
      const rule = processLogic(logic['!']);
      if (rule) {
        if (
          !isRuleGroupType(rule) &&
          (rule.operator === 'between' ||
            rule.operator === 'in' ||
            rule.operator === 'contains' ||
            rule.operator === 'beginsWith' ||
            rule.operator === 'endsWith')
        ) {
          const newRule = { ...rule, operator: defaultOperatorNegationMap[rule.operator] };
          if (outermost) {
            return { combinator: 'and', rules: [newRule] };
          }
          return newRule;
        } else if (isPostgRESTBetweenExclusive(logic['!']) || isRuleGroupType(rule)) {
          return { ...rule, not: true };
        }
        return { combinator: 'and', rules: [rule], not: true };
      }
      return false;
    } else if (isPostgRESTDoubleNegation(logic)) {
      const rule = processLogic(logic['!!']);
      return rule || false;
    }

    // All other keys represent rules
    let rule: DefaultRuleType | false = false;
    let field = '';
    let operator: DefaultOperatorName = '=';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = '';
    let valueSource: ValueSource | undefined = undefined;

    if (
      // Basic boolean operations
      isPostgRESTEqual(logic) ||
      isPostgRESTStrictEqual(logic) ||
      isPostgRESTNotEqual(logic) ||
      isPostgRESTStrictNotEqual(logic) ||
      isPostgRESTGreaterThan(logic) ||
      isPostgRESTGreaterThanOrEqual(logic) ||
      isPostgRESTLessThan(logic) ||
      isPostgRESTLessThanOrEqual(logic) ||
      isPostgRESTInString(logic) ||
      isRQBPostgRESTStartsWith(logic) ||
      isRQBPostgRESTEndsWith(logic)
    ) {
      const [first, second] = keyValue;
      if (isRQBPostgRESTVar(first) && !isPojo(second)) {
        field = first.var;
        value = second;
      } else if (!isPojo(first) && isRQBPostgRESTVar(second)) {
        field = second.var;
        value = first;
      } else if (isRQBPostgRESTVar(first) && isRQBPostgRESTVar(second)) {
        field = first.var;
        value = second.var;
        valueSource = 'field';
      } else {
        return false;
      }

      // Translate operator if necessary
      if (isPostgRESTEqual(logic) || isPostgRESTStrictEqual(logic)) {
        operator = value === null ? 'null' : '=';
      } else if (isPostgRESTNotEqual(logic) || isPostgRESTStrictNotEqual(logic)) {
        operator = value === null ? 'notNull' : '!=';
      } else if (isPostgRESTInString(logic)) {
        operator = 'contains';
      } else if (isRQBPostgRESTStartsWith(logic)) {
        operator = 'beginsWith';
      } else if (isRQBPostgRESTEndsWith(logic)) {
        operator = 'endsWith';
      } else {
        operator = key as DefaultOperatorName;
      }

      if (fieldIsValid(field, operator, valueSource === 'field' ? value : undefined)) {
        rule = { field, operator, value, valueSource };
      }
    } else if (isPostgRESTBetweenExclusive(logic) && isRQBPostgRESTVar(logic['<'][1])) {
      field = logic['<'][1].var;
      const values = [logic['<'][0], logic['<'][2]];
      // istanbul ignore else
      if (
        values.every(v => isRQBPostgRESTVar(v)) ||
        values.every(el => typeof el === 'string') ||
        values.every(el => typeof el === 'number') ||
        values.every(el => typeof el === 'boolean')
      ) {
        return (
          processLogic({
            and: [{ '>': [{ var: field }, values[0]] }, { '<': [{ var: field }, values[1]] }],
          }) || /* istanbul ignore next */ false
        );
      }
    } else if (isPostgRESTBetweenInclusive(logic) && isRQBPostgRESTVar(logic['<='][1])) {
      field = logic['<='][1].var;
      operator = 'between';
      const values = [logic['<='][0], logic['<='][2]];
      if (logic['<='].every(v => isRQBPostgRESTVar(v))) {
        const vars = values as RQBPostgRESTVar[];
        valueSource = 'field';
        const fieldList = vars.map(el => el.var).filter(sf => fieldIsValid(field, operator, sf));
        value = listsAsArrays ? fieldList : joinWith(fieldList, ',');
      } else {
        // istanbul ignore else
        if (
          values.every(el => typeof el === 'string') ||
          values.every(el => typeof el === 'number') ||
          values.every(el => typeof el === 'boolean')
        ) {
          value = listsAsArrays
            ? values
            : joinWith(
                values.map(el => `${el}`),
                ','
              );
        }
      }

      if (fieldIsValid(field, operator) && value.length >= 2) {
        rule = { field, operator, value, valueSource };
      }
    } else if (isPostgRESTInArray(logic) && isRQBPostgRESTVar(keyValue[0])) {
      field = keyValue[0].var;
      operator = 'in';
      if (logic.in[1].every(v => isRQBPostgRESTVar(v))) {
        valueSource = 'field';
        const fieldList = logic.in[1]
          .map(el => el.var as string)
          .filter(sf => fieldIsValid(field, operator, sf));
        value = listsAsArrays ? fieldList : joinWith(fieldList, ',');
      } else {
        // istanbul ignore else
        if (
          logic.in[1].every(el => typeof el === 'string') ||
          logic.in[1].every(el => typeof el === 'number') ||
          logic.in[1].every(el => typeof el === 'boolean')
        ) {
          value = listsAsArrays
            ? logic.in[1]
            : joinWith(
                logic.in[1].map(el => `${el}`),
                ','
              );
        }
      }

      // istanbul ignore else
      if (value.length > 0) {
        rule = { field, operator, value, valueSource };
      }
    }

    return rule ? (outermost ? { combinator: 'and', rules: [rule] } : rule) : false;
  }

  let logicRoot = rqbPostgREST;
  if (typeof rqbPostgREST === 'string') {
    try {
      logicRoot = JSON.parse(rqbPostgREST);
    } catch {
      return emptyRuleGroup;
    }
  }

  const result = processLogic(logicRoot, true);
  const finalQuery: DefaultRuleGroupType = result || emptyRuleGroup;
  return options.independentCombinators
    ? convertToIC<DefaultRuleGroupTypeIC>(finalQuery)
    : finalQuery;
}

export { parsePostgREST };
