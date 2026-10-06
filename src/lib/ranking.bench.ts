import { bench, describe } from "vitest";
import { shelters } from "../data";
import { referenceRanking } from "../test/rankingReference";
import { rankShelters } from "./ranking";

const coordinate = { latitude: 44.4268, longitude: 26.1025 };

describe(`nationwide ranking: ${shelters.length} shelters, 4 nearest`, () => {
  bench("previous two-sort implementation", () => {
    referenceRanking(coordinate, shelters, { limit: 4 });
  }, { time: 1000 });
  bench("current production implementation", () => {
    rankShelters(coordinate, shelters, { limit: 4 });
  }, { time: 1000 });
});
