# Slot Calculator <!-- omit in toc --> 

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/huzaifahj/slot-calculator/Run%20unit%20tests?label=tests) [![npm](https://img.shields.io/npm/dm/slot-calculator)](https://www.npmjs.com/package/slot-calculator)

Calculate time slots for your users to choose from.

- Intersect availabilities of multiple users/resources.
- Full timezone support.
- Blazing fast (usage of ES6 Sets, Maps and efficient data structures).
- Works great with [Luxon](https://www.npmjs.com/package/luxon) and [V-Calendar](https://vcalendar.io/).

## Table of contents <!-- omit in toc --> 

- [Installation](#installation)
- [Documentation](#documentation)
- [Examples](#examples)
  - [Basic usage](#basic-usage)
  - [With user availabilities](#with-user-availabilities)
  - [With timezones](#with-timezones)
  - [Helper variables](#helper-variables)

## Installation

```shell
npm install slot-calculator
```

## Documentation

[View the JS/TS reference](https://huzaifahj.github.io/slot-calculator)

TypeScript language support in your IDE is sufficient to make use of this package's types and annotations.

## Examples

```ts
import { getSlots } from "slot-calculator"
```

### Basic usage

```ts
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
})
```

### With user availabilities

```ts
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
})
```

### With timezones

```ts
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
```

### Helper variables

```ts
const { slots, allDates, availableDates, slotsByDay, timeTaken } = getSlots(config)
```

- `slots`: An array of available slots. Only use this as a starting point for manipulating the output.
- `allDates`: An array of dates, including unavailable ones, between the `from` and `to` configuration variables. Use this to allow users to specify their own datetime, but within your chosen bounds.
- `availableDates`: An array of available dates. Use this to mark on a calendar which dates can be selected.
- `slotsByDay`: Once a user has selected a date, use this object to easily find the slots for that day.
- `timeTaken`: Worried that the number crunching is slowing down your app? Monitor this variable to see the time taken by slot calculator.