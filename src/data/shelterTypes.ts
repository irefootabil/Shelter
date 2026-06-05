export type ShelterStatus = "functional" | "partial" | "nonfunctional" | "unknown";
export type ShelterType = "public" | "private" | "unknown";

export type Shelter = {
  id: string;
  county: string;
  town: string;
  address: string;
  type: ShelterType;
  latitude: number;
  longitude: number;
  capacity: number | null;
  status: ShelterStatus;
};

export type CountyShelterGroup = {
  id: string;
  name: string;
  center: {
    latitude: number;
    longitude: number;
  };
  shelters: Shelter[];
};
