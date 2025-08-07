export function calCulateKcal(user) {
  const { weight, height, frequency, gender, goal, birthdate } =
    user;

  const age = new Date().getFullYear() - new Date(birthdate).getFullYear();

  const freMultiplier =
    frequency === "0"
      ? 1.2
      : frequency === "1-3"
      ? 1.375
      : frequency === "3-5"
      ? 1.55
      : frequency === "over 5"
      ? 1.725
      : 1;
  const TDEE =
    gender === "male"
      ? (10 * weight + 6.25 * height - 5 * age) * freMultiplier
      : (10 * weight + 6.25 * height - 5 * age - 161) * freMultiplier;

  return goal === "keep fit"
    ? TDEE
    : goal === "lose fat"
    ? TDEE - 300
    : TDEE + 300;
}
