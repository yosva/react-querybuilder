 import type { RuleProcessor } from '../../types/index.noReact';
 import type { RQBPostgREST } from '../../../../../../DefinitelyTyped/types/postgrest-filter';
import { toArray } from '../arrayUtils';
import { parseNumber } from '../parseNumber';
import { isValidValue, shouldRenderAsNumber } from './utils';

const convertOperator = (op: '<' | '<=' | '=' | '!=' | '>' | '>=') =>
  op
    .replace(/^(=)$/, '$1=')
    .replace(/^notnull$/i, 'neq')
    .replace(/^null$/i, '==') as '<' | '<=' | '==' | '!=' | '===' | '!==' | '>' | '>=';

const negateIfNotOp = (op: string, jsonRule: RQBPostgREST) =>
  /^(does)?not/i.test(op) ? { 'not': jsonRule } : jsonRule;

/**
 * Default rule processor used by {@link formatQuery} for "postgrest" format.
 */
export const defaultRuleProcessorPostgREST: RuleProcessor = (
  { field, operator, value, valueSource },
  { parseNumbers } = {}
): RQBPostgREST => {
  const valueIsField = valueSource === 'field';
  const fieldObject: PostgRESTVar = { var: field };
  const fieldOrNumberRenderer = (v: string) =>
    valueIsField
      ? { var: `${v}` }
      : shouldRenderAsNumber(v, parseNumbers)
        ? parseNumber(v, { parseNumbers })
        : v;

  switch (operator) {
    case '<':
    case '<=':
    case '=':
    case '!=':
    case '>':
    case '>=':
      return {
        [convertOperator(operator)]: [fieldObject, fieldOrNumberRenderer(value)],
      } as RQBPostgREST;

    case 'null':
    case 'notNull': {
      return {
        [`${operator === 'notNull' ? '!' : '='}=`]: [fieldObject, null],
      } as RQBPostgREST;
    }

    case 'in':
    case 'notIn': {
      const valueAsArray = toArray(value).map(v => fieldOrNumberRenderer(v));
      return negateIfNotOp(operator, { in: [fieldObject, valueAsArray] });
    }

    case 'between':
    case 'notBetween': {
      const valueAsArray = toArray(value);
      if (
        valueAsArray.length >= 2 &&
        isValidValue(valueAsArray[0]) &&
        isValidValue(valueAsArray[1])
      ) {
        let [first, second] = valueAsArray;
        if (
          !valueIsField &&
          shouldRenderAsNumber(first, true) &&
          shouldRenderAsNumber(second, true)
        ) {
          const firstNum = parseNumber(first, { parseNumbers: true });
          const secondNum = parseNumber(second, { parseNumbers: true });
          if (secondNum < firstNum) {
            const tempNum = secondNum;
            second = firstNum;
            first = tempNum;
          } else {
            first = firstNum;
            second = secondNum;
          }
        } else if (valueIsField) {
          first = { var: first };
          second = { var: second };
        }
        const jsonRule: RQBPostgREST = { '<=': [first, fieldObject, second] };
        return negateIfNotOp(operator, jsonRule);
      }
      return false;
    }

    case 'contains':
    case 'doesNotContain': {
      const jsonRule: RQBPostgREST = {
        in: [fieldOrNumberRenderer(value), fieldObject],
      };
      return negateIfNotOp(operator, jsonRule);
    }

    case 'beginsWith':
    case 'doesNotBeginWith': {
      const jsonRule: RQBPostgREST = {
        startsWith: [fieldObject, fieldOrNumberRenderer(value)],
      };
      return negateIfNotOp(operator, jsonRule);
    }

    case 'endsWith':
    case 'doesNotEndWith': {
      const jsonRule: RQBPostgREST = {
        endsWith: [fieldObject, fieldOrNumberRenderer(value)],
      };
      return negateIfNotOp(operator, jsonRule);
    }
  }
  return false;
};
