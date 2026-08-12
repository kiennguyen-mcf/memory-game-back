import {
  convertObjectIdToString,
  generateShortUUID,
  getRandomColor,
  isJson,
  parseRedisUrl,
} from './helper';
import { Types } from 'mongoose';

describe('helper', () => {
  it('should convert ObjectId to string', () => {
    const id = new Types.ObjectId();
    expect(convertObjectIdToString(id)).toBe(id.toString());
  });

  it('should convert nested objects recursively', () => {
    const id = new Types.ObjectId();
    const result = convertObjectIdToString({ _id: id, nested: { id } });
    expect(result).toEqual({
      _id: id.toString(),
      nested: { id: id.toString() },
    });
  });

  it('should detect json strings and objects', () => {
    expect(isJson('{"a":1}')).toBe(true);
    expect(isJson('not json')).toBe(false);
    expect(isJson({ a: 1 })).toBe(true);
  });

  it('should parse redis url', () => {
    expect(parseRedisUrl('redis://redis:6380/3')).toEqual({
      host: 'redis',
      port: 6380,
      database: 3,
      password: '',
    });
    expect(parseRedisUrl('redis://:pass@localhost:6379')).toEqual({
      host: 'localhost',
      port: 6379,
      database: 0,
      password: 'pass',
    });
  });

  it('should generate a hex color', () => {
    expect(getRandomColor()).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('should generate a short uuid', () => {
    expect(generateShortUUID()).toHaveLength(24);
  });
});
