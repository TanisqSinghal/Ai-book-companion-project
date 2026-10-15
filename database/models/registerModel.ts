import { Schema, model, models, deleteModel } from "mongoose";

// The dev server keeps mongoose loaded across code reloads, so `models.X || model(...)` would keep
// serving the first schema it saw and silently drop fields added since (e.g. after a git pull).
// In development, re-register the model with the current schema; production loads it once.
// Typed like the `models.X || model(...)` pattern it replaces, so existing queries keep their types.
export const registerModel = <T>(name: string, schema: Schema<T>): (typeof models)[string] => {
    if (process.env.NODE_ENV !== 'production' && models[name]) {
        deleteModel(name);
    }

    return models[name] || model<T>(name, schema);
};
