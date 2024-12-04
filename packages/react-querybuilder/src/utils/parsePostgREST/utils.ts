import type {
  PostgRESTAnd,
  PostgRESTDoubleNegation,
  PostgRESTEqual,
  PostgRESTGreaterThan,
  PostgRESTGreaterThanOrEqual,
  PostgRESTInArray,
  PostgRESTInString,
  PostgRESTLessThan,
  PostgRESTLessThanOrEqual,
  PostgRESTNegation,
  PostgRESTNotEqual,
  PostgRESTOr,
  PostgRESTStrictEqual,
  PostgRESTStrictNotEqual,
  PostgRESTVar,
  RQBPostgREST,
  RQBPostgRESTEndsWith,
  RQBPostgRESTStartsWith,
  RQBPostgRESTVar,
} from '../../types/index.noReact';
import { isPojo } from '../misc';
import type { PostgRESTBetweenExclusive, PostgRESTBetweenInclusive } from './types';

// Standard PostgREST operations
export const isPostgRESTVar = (
  logic: RQBPostgREST
): logic is PostgRESTVar<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
  isPojo(logic) && 'var' in logic;
export const isRQBPostgRESTVar = (logic: RQBPostgREST): logic is RQBPostgRESTVar =>
  isPostgRESTVar(logic) && typeof logic.var === 'string';
export const isPostgRESTEqual = (logic: RQBPostgREST): logic is PostgRESTEqual =>
  isPojo(logic) && '==' in logic;
export const isPostgRESTStrictEqual = (logic: RQBPostgREST): logic is PostgRESTStrictEqual =>
  isPojo(logic) && '===' in logic;
export const isPostgRESTNotEqual = (logic: RQBPostgREST): logic is PostgRESTNotEqual =>
  isPojo(logic) && '!=' in logic;
export const isPostgRESTStrictNotEqual = (logic: RQBPostgREST): logic is PostgRESTStrictNotEqual =>
  isPojo(logic) && '!==' in logic;
export const isPostgRESTNegation = (logic: RQBPostgREST): logic is PostgRESTNegation =>
  isPojo(logic) && '!' in logic;
export const isPostgRESTDoubleNegation = (logic: RQBPostgREST): logic is PostgRESTDoubleNegation =>
  isPojo(logic) && '!!' in logic;
export const isPostgRESTOr = (
  logic: RQBPostgREST
): logic is PostgRESTOr<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
  isPojo(logic) && 'or' in logic;
export const isPostgRESTAnd = (
  logic: RQBPostgREST
): logic is PostgRESTAnd<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
  isPojo(logic) && 'and' in logic;
export const isPostgRESTGreaterThan = (
  logic: RQBPostgREST
): logic is PostgRESTGreaterThan<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
  isPojo(logic) && '>' in logic;
export const isPostgRESTGreaterThanOrEqual = (
  logic: RQBPostgREST
): logic is PostgRESTGreaterThanOrEqual<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
  isPojo(logic) && '>=' in logic;
export const isPostgRESTLessThan = (
  logic: RQBPostgREST
): logic is PostgRESTLessThan<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
  isPojo(logic) && '<' in logic && logic['<'].length === 2;
export const isPostgRESTLessThanOrEqual = (
  logic: RQBPostgREST
): logic is PostgRESTLessThanOrEqual<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
  isPojo(logic) && '<=' in logic && logic['<='].length === 2;
export const isPostgRESTInArray = (
  logic: RQBPostgREST
): logic is PostgRESTInArray<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
  isPojo(logic) && 'in' in logic && Array.isArray(logic.in[1]);
export const isPostgRESTInString = (
  logic: RQBPostgREST
): logic is PostgRESTInString<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
  isPojo(logic) && 'in' in logic && !Array.isArray(logic.in[1]);

// "Between" operations are special cases of '<' and '<='
export const isPostgRESTBetweenExclusive = (
  logic: RQBPostgREST
): logic is PostgRESTBetweenExclusive =>
  isPojo(logic) && '<' in logic && Array.isArray(logic['<']) && logic['<'].length === 3;
