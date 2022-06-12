import { getSlots } from "./index.js";
import { DateTime } from "luxon";
import { test, expect } from "vitest";

test("getSlots", async () => {
  const { slots } = getSlots({
    from: DateTime.fromObject({
      year: 2022,
    }).toISO(),
    to: DateTime.fromObject({
      year: 2022,
      day: 30,
    }).toISO(),
    availability: [
      {
        from: DateTime.fromObject({
          year: 2022,
        }).toISO(),
        to: DateTime.fromObject({
          year: 2022,
          hour: 3,
        }).toISO(),
        metadata: {
          user: "Alice",
        },
      },
      {
        from: DateTime.fromObject({
          year: 2022,
          hour: 5,
        }).toISO(),
        to: DateTime.fromObject({
          year: 2022,
          hour: 6,
        }).toISO(),
      },
      {
        day: "Thursday",
        from: "15:00",
        to: "16:00",
      },
    ],
    unavailability: [
      {
        from: DateTime.fromObject({
          year: 2022,
          hour: 1,
        }).toISO(),
        to: DateTime.fromObject({
          year: 2022,
          hour: 2,
        }).toISO(),
      },
    ],
    duration: 45,
  });

  expect(slots).toEqual([
    {
      from: "2022-01-01T00:00:00.000+00:00",
      to: "2022-01-01T00:45:00.000+00:00",
      metadata: [{ user: "Alice" }],
    },
    {
      from: "2022-01-01T02:00:00.000+00:00",
      to: "2022-01-01T02:45:00.000+00:00",
      metadata: [{ user: "Alice" }],
    },
    {
      from: "2022-01-01T05:00:00.000+00:00",
      to: "2022-01-01T05:45:00.000+00:00",
    },
    {
      from: "2022-01-06T15:00:00.000+00:00",
      to: "2022-01-06T15:45:00.000+00:00",
    },
    {
      from: "2022-01-13T15:00:00.000+00:00",
      to: "2022-01-13T15:45:00.000+00:00",
    },
    {
      from: "2022-01-20T15:00:00.000+00:00",
      to: "2022-01-20T15:45:00.000+00:00",
    },
    {
      from: "2022-01-27T15:00:00.000+00:00",
      to: "2022-01-27T15:45:00.000+00:00",
    },
  ]);
});

test("Basic usage", () => {
  const { slots } = getSlots({
    from: DateTime.utc(2022, 1, 1).toISO(),
    to: DateTime.utc(2022, 1, 8).toISO(),
    availability: [
      {
        from: DateTime.utc(2022, 1, 1, 15).toISO(),
        to: DateTime.utc(2022, 1, 1, 16).toISO(),
      },
    ],
    duration: 60,
  });
  // console.log(slots);

  expect(slots).toEqual([
    {
      from: "2022-01-01T15:00:00.000+00:00",
      to: "2022-01-01T16:00:00.000+00:00",
    },
  ]);
});

test("With user availabilities", () => {
  const { slots } = getSlots({
    from: DateTime.utc(2022, 1, 1).toISO(),
    to: DateTime.utc(2022, 1, 8).toISO(),
    availability: [
      {
        day: "Monday",
        from: "14:00",
        to: "16:00",
        metadata: {
          user: "Alice",
        },
      },
      {
        day: "Monday",
        from: "15:00",
        to: "17:00",
        metadata: {
          user: "Bob",
        },
      },
    ],
    duration: 60,
  });

  expect(slots).toEqual([
    {
      from: "2022-01-03T14:00:00.000+00:00",
      to: "2022-01-03T15:00:00.000+00:00",
      metadata: [{ user: "Alice" }],
    },
    {
      from: "2022-01-03T15:00:00.000+00:00",
      to: "2022-01-03T16:00:00.000+00:00",
      metadata: [{ user: "Alice" }, { user: "Bob" }],
    },
    {
      from: "2022-01-03T16:00:00.000+00:00",
      to: "2022-01-03T17:00:00.000+00:00",
      metadata: [{ user: "Bob" }],
    },
  ]);
});

test("With timezones", () => {
  const { slots } = getSlots({
    from: DateTime.utc(2022, 1, 1).toISO(),
    to: DateTime.utc(2022, 1, 8).toISO(),
    outputTimezone: "Europe/Paris",
    availability: [
      {
        day: "Monday",
        from: "14:00",
        to: "16:00",
        timezone: "America/New_York",
      },
    ],
    duration: 60,
  });

  expect(slots).toEqual([
    {
      from: "2022-01-03T20:00:00.000+01:00",
      to: "2022-01-03T21:00:00.000+01:00",
    },
    {
      from: "2022-01-03T21:00:00.000+01:00",
      to: "2022-01-03T22:00:00.000+01:00",
    },
  ]);
});

test("Helper variables", () => {
  const { slots, allDates, availableDates, slotsByDay } = getSlots({
    from: DateTime.utc(2022, 1, 1).toISO(),
    to: DateTime.utc(2022, 1, 8).toISO(),
    availability: [
      {
        day: "Tuesday",
        from: "11:00",
        to: "12:00",
      },
    ],
    duration: 30,
  });

  expect(slots).toEqual([
    {
      from: "2022-01-04T11:00:00.000+00:00",
      to: "2022-01-04T11:30:00.000+00:00",
    },
    {
      from: "2022-01-04T11:30:00.000+00:00",
      to: "2022-01-04T12:00:00.000+00:00",
    },
  ]);
  expect(allDates).toEqual([
    "2022-01-01",
    "2022-01-02",
    "2022-01-03",
    "2022-01-04",
    "2022-01-05",
    "2022-01-06",
    "2022-01-07",
    "2022-01-08",
  ]);
  expect(availableDates).toEqual(["2022-01-04"]);
  expect(slotsByDay).toEqual({
    "2022-01-04": [
      {
        from: "2022-01-04T11:00:00.000+00:00",
        to: "2022-01-04T11:30:00.000+00:00",
      },
      {
        from: "2022-01-04T11:30:00.000+00:00",
        to: "2022-01-04T12:00:00.000+00:00",
      },
    ],
  });
});
