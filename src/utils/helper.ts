import { createHash, randomUUID } from 'crypto';
import {
  isArray,
  isDate,
  isFunction,
  isObject,
  keys,
  map,
  reduce,
} from 'lodash';
import { Document, Types } from 'mongoose';

export const currentTime = () => new Date();

export const isJson = (val: unknown) => {
  try {
    if (typeof val === 'string') {
      JSON.parse(val);
    } else {
      JSON.parse(JSON.stringify(val));
    }

    return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return false;
  }
};

export const toObjectId = (id: string | Types.ObjectId) => {
  if (id instanceof Types.ObjectId) {
    return id;
  }

  return new Types.ObjectId(id);
};

export const objectIdToString = (val: Types.ObjectId | string) => {
  if (val instanceof Types.ObjectId) return val.toString();
  return val;
};

export const convertObjectIdToString = (val: any) => {
  if (val instanceof Document) return convertObjectIdToString(val.toObject());

  if (val instanceof Types.ObjectId) return val.toString();

  if (isFunction(val) || isDate(val) || !isObject(val)) return val;

  if (isArray(val)) return map(val, convertObjectIdToString);

  return reduce(
    keys(val),
    (prev: any, key) => ({ ...prev, [key]: convertObjectIdToString(val[key]) }),
    {},
  );
};

export interface trimObjectValuesProps {
  omitEmpty?: boolean;
  exclude?: string[];
  excludePrefix?: string[];
  exposeEmptyArray?: boolean;
}

export function generateShortUUID(): string {
  const uuid = randomUUID();
  const hash = createHash('sha256').update(uuid).digest('base64');
  return hash.replace(/[^a-zA-Z0-9]/g, '').substring(0, 24);
}

export const getRandomColor = () => {
  const randomColor = `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, '0')}`;

  return randomColor;
};

export const parseRedisUrl = (url: string) => {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    database: parsed.pathname ? Number(parsed.pathname.slice(1) || 0) : 0,
    password: parsed.password ? decodeURIComponent(parsed.password) : '',
  };
};