export const isPostgRESTBetweenInclusive = (
  logic: RQBPostgREST
): logic is PostgRESTBetweenInclusive =>
  isPojo(logic) && '<=' in logic && Array.isArray(logic['<=']) && logic['<='].length === 3;

// RQB extensions
export const isRQBPostgRESTStartsWith = (logic: RQBPostgREST): logic is RQBPostgRESTStartsWith =>
  isPojo(logic) && 'startsWith' in logic;
export const isRQBPostgRESTEndsWith = (logic: RQBPostgREST): logic is RQBPostgRESTEndsWith =>
  isPojo(logic) && 'endsWith' in logic;

// Type guards for unused PostgREST operations

// import type {
//   PostgRESTAll,
//   PostgRESTCat,
//   PostgRESTDifference,
//   PostgRESTFilter,
//   PostgRESTIf,
//   PostgRESTLog,
//   PostgRESTMap,
//   PostgRESTMax,
//   PostgRESTMerge,
//   PostgRESTMin,
//   PostgRESTMissing,
//   PostgRESTMissingSome,
//   PostgRESTNone,
//   PostgRESTProduct,
//   PostgRESTQuotient,
//   PostgRESTReduce,
//   PostgRESTRemainder,
//   PostgRESTSome,
//   PostgRESTSubstr,
//   PostgRESTSum,
// } from '../../types/index.noReact';
//
// export const isPostgRESTMissing = (
//   logic: RQBPostgREST
// ): logic is PostgRESTMissing<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'missing' in logic;
// export const isPostgRESTMissingSome = (
//   logic: RQBPostgREST
// ): logic is PostgRESTMissingSome<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'missing_some' in logic;
// export const isPostgRESTIf = (logic: RQBPostgREST): logic is PostgRESTIf =>
//   isPojo(logic) && 'if' in logic;
// export const isPostgRESTMax = (
//   logic: RQBPostgREST
// ): logic is PostgRESTMax<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'max' in logic;
// export const isPostgRESTMin = (
//   logic: RQBPostgREST
// ): logic is PostgRESTMin<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'min' in logic;
// export const isPostgRESTSum = (
//   logic: RQBPostgREST
// ): logic is PostgRESTSum<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && '+' in logic;
// export const isPostgRESTDifference = (
//   logic: RQBPostgREST
// ): logic is PostgRESTDifference<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && '-' in logic;
// export const isPostgRESTProduct = (
//   logic: RQBPostgREST
// ): logic is PostgRESTProduct<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && '*' in logic;
// export const isPostgRESTQuotient = (
//   logic: RQBPostgREST
// ): logic is PostgRESTQuotient<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && '/' in logic;
// export const isPostgRESTRemainder = (
//   logic: RQBPostgREST
// ): logic is PostgRESTRemainder<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && '%' in logic;
// export const isPostgRESTMap = (
//   logic: RQBPostgREST
// ): logic is PostgRESTMap<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'map' in logic;
// export const isPostgRESTFilter = (
//   logic: RQBPostgREST
// ): logic is PostgRESTFilter<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'filter' in logic;
// export const isPostgRESTReduce = (
//   logic: RQBPostgREST
// ): logic is PostgRESTReduce<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'reduce' in logic;
// export const isPostgRESTAll = (
//   logic: RQBPostgREST
// ): logic is PostgRESTAll<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'all' in logic;
// export const isPostgRESTNone = (
//   logic: RQBPostgREST
// ): logic is PostgRESTNone<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'none' in logic;
// export const isPostgRESTSome = (
//   logic: RQBPostgREST
// ): logic is PostgRESTSome<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'some' in logic;
// export const isPostgRESTMerge = (
//   logic: RQBPostgREST
// ): logic is PostgRESTMerge<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'merge' in logic;
// export const isPostgRESTCat = (
//   logic: RQBPostgREST
// ): logic is PostgRESTCat<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'cat' in logic;
// export const isPostgRESTSubstr = (
//   logic: RQBPostgREST
// ): logic is PostgRESTSubstr<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'substr' in logic;
// export const isPostgRESTLog = (
//   logic: RQBPostgREST
// ): logic is PostgRESTLog<RQBPostgRESTStartsWith | RQBPostgRESTEndsWith> =>
//   isPojo(logic) && 'log' in logic;
