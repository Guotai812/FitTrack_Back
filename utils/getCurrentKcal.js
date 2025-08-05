import Food from "../models/Food.js";
import Exercise from "../models/Exercise.js";

function getTotalsPerFood(diets) {
  return Object.values(diets)
    .flatMap(({ main, extra }) => [...main, ...extra])
    .filter(({ food, weight }) => food && weight > 0)
    .reduce((acc, { food, weight }) => {
      acc[food] = (acc[food] || 0) + weight;
      return acc;
    }, {});
}

export async function getCurrentKcal(userKcal, record, userWeight = 0) {
  const totalsPerMeal = getTotalsPerFood(record.diets);
  let foodKcal = 0;
  for (const [mealName, totalWeight] of Object.entries(totalsPerMeal)) {
    const eachFood = await Food.findById(mealName);
    foodKcal += (eachFood.kcal * totalWeight) / 100;
  }

  let aerobicTotal = 0;
  for (const entry of record.exercises.aerobic ?? []) {
    const ex = await Exercise.findById(entry.eid);
    if (!ex?.met) continue;
    const kcalPerMin = (ex.met * 3.5 * userWeight) / 200;
    aerobicTotal += entry.duration * kcalPerMin;
  }

  let anaerobicTotal = 0;
  for (const entry of record.exercises.anaerobic ?? []) {
    const ex = await Exercise.findById(entry.eid);
    if (!ex) continue; // skip if lookup failed

    const { defaultRom, kcalPerKgMeter } = ex;
    const consumedKcal = entry.sets.reduce(
      (sum, { weight, reps, sets: setCount }) =>
        sum + weight * reps * setCount * defaultRom * kcalPerKgMeter,
      0
    );
    anaerobicTotal += consumedKcal;
  }

  const exerciseTotal = aerobicTotal + anaerobicTotal;
  return userKcal - foodKcal + exerciseTotal;
}
