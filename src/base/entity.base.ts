import { Prop } from '@nestjs/mongoose';
import { ObjectId, Types } from 'mongoose';

export class BaseEntity {
  _id: ObjectId | Types.ObjectId;

  @Prop({ default: null })
  deleted_at: Date;

  id: string;

  constructor(partial: Partial<BaseEntity>) {
    Object.assign(this, partial);
    this.id = this._id?.toString();
  }
}
