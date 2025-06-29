
import mongoose, { Schema, Document, models, Model } from 'mongoose';

// User Interface and Schema
export interface IUser extends Document {
  email: string;
  password?: string; // Optional because a user might sign up via a social provider that doesn't use a password
  name: string;
  photoURL?: string;
  provider?: 'google' | 'facebook' | 'credentials';
  status: 'active' | 'blocked';
  isAdmin: boolean;
  privateNumberList: string[];
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String, required: true },
  photoURL: { type: String },
  provider: { type: String, default: 'credentials' },
  status: { type: String, default: 'active' },
  isAdmin: { type: Boolean, default: false },
  privateNumberList: { type: [String], default: [] },
}, { timestamps: true });

export const User: Model<IUser> = models.User || mongoose.model<IUser>('User', UserSchema);


// Settings Interface and Schema
export interface ISetting extends Document {
  key: string;
  value: any;
}

const SettingSchema: Schema = new Schema({
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
});

export const Setting: Model<ISetting> = models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
