import { convertObjectIdToString, isJson } from '@/utils/helper';
import {
  includes,
  isArray,
  isDate,
  isEmpty,
  isFunction,
  isNil,
  isObject,
  isString,
  keys,
  map,
  omitBy,
  reduce,
  reject,
  some,
  startsWith,
  trim,
} from 'lodash';

interface trimObjectValuesProps {
  omitEmpty?: boolean;
  exclude?: string[];
  excludePrefix?: string[];
  exposeEmptyArray?: boolean;
}

export const trimObjectValues = (
  values: any,
  {
    omitEmpty,
    exclude,
    excludePrefix,
    exposeEmptyArray,
  }: trimObjectValuesProps = {
    omitEmpty: false,
    exclude: [],
    excludePrefix: [],
    exposeEmptyArray: false,
  },
): any => {
  if (!isJson(values)) return values;

  const isRemove = (val: any) => {
    if (isObject(val) && !isFunction(val) && !isDate(val)) {
      if (exposeEmptyArray) return isArray(val) ? false : isEmpty(val);
      return isEmpty(val);
    }

    if (isString(val)) {
      return !val;
    }

    return isNil(val);
  };

  const isIgnore = (val: any) =>
    isFunction(val) || isDate(val) || !isObject(val);

  const trims = (val: any): any => {
    if (isString(val)) return trim(val);

    if (isIgnore(val)) return val;

    if (isArray(val)) {
      const results = map(val, (value) => trims(value));
      return omitEmpty ? reject(results, (val) => isRemove(val)) : results;
    }

    const results = reduce(
      keys(val),
      (prev: any, key) => {
        const trimmed = trims(val[key]);

        if (key === '_id') return { ...prev, id: trimmed };

        if (
          some(excludePrefix, (prefix) => startsWith(key, prefix)) ||
          includes(exclude, key)
        )
          return prev;

        return { ...prev, [key]: trimmed };
      },
      {},
    );

    return omitEmpty ? omitBy(results, (val) => isRemove(val)) : results;
  };

  const result = trims(convertObjectIdToString(values));
  return result;
};
