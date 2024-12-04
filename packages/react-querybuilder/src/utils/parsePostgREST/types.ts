import type {
  PostgRESTLessThan,
  PostgRESTLessThanOrEqual,
  PostgRESTRulesLogic,
} from '../../types/index.noReact';

export interface PostgRESTBetweenExclusive extends PostgRESTLessThan {
  '<': [PostgRESTRulesLogic, PostgRESTRulesLogic, PostgRESTRulesLogic];
}
export interface PostgRESTBetweenInclusive extends PostgRESTLessThanOrEqual {
  '<=': [PostgRESTRulesLogic, PostgRESTRulesLogic, PostgRESTRulesLogic];
}
