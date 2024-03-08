import { getSlots } from "./index.js";
import { DateTime, Settings } from "luxon";
Settings.defaultZone = "UTC";
import { test, expect } from "vitest";

const dateTimeRef = DateTime.utc(2022, 1, 1);

function log(value: any) {
  console.dir(value, { depth: null });
}

test("Basic", async () => {
  // true, true
  const { allSlots } = getSlots({
    from: dateTimeRef.toISO(),
    to: dateTimeRef.plus({ hour: 2 }).toISO(),
    duration: 60,
  });

  expect(allSlots).toEqual([
    {
      from: "2022-01-01T00:00:00.000Z",
      to: "2022-01-01T01:00:00.000Z",
      available: true,
    },
    {
      from: "2022-01-01T01:00:00.000Z",
      to: "2022-01-01T02:00:00.000Z",
      available: true,
    },
  ]);
});

test("Basic available", async () => {
  // false, true
  const { allSlots } = getSlots({
    from: dateTimeRef.toISO(),
    to: dateTimeRef.plus({ hour: 2 }).toISO(),
    availability: [
      {
        from: dateTimeRef.plus({ hour: 1 }).toISO(),
        to: dateTimeRef.plus({ hour: 2 }).toISO(),
      },
    ],
    duration: 60,
  });

  expect(allSlots).toEqual([
    {
      from: "2022-01-01T00:00:00.000Z",
      to: "2022-01-01T01:00:00.000Z",
      available: false,
    },
    {
      from: "2022-01-01T01:00:00.000Z",
      to: "2022-01-01T02:00:00.000Z",
      available: true,
    },
  ]);
});

test("Basic unavailable", async () => {
  // true, false
  const { allSlots } = getSlots({
    from: dateTimeRef.toISO(),
    to: dateTimeRef.plus({ hour: 2 }).toISO(),
    unavailability: [
      {
        from: dateTimeRef.plus({ hour: 1 }).toISO(),
        to: dateTimeRef.plus({ hour: 2 }).toISO(),
      },
    ],
    duration: 60,
  });

  expect(allSlots).toEqual([
    {
      from: "2022-01-01T00:00:00.000Z",
      to: "2022-01-01T01:00:00.000Z",
      available: true,
    },
    {
      from: "2022-01-01T01:00:00.000Z",
      to: "2022-01-01T02:00:00.000Z",
      available: false,
    },
  ]);
});

test("Basic available and unavailable", async () => {
  // false, true, false
  const { allSlots } = getSlots({
    from: dateTimeRef.toISO(),
    to: dateTimeRef.plus({ hour: 3 }).toISO(),
    availability: [
      {
        from: dateTimeRef.plus({ hour: 1 }).toISO(),
        to: dateTimeRef.plus({ hour: 2 }).toISO(),
      },
    ],
    unavailability: [
      {
        from: dateTimeRef.plus({ hour: 2 }).toISO(),
        to: dateTimeRef.plus({ hour: 3 }).toISO(),
      },
    ],
    duration: 60,
  });

  expect(allSlots).toEqual([
    {
      from: "2022-01-01T00:00:00.000Z",
      to: "2022-01-01T01:00:00.000Z",
      available: false,
    },
    {
      from: "2022-01-01T01:00:00.000Z",
      to: "2022-01-01T02:00:00.000Z",
      available: true,
    },
    {
      from: "2022-01-01T02:00:00.000Z",
      to: "2022-01-01T03:00:00.000Z",
      available: false,
    },
  ]);
});

test("Available and unavailable without from and to", async () => {
  // true, false
  const { allSlots } = getSlots({
    availability: [
      {
        from: dateTimeRef.plus({ hour: 1 }).toISO(),
        to: dateTimeRef.plus({ hour: 2 }).toISO(),
      },
    ],
    unavailability: [
      {
        from: dateTimeRef.plus({ hour: 2 }).toISO(),
        to: dateTimeRef.plus({ hour: 3 }).toISO(),
      },
    ],
    duration: 60,
  });

  expect(allSlots).toEqual([
    {
      from: "2022-01-01T01:00:00.000Z",
      to: "2022-01-01T02:00:00.000Z",
      available: true,
    },
    {
      from: "2022-01-01T02:00:00.000Z",
      to: "2022-01-01T03:00:00.000Z",
      available: false,
    },
  ]);
});

