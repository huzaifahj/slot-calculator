# Slot Calculator <!-- omit in toc --> 

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/huzaifahj/slot-calculator/Run%20unit%20tests?label=tests) [![npm](https://img.shields.io/npm/dm/slot-calculator)](https://www.npmjs.com/package/slot-calculator)

Calculate time slots for your users to choose from.

- Intersect availabilities of multiple users/resources.
- Full timezone support.
- Blazing fast (usage of ES6 Sets, Maps and efficient data structures).
- Works great with [Luxon](https://www.npmjs.com/package/luxon) and [V-Calendar](https://vcalendar.io/).

## Table of contents <!-- omit in toc --> 

- [Documentation](#documentation)
- [Usage](#usage)
  - [Setup](#setup)
  - [Returned values](#returned-values)
- [Examples](#examples)
  - [Basic usage](#basic-usage)
  - [With availabilities and unavailabilities](#with-availabilities-and-unavailabilities)
  - [With multiple users](#with-multiple-users)
  - [With timezones](#with-timezones)


## Documentation

[View the JS/TS reference](https://huzaifahj.github.io/slot-calculator)

TypeScript language support in your IDE is sufficient to make use of this package's types and annotations.

## Usage

### Setup

```shell
npm install slot-calculator
```
```ts
import { getSlots } from "slot-calculator"

const { allSlots } = getSlots({
  from: "2022-01-01",
  to: "2022-01-02",
  duration: 60,
})
```

### Returned values

- `allSlots`: An array of all generated slots. Only use this as a starting point for manipulating the output.
- `availableSlots`: An array of available slots. Only use this as a starting point for manipulating the output.
- `allDates`: An array of dates, including unavailable ones, between the from and to configuration variables. Use this to allow users to specify their own datetime, but within your chosen bounds.
- `availableDates`: An array of available dates. Use this to mark on a calendar which dates can be selected.
- `allSlotsByDay`: Once a user has selected a date, use this object to easily find all the slots for that day.
- `availableSlotsByDay`: Once a user has selected a date, use this object to easily find the available slots for that day.
- `timeTaken`: Worried that the number crunching is slowing down your app? Monitor this variable to see the time taken by slot calculator.

## Examples

For these examples to work, use this setup code:

```ts
import { DateTime, Settings } from "luxon";

Settings.defaultZone = "UTC";
const dateTimeRef = DateTime.utc(2022, 1, 1);
```

### Basic usage

```ts
getSlots({
  from: dateTimeRef.toISO(),
  to: dateTimeRef.plus({ hour: 2 }).toISO(),
  duration: 60,
});
```

### With availabilities and unavailabilities

```ts
getSlots({
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
```

### With multiple users

```ts
getSlots({
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
```

### With timezones

```ts
getSlots({
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
```