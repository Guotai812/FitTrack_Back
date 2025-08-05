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

export async function getCurrentKcal(userKcal, record) {
  const totalsPerMeal = getTotalsPerFood(record.diets);
  let foodKcal = 0;
  for (const [mealName, totalWeight] of Object.entries(totalsPerMeal)) {
    const eachFood = await Food.findById(mealName);
    foodKcal += (eachFood.kcal * totalWeight) / 100;
  }

  const aerobics = record.exercises.aerobic;
  const anaerobics = record.exercises.anaerobic;

  const aerobicItems = aerobics
    .map(async (entry) => {
      const ex = await Exercise.findById(entry.eid);
      if (!ex || ex.met == null) return null;
      const kcalPerMin = (ex.met * 3.5 * info.weight) / 200;
      const consumedKcal = entry.duration * kcalPerMin;
      return {
        duration: entry.duration,
        consumedKcal,
      };
    })
    .filter((x) => !!x);

  const anaerobicItems = anaerobics
    .map(async (entry) => {
      const ex = await Exercise.findById(entry.eid);
      if (!ex) return null;
      const defaultRom = ex.defaultRom;
      const kcalPerKgMeter = ex.kcalPerKgMeter;

      const volume = entry.sets.reduce(
        (sum, { weight, reps, sets: setCount }) =>
          sum + weight * reps * setCount,
        0
      );

      const rawKcal = entry.sets.reduce(
        (sum, { weight, reps, sets: setCount }) =>
          sum + weight * reps * setCount * defaultRom * kcalPerKgMeter,
        0
      );

      return {
        volume,
        consumedKcal: rawKcal,
      };
    })
    .filter((x) => !!x);

  const aerobicTotal = aerobicItems.reduce(
    (sum, it) => sum + it.consumedKcal,
    0
  );
  const anaerobicTotal = anaerobicItems.reduce(
    (sum, it) => sum + it.consumedKcal,
    0
  );
  const exerciseTotal = aerobicTotal + anaerobicTotal;
  return userKcal - foodKcal + exerciseTotal;
}