test("Some time between unavailable and available slot", async () => {
  // false, true, false
  const { allSlots } = getSlots({
    from: dateTimeRef.toISO(),
    to: dateTimeRef.plus({ hour: 3, minute: 30 }).toISO(),
    availability: [
      {
        from: dateTimeRef.plus({ hour: 1, minute: 30 }).toISO(),
        to: dateTimeRef.plus({ hour: 2, minute: 30 }).toISO(),
      },
    ],
    duration: 60,
  });
  expect(allSlots).toEqual([
    {
      from: "2022-01-01T00:00:00.000Z",
      to: "2022-01-01T01:00:00.000Z",
      available: false,
    },
    {
      from: "2022-01-01T01:30:00.000Z",
      to: "2022-01-01T02:30:00.000Z",
      available: true,
    },
    {
      from: "2022-01-01T02:30:00.000Z",
      to: "2022-01-01T03:30:00.000Z",
      available: false,
    },
  ]);
});

test("Show unavailable slot when there if there are available minutes but it won't lead to a full slot", async () => {
  // false, false
  const { allSlots } = getSlots({
    from: dateTimeRef.toISO(),
    to: dateTimeRef.plus({ hour: 2, minute: 30 }).toISO(),
    availability: [
      {
        from: dateTimeRef.plus({ hour: 1, minute: 30 }).toISO(),
        to: dateTimeRef.plus({ hour: 2 }).toISO(),
      },
    ],
    duration: 60,
  });

  expect(allSlots).toEqual([
    {
      from: "2022-01-01T00:00:00.000Z",
      to: "2022-01-01T01:00:00.000Z",
      available: false,
    },
    {
      from: "2022-01-01T01:00:00.000Z",
      to: "2022-01-01T02:00:00.000Z",
      available: false,
    },
  ]);
});

test("User availabilities", () => {
  // true + Alice, true + Bob
  const { allSlots } = getSlots({
    from: dateTimeRef.toISO(),
    to: dateTimeRef.plus({ hour: 2 }).toISO(),
    availability: [
      {
        day: "Saturday",
        from: "00:00",
        to: "01:00",
        metadata: {
          user: "Alice",
        },
      },
      {
        from: dateTimeRef.plus({ hour: 1 }).toISO(),
        to: dateTimeRef.plus({ hour: 2 }).toISO(),
        metadata: {
          user: "Bob",
        },
      },
    ],
    duration: 60,
  });

  expect(allSlots).toEqual([
    {
      from: "2022-01-01T00:00:00.000Z",
      to: "2022-01-01T01:00:00.000Z",
      available: true,
      metadataAvailable: [{ user: "Alice" }],
    },
    {
      from: "2022-01-01T01:00:00.000Z",
      to: "2022-01-01T02:00:00.000Z",
      available: true,
      metadataAvailable: [{ user: "Bob" }],
    },
  ]);
});

test("User availabilities and unavailabilities", () => {
  // true + Alice, false + Alice
  const { allSlots } = getSlots({
    from: dateTimeRef.toISO(),
    to: dateTimeRef.plus({ hour: 2 }).toISO(),
    availability: [
      {
        from: dateTimeRef.toISO(),
        to: dateTimeRef.plus({ hour: 2 }).toISO(),
        metadata: {
          user: "Alice",
        },
      },
    ],
    unavailability: [
      {
        from: dateTimeRef.plus({ hour: 1 }).toISO(),
        to: dateTimeRef.plus({ hour: 2 }).toISO(),
        metadata: {
          user: "Alice",
        },
      },
    ],
    duration: 60,
  });

  expect(allSlots).toEqual([
    {
      from: "2022-01-01T00:00:00.000Z",
      to: "2022-01-01T01:00:00.000Z",
      available: true,
      metadataAvailable: [{ user: "Alice" }],
    },
    {
      from: "2022-01-01T01:00:00.000Z",
      to: "2022-01-01T02:00:00.000Z",
      available: false,
      metadataUnavailable: [{ user: "Alice" }],
    },
  ]);
});

test("With timezones", () => {
  // true + offset 1, false + offset 1
  const { allSlots } = getSlots({
    from: dateTimeRef.toISO(),
    to: dateTimeRef.plus({ hour: 2 }).toISO(),
    outputTimezone: "Europe/Paris",
    availability: [
      {
        day: "Saturday",
        from: "01:00",
        to: "02:00",
        timezone: "Europe/Paris",
      },
    ],
    duration: 60,
  });

  expect(allSlots).toEqual([
    {
      from: "2022-01-01T01:00:00.000+01:00",
      to: "2022-01-01T02:00:00.000+01:00",
      available: true,
    },
    {
      from: "2022-01-01T02:00:00.000+01:00",
      to: "2022-01-01T03:00:00.000+01:00",
      available: false,
    },
  ]);
});

test("Day slot does not fall within bounds", () => {
  // false, false
  const { allSlots } = getSlots({
    from: dateTimeRef.toISO(),
    to: dateTimeRef.plus({ hour: 2 }).toISO(),
    availability: [
      {
        day: "Saturday",
        from: "16:00",
        to: "17:00",
        timezone: "America/Los_Angeles",
      },
    ],
    duration: 60,
  });

  expect(allSlots).toEqual([
    {
      from: "2022-01-01T00:00:00.000Z",
      to: "2022-01-01T01:00:00.000Z",
      available: false,
    },
    {
      from: "2022-01-01T01:00:00.000Z",
      to: "2022-01-01T02:00:00.000Z",
      available: false,
    },
  ]);
});

test("Bounds and day slot aren't the same timezone, so days of the week differ", () => {
  // true, false
  const { allSlots } = getSlots({
    from: dateTimeRef.toISO(),
    to: dateTimeRef.plus({ hour: 2 }).toISO(),
    availability: [
      {
        day: "Friday",
        from: "16:00",
        to: "17:00",
        timezone: "America/Los_Angeles",
      },
    ],
    duration: 60,
  });

  expect(allSlots).toEqual([
    {
      from: "2022-01-01T00:00:00.000Z",
      to: "2022-01-01T01:00:00.000Z",
      available: true,
    },
    {
      from: "2022-01-01T01:00:00.000Z",
      to: "2022-01-01T02:00:00.000Z",
      available: false,
    },
  ]);
});

test("Day slot across Daylight savings time", () => {
  const { allSlots } = getSlots({
    from: DateTime.fromObject({ year: 2024, month: 3, day: 10, hour: 1 }, { zone: "America/Los_Angeles" }).toISO(),
    to: DateTime.fromObject({ year: 2024, month: 3, day: 10, hour: 7 }, { zone: "America/Los_Angeles" }).toISO(),
    availability: [
      {
        day: "Sunday",
        from: "05:00",
        to: "06:00",
        timezone: "America/Los_Angeles",
      },
    ],
    duration: 60,
  });

  expect(allSlots).toEqual([
    // PST is -8
    {
      from: DateTime.fromISO("2024-03-10T01:00:00.000-08:00").toUTC().toISO(),
      to: DateTime.fromISO("2024-03-10T02:00:00.000-08:00").toUTC().toISO(),
      available: false,
    },
    // The 2-3 slot doesn't exist

    // PDT is -7
    {
      from: DateTime.fromISO("2024-03-10T03:00:00.000-07:00").toUTC().toISO(),
      to: DateTime.fromISO("2024-03-10T04:00:00.000-07:00").toUTC().toISO(),
      available: false,
    },
    {
      from: DateTime.fromISO("2024-03-10T04:00:00.000-07:00").toUTC().toISO(),
      to: DateTime.fromISO("2024-03-10T05:00:00.000-07:00").toUTC().toISO(),
      available: false,
    },
    {
      from: DateTime.fromISO("2024-03-10T05:00:00.000-07:00").toUTC().toISO(),
      to: DateTime.fromISO("2024-03-10T06:00:00.000-07:00").toUTC().toISO(),
      available: true,
    },
    {
      from: DateTime.fromISO("2024-03-10T06:00:00.000-07:00").toUTC().toISO(),
      to: DateTime.fromISO("2024-03-10T07:00:00.000-07:00").toUTC().toISO(),
      available: false,
    },
  ]);
});

test("Helper variables", async () => {
  // false, true
  const {
    allSlots,
    availableSlots,
    allDates,
    availableDates,
    allSlotsByDay,
    availableSlotsByDay,
  } = getSlots({
    from: dateTimeRef.minus({ hour: 1 }).toISO(),
    to: dateTimeRef.plus({ hour: 1 }).toISO(),
    availability: [
      {
        from: dateTimeRef.toISO(),
        to: dateTimeRef.plus({ hour: 1 }).toISO(),
      },
    ],
    duration: 60,
  });

  expect(allSlots).toEqual([
    {
      from: "2021-12-31T23:00:00.000Z",
      to: "2022-01-01T00:00:00.000Z",
      available: false,
    },
    {
      from: "2022-01-01T00:00:00.000Z",
      to: "2022-01-01T01:00:00.000Z",
      available: true,
    },
  ]);
  expect(availableSlots).toEqual([
    {
      from: "2022-01-01T00:00:00.000Z",
      to: "2022-01-01T01:00:00.000Z",
      available: true,
    },
  ]);
  expect(allDates).toEqual(["2021-12-31", "2022-01-01"]);
  expect(availableDates).toEqual(["2022-01-01"]);
  expect(allSlotsByDay).toEqual({
    "2021-12-31": [
      {
        from: "2021-12-31T23:00:00.000Z",
        to: "2022-01-01T00:00:00.000Z",
        available: false,
      },
    ],
    "2022-01-01": [
      {
        from: "2022-01-01T00:00:00.000Z",
        to: "2022-01-01T01:00:00.000Z",
        available: true,
      },
    ],
  });
  expect(availableSlotsByDay).toEqual({
    "2022-01-01": [
      {
        from: "2022-01-01T00:00:00.000Z",
        to: "2022-01-01T01:00:00.000Z",
        available: true,
      },
    ],
  });
});

test("Weekdays are in a specified locale", () => {
  // true false
  const { allSlots } = getSlots({
    from: dateTimeRef.plus({ hour: 3 }).toISO(),
    to: dateTimeRef.plus({ hour: 5 }).toISO(),
    outputTimezone: "America/Sao_Paulo",
    duration: 60,
    availability: [
      {
        day: {
          text: "sábado",
          locale: "pt-br",
        },
        from: "00:00",
        to: "01:00",
        timezone: "America/Sao_Paulo",
      },
    ],
  });

  expect(allSlots).toEqual([
    {
      from: "2022-01-01T00:00:00.000-03:00",
      to: "2022-01-01T01:00:00.000-03:00",
      available: true,
    },
    {
      from: "2022-01-01T01:00:00.000-03:00",
      to: "2022-01-01T02:00:00.000-03:00",
      available: false,
    },
  ]);
});

test("Availability bounds include from and to", () => {
  // true false
  const { allSlots } = getSlots({
    from: dateTimeRef.plus({ hour: 8 }).toISO(),
    to: dateTimeRef.plus({ hour: 10 }).toISO(),
    duration: 60,
    availability: [
      {
        from: dateTimeRef.toISO(),
        to: dateTimeRef.plus({ hour: 23 }).toISO(),
      },
    ],
  });

  expect(allSlots).toEqual([
    {
      from: "2022-01-01T08:00:00.000Z",
      to: "2022-01-01T09:00:00.000Z",
      available: true,
    },
    {
      from: "2022-01-01T09:00:00.000Z",
      to: "2022-01-01T10:00:00.000Z",
      available: true,
    },
  ]);
});
