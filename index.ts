import { DateTime } from "luxon";

export interface Slot {
  /**
   * ISO string
   */
  from: string;
  /**
   * ISO string
   */
  to: string;
  /**
   * Any other metadata
   */
  metadata?: Record<any, any>;
}

export type Day =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface DaySlot extends Slot {
  /**
   * Day of the week (e.g. Monday)
   */
  day: Day;
  /**
   * Time in 24 hour format (e.g. 14:30)
   */
  from: string;
  /**
   * Time in 24 hour format (e.g. 17:45)
   */
  to: string;
  /**
   * IANA zone (e.g. "America/New_York"). Will be used if input datetimes have no offset in the ISO string. Takes precedence over `inputTimezone`
   */
  timezone?: string;
}

export interface GetSlots {
  /**
   * An array of available slots. Only use this as a starting point for manipulating the output.
   */
  slots: Slot[];
  /**
   * An array of dates, including unavailable ones, between the from and to configuration variables. Use this to allow users to specify their own datetime, but within your chosen bounds.
   */
  allDates: string[];
  /**
   * An array of available dates. Use this to mark on a calendar which dates can be selected.
   */
  availableDates: string[];
  /**
   * Once a user has selected a date, use this object to easily find the slots for that day.
   */
  slotsByDay: Record<string, Slot[]>;
  /**
   * Worried that the number crunching is slowing down your app? Monitor this variable to see the time taken by slot calculator.
   */
  timeTaken: string;
}

export function getSlots(config: {
  /**
   * ISO string. Input slots outside of this will be ignored.
   */
  from: string;
  /**
   * ISO string. Input slots outside of this will be ignored.
   */
  to: string;
  /**
   * List of available input slots.
   */
  availability: Array<DaySlot | Slot>;
  /**
   * List of unavailable input slots.
   */
  unavailability?: Array<DaySlot | Slot>;
  /**
   * Duration of each output slot in minutes.
   */
  duration: number;
  /**
   * IANA zone (e.g. "Europe/London"). Will be used if input datetimes have no offset in the ISO string. Defaults to local.
   */
  inputTimezone?: string;
  /**
   * IANA zone (e.g. "Europe/Paris"). Defaults to local.
   */
  outputTimezone?: string;
}): GetSlots {
  const functionStart = performance.now();

  // Get bounds as unix time
  const from = DateTime.fromISO(config.from, {
    zone: config.inputTimezone,
  });
  const fromUnix = from.valueOf();
  const to = DateTime.fromISO(config.to, {
    zone: config.inputTimezone,
  });
  const toUnix = to.valueOf();

  // Get dates for each day within bounds
  const allDates: string[] = [];
  let datesByDay: Record<Day, string[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };
  for (let i = from; i.valueOf() <= to.valueOf(); i = i.plus({ days: 1 })) {
    datesByDay[i.weekdayLong as Day].push(i.toISODate());
    allDates.push(i.toISODate());
  }

  // Get map of available minutes
  const availableMinutes: Map<number, Slot["metadata"][] | undefined> =
    new Map();
  const processInputSlots = (
    slots: typeof config.availability,
    action: "set" | "delete"
  ) => {
    for (const slot of slots) {
      // Allow for weekdays
      if ("day" in slot) {
        const generatedSlots = datesByDay[slot.day].map((date) => {
          const obj: Slot = {
            from: DateTime.fromISO(date, {
              zone: slot.timezone ?? config.inputTimezone,
            })
              .plus({
                hours: Number(slot.from.split(":")[0]),
                minutes: Number(slot.from.split(":")[1]),
              })
              .toISO(),
            to: DateTime.fromISO(date, {
              zone: slot.timezone ?? config.inputTimezone,
            })
              .plus({
                hours: Number(slot.to.split(":")[0]),
                minutes: Number(slot.to.split(":")[1]),
              })
              .toISO(),
            metadata: slot.metadata,
          };
          return obj;
        });
        processInputSlots(generatedSlots, action);
        continue;
      }

      // Get unix times
      const slotFromUnix = DateTime.fromISO(slot.from, {
        zone: config.inputTimezone,
      })
        .set({ second: 0, millisecond: 0 })
        .valueOf();
      const slotToUnix = DateTime.fromISO(slot.to, {
        zone: config.inputTimezone,
      })
        .set({ second: 0, millisecond: 0 })
        .valueOf();

      // If from is after to, return
      if (slotFromUnix > slotToUnix) continue;

      // Check if slot bounds are within config bounds
      if (slotFromUnix >= fromUnix && toUnix >= slotToUnix) {
        // OK
      } else {
        continue;
      }

      // Set or delete availability for each minute
      for (let i = slotFromUnix; i < slotToUnix; i += 60000) {
        if (action === "set") {
          const mapValue = availableMinutes.get(i);
          if (mapValue && slot.metadata) {
            mapValue.push(slot.metadata);
          } else {
            availableMinutes.set(
              i,
              slot.metadata ? [slot.metadata] : undefined
            );
          }
        } else {
          availableMinutes.delete(i);
        }
      }
    }
  };
  processInputSlots(config.availability, "set");
  if (config.unavailability) processInputSlots(config.unavailability, "delete");

  // Pointer start from first available minute and detects free slots
  const slots: Slot[] = [];
  const minMinute = Math.min(...availableMinutes.keys());
  const maxMinute = Math.max(...availableMinutes.keys());
  const slotsByDay: Record<string, Slot[]> = {};
  const availableDatesSet: Set<string> = new Set();

  for (let slotFrom = minMinute; slotFrom <= maxMinute; slotFrom += 60000) {
    let allMinutesAvailable = true;
    const slotTo = slotFrom + config.duration * 60000;
    const metadataAvailable: Set<string> = new Set();
    for (const metadata of availableMinutes.get(slotFrom) ?? []) {
      if (metadata) metadataAvailable.add(JSON.stringify(metadata));
    }
    for (
      let slotMinute = slotFrom;
      slotMinute <= slotTo - 60000;
      slotMinute += 60000
    ) {
      if (!availableMinutes.has(slotMinute)) {
        allMinutesAvailable = false;
        break;
      }

      for (const metadata of metadataAvailable) {
        if (
          !availableMinutes
            .get(slotMinute)
            ?.map((value) => JSON.stringify(value))
            .find((value) => value === metadata)
        )
          metadataAvailable.delete(metadata);
      }
    }
    if (allMinutesAvailable) {
      const from = DateTime.fromMillis(slotFrom).setZone(config.outputTimezone);
      const to = DateTime.fromMillis(slotTo).setZone(config.outputTimezone);
      const metadata = [...metadataAvailable].map((value) => JSON.parse(value));
      const date = from.toISODate();

      // Add to slots
      const slot: Slot = {
        from: from.toISO(),
        to: to.toISO(),
      };
      if (metadata.length) slot.metadata = metadata;
      slots.push(slot);

      // Add to slots by day
      if (!slotsByDay[date]) slotsByDay[date] = [];
      slotsByDay[date].push(slot);

      // Add to available dates
      availableDatesSet.add(date);

      slotFrom = slotTo - 60000;
    }
  }
  const availableDates = [...availableDatesSet];
  const timeTaken = Math.round(performance.now() - functionStart) + "ms";
  return {
    slots,
    allDates,
    availableDates,
    slotsByDay,
    timeTaken,
  };
}

export default { getSlots };

// @todo timezone support for DaySlot
