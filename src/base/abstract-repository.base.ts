import { map } from 'lodash';
import { Model, QueryFilter, QueryOptions } from 'mongoose';
import { BaseEntity } from './entity.base';
import { BaseRepositoryInterface } from './repository.base';

export abstract class BaseRepositoryAbstract<
  T extends BaseEntity,
> implements BaseRepositoryInterface<T> {
  protected constructor(private readonly model: Model<T>) {
    this.model = model;
  }

  async create(dto: T | Partial<T>): Promise<T> {
    const created_data = await this.model.create(dto);
    return created_data;
  }

  async findOneById(id: string): Promise<T> {
    const item = await this.model.findById(id);
    if (!item) return null;
    return item.deleted_at ? null : item;
  }

  async findOneByCondition(condition = {}, ...relations: string[]): Promise<T> {
    return await this.model
      .findOne({
        ...condition,
        deleted_at: null,
      })
      .populate([...map(relations, (relation) => ({ path: relation }))])
      .exec();
  }

  async findAll(
    condition: QueryFilter<T>,
    options?: QueryOptions<T>,
  ): Promise<any> {
    const [count, items] = await Promise.all([
      this.model.countDocuments({ ...condition, deleted_at: null }),
      this.model
        .find({ ...condition, deleted_at: null }, options?.projection, options)
        .lean()
        .exec(),
    ]);
    return {
      count,
      items,
    };
  }

  async update(id: string, dto: Partial<T>): Promise<T> {
    return await this.model.findOneAndUpdate(
      { _id: id, deleted_at: null },
      dto,
      { new: true },
    );
  }

  async softDelete(id: string): Promise<boolean> {
    const delete_item = await this.model.findById(id);
    if (!delete_item) {
      return false;
    }

    return !!(await this.model
      .findByIdAndUpdate<T>(id, { deleted_at: new Date() })
      .exec());
  }

  async permanentlyDelete(id: string): Promise<boolean> {
    const delete_item = await this.model.findById(id);
    if (!delete_item) {
      return false;
    }
    return !!(await this.model.findByIdAndDelete(id));
  }

  async softRemove(id: string): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, { deleted_at: new Date() }, { new: true })
      .exec();
  }

  async deleteMany(condition: any = {}): Promise<number> {
    const result = await this.model.deleteMany({ ...condition });
    return result.deletedCount || 0;
  }
}
