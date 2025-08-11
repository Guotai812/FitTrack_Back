import HttpError from "../models/HttpError.js";
import User from "../models/User.js";
import Basic from "../models/Basic.js";

export async function getUserAndRecord(uid, router, name, date) {
  let existingUser;
  try {
    existingUser = await User.findById(uid);
  } catch (error) {
    console.error(`${router} – error finding user:`, error);
    throw new HttpError(`Failed to ${name}`, 500);
  }
  if (!existingUser) {
    console.warn(`${router} – user not found:`, uid);
    throw new HttpError(`Failed to ${name}`, 404);
  }

  let record;
  try {
    record = await Basic.findOne({ userId: uid, date: date });
  } catch (error) {
    console.error(`${router} – DB error finding Basic record:`, error);
    throw new HttpError("Server error", 500);
  }
  if (!record) {
    console.warn(`${router} – no record for today:`, today);
    throw new HttpError("No diet record for today", 404);
  }
  return { existingUser, record };
}
