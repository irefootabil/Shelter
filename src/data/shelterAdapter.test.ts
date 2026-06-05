import { describe, expect, it } from "vitest";
import {
  normalizeShelterGroups,
  normalizeShelters,
  shelterCountyGroups,
  shelters,
} from "./shelterAdapter";

const baseRawGroup = {
  id: "AB",
  name: "Alba",
  center: {
    lat: 46.072,
    lon: 23.568,
  },
  items: [
    {
      id: 21,
      county: "AB",
      town: "Unirea",
      address: "Str. Avram Iancu, nr. 70",
      type: "public",
      lat: 46.41084,
      lon: 23.8077,
      capacity: 26,
      status: "green",
    },
  ],
};

describe("shelterAdapter", () => {
  it("normalizes raw county groups and shelter records into the app schema", () => {
    expect(normalizeShelterGroups([baseRawGroup])).toEqual([
      {
        id: "AB",
        name: "Alba",
        center: {
          latitude: 46.072,
          longitude: 23.568,
        },
        shelters: [
          {
            id: "AB-21",
            county: "AB",
            town: "Unirea",
            address: "Str. Avram Iancu, nr. 70",
            type: "public",
            latitude: 46.41084,
            longitude: 23.8077,
            capacity: 26,
            status: "functional",
          },
        ],
      },
    ]);
  });

  it("maps upstream status and type labels conservatively", () => {
    const rawGroup = {
      ...baseRawGroup,
      items: [
        { ...baseRawGroup.items[0], id: 1, type: "privat", status: "orange" },
        { ...baseRawGroup.items[0], id: 2, type: "public", status: "red" },
        { ...baseRawGroup.items[0], id: 3, type: "unexpected", status: 0 },
      ],
    };

    expect(normalizeShelters([rawGroup])).toEqual([
      expect.objectContaining({ id: "AB-1", type: "private", status: "partial" }),
      expect.objectContaining({ id: "AB-2", type: "public", status: "nonfunctional" }),
      expect.objectContaining({ id: "AB-3", type: "unknown", status: "unknown" }),
    ]);
  });

  it("drops records that are incomplete or outside Romania coordinate bounds", () => {
    const rawGroup = {
      ...baseRawGroup,
      items: [
        { ...baseRawGroup.items[0], id: 1 },
        { ...baseRawGroup.items[0], id: 2, address: "" },
        { ...baseRawGroup.items[0], id: 3, lat: 51.5, lon: -0.12 },
      ],
    };

    expect(normalizeShelters([rawGroup])).toEqual([
      expect.objectContaining({ id: "AB-1" }),
    ]);
  });

  it("normalizes invalid capacity to null", () => {
    const rawGroup = {
      ...baseRawGroup,
      items: [{ ...baseRawGroup.items[0], capacity: 0 }],
    };

    expect(normalizeShelters([rawGroup])).toEqual([expect.objectContaining({ capacity: null })]);
  });

  it("loads the vendored dataset with stable counts after normalization", () => {
    expect(shelterCountyGroups).toHaveLength(42);
    expect(shelters).toHaveLength(5747);
    expect(shelters.filter((shelter) => shelter.status === "functional")).toHaveLength(544);
    expect(shelters.filter((shelter) => shelter.status === "unknown")).toHaveLength(19);
  });
});
