import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import fs from 'fs';

export interface IUser extends Document {
  username: string;
  password: string;
  role: string;
  comparePassword: (password: string) => Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['ADMIN', 'USER'] }
});

// Hash password before saving
UserSchema.pre<IUser>('save', async function(next) {
  if (this.isModified('password') || this.isNew) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

UserSchema.methods.comparePassword = function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
