import { DateTime } from "luxon";
import equal from "fast-deep-equal/es6";

export type Day =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type InputSlot = (
  | {
      /**
       * Day of the week (e.g. Monday).
       */
      day: Day;
      /**
       * Time in 24 hour format (e.g. 14:30).
       */
      from: string;
      /**
       * Time in 24 hour format (e.g. 17:45).
       */
      to: string;
      /**
       * IANA zone (e.g. "America/New_York"). Defaults to local.
       */
      timezone?: string;
    }
  | {
      /**
       * ISO string.
       */
      from: string;
      /**
       * ISO string.
       */
      to: string;
    }
) & {
  /**
   * Any other metadata.
   */
  metadata?: Record<any, any>;
};

export interface OutputSlot {
  /**
   * ISO string.
   */
  from: string;
  /**
   * ISO string.
   */
  to: string;
  /**
   * Is this slot available?
   */
  available: boolean;
  /**
   * Array of metadata which is available for this slot.
   */
  metadataAvailable?: Record<any, any>[];
  /**
   * Array of metadata which is unavailable for this slot.
   */
  metadataUnavailable?: Record<any, any>[];
}

export interface GetSlots {
  /**
   * An array of all generated slots. Only use this as a starting point for manipulating the output.
   */
  allSlots: OutputSlot[];
  /**
   * An array of available slots. Only use this as a starting point for manipulating the output.
   */
  availableSlots: OutputSlot[];
  /**
   * An array of dates, including unavailable ones, between the from and to configuration variables. Use this to allow users to specify their own datetime, but within your chosen bounds.
   */
  allDates: string[];
  /**
   * An array of available dates. Use this to mark on a calendar which dates can be selected.
   */
  availableDates: string[];
  /**
   * Once a user has selected a date, use this object to easily find all the slots for that day.
   */
  allSlotsByDay: Record<string, OutputSlot[]>;
  /**
   * Once a user has selected a date, use this object to easily find the available slots for that day.
   */
  availableSlotsByDay: Record<string, OutputSlot[]>;
  /**
   * Worried that the number crunching is slowing down your app? Monitor this variable to see the time taken by slot calculator.
   */
  timeTaken: string;
}

export function getSlots(config: {
  /**
   * ISO string. Input slots outside of this will be ignored.
   */
  from?: string;
  /**
   * ISO string. Input slots outside of this will be ignored.
   */
  to?: string;
  /**
   * List of available input slots.
   */
  availability?: InputSlot[];
  /**
   * List of unavailable input slots.
   */
  unavailability?: InputSlot[];
  /**
   * Duration of each output slot in minutes.
   */
  duration: number;
  /**
   * IANA zone (e.g. "Europe/Paris"). Defaults to local.
   */
  outputTimezone?: string;
  /**
   * If `true`, all times within bounds are available by default. Defaults to `true` if `availability` is not set. Defaults to `false` otherwise.
   */
  defaultAvailable?: boolean;
}) {
  const functionStart = performance.now();
  let warnDaySlotNotProcessed = false;
  if (
    !config.availability &&
    (config.defaultAvailable === null || config.defaultAvailable === undefined)
  )
    config.defaultAvailable = true;

  // Get bounds as unix time
  const from = config.from ? DateTime.fromISO(config.from) : undefined;
  const fromUnix = from?.valueOf();
  const to = config.to ? DateTime.fromISO(config.to) : undefined;
  const toUnix = to?.valueOf();

  // Get dates for each day within bounds
  let datesByWeekdayByTimezone: {
    [timezone: string]: {
      [weekday in Day]?: string[];
    };
  } = {};

  // Get map of available minutes
  const minutes: Map<
    number,
    {
      blankAvailable: boolean;
      blankUnavailable: boolean;
      metadataAvailable: NonNullable<OutputSlot["metadataAvailable"]>;
      metadataUnavailable: NonNullable<OutputSlot["metadataAvailable"]>;
    }
  > = new Map();
  function processInputSlots(
    slots: InputSlot[],
    type: "availability" | "unavailability"
  ) {
    for (const slot of slots) {
      // Allow for weekdays
      if ("day" in slot) {
        if (from && to) {
          // OK
        } else {
          warnDaySlotNotProcessed = true;
          continue;
        }

        const getDatesByDay = (timezone?: string) => {
          if (!timezone) timezone = "local";
          if (datesByWeekdayByTimezone[timezone]) {
            return datesByWeekdayByTimezone[timezone];
          } else {
            for (
              let dateTime = from.setZone(timezone);
              dateTime.valueOf() <= to.setZone(timezone).valueOf();
              dateTime = dateTime.plus({ days: 1 })
            ) {
              const weekday = dateTime.weekdayLong as Day;
              if (!datesByWeekdayByTimezone[timezone])
                datesByWeekdayByTimezone[timezone] = {};
              if (!datesByWeekdayByTimezone[timezone][weekday])
                datesByWeekdayByTimezone[timezone][weekday] = [];
              datesByWeekdayByTimezone[timezone][weekday]!.push(
                dateTime.toISODate()
              );
            }
            return datesByWeekdayByTimezone[timezone];
          }
        };

        const generatedSlots = getDatesByDay(slot.timezone ?? "UTC")[
          slot.day
        ]?.map((date) => {
          const obj: InputSlot = {
            from: DateTime.fromISO(date, {
              zone: slot.timezone,
            })
              .plus({
                hours: Number(slot.from.split(":")[0]),
                minutes: Number(slot.from.split(":")[1]),
              })
              .toISO(),
            to: DateTime.fromISO(date, {
              zone: slot.timezone,
            })
              .plus({
                hours: Number(slot.to.split(":")[0]),
                minutes: Number(slot.to.split(":")[1]),
              })
              .toISO(),
            metadata: slot.metadata,
            timezone: slot.timezone,
          };
          return obj;
        });
        if (generatedSlots) processInputSlots(generatedSlots, type);
        continue;
      }

      // Get unix times
      const slotFromUnix = DateTime.fromISO(slot.from)
        .set({ second: 0, millisecond: 0 })
        .valueOf();
      const slotToUnix = DateTime.fromISO(slot.to)
        .set({ second: 0, millisecond: 0 })
        .valueOf();

      // If from is after to, go to next slot
      if (slotFromUnix > slotToUnix) continue;

      // Check if slot bounds are within config bounds
      if (fromUnix && slotFromUnix < fromUnix) continue;
      if (toUnix && slotToUnix > toUnix) continue;

      // Set or delete availability for each minute
      for (let i = slotFromUnix; i < slotToUnix; i += 60000) {
        let mapValue = minutes.get(i) ?? {
          blankAvailable: false,
          blankUnavailable: false,
          metadataAvailable: [],
          metadataUnavailable: [],
        };
        if (type === "availability") {
          if (slot.metadata) {
            if (
              !mapValue.metadataAvailable.find((metadata) =>
                equal(metadata, slot.metadata)
              )
            ) {
              // Add to array if metadata not already in it
              mapValue.metadataAvailable.push(slot.metadata);
            }
          } else {
            mapValue.blankAvailable = true;
          }
        } else if (type === "unavailability") {
          if (slot.metadata) {
            let metadataAvailableIndex = mapValue.metadataAvailable.findIndex(
              (metadata) => equal(metadata, slot.metadata)
            );
            if (metadataAvailableIndex !== -1) {
              // Delete from available array if metadata found in it
              mapValue.metadataAvailable.splice(metadataAvailableIndex, 1);
            }

            if (
              !mapValue.metadataUnavailable.find((metadata) =>
                equal(metadata, slot.metadata)
              )
            ) {
              // Add to array if metadata not already in it
              mapValue.metadataUnavailable.push(slot.metadata);
            }
          } else {
            mapValue.blankUnavailable = true;
          }
        }
        minutes.set(i, mapValue);
      }
    }
  }

  if (config.availability) {
    processInputSlots(config.availability, "availability");
  }
  if (config.unavailability) {
    processInputSlots(config.unavailability, "unavailability");
  }

  // Pointer start from first available minute and detects free slots
  const allSlots: OutputSlot[] = [];
  const availableSlots: OutputSlot[] = [];
  const allSlotsByDay: Record<string, OutputSlot[]> = {};
  const availableSlotsByDay: Record<string, OutputSlot[]> = {};
  const allDatesSet: Set<string> = new Set();
  const availableDatesSet: Set<string> = new Set();

  let pointerStart: number;
  let pointerEnd: number;
  if (fromUnix && toUnix) {
    pointerStart = fromUnix;
    pointerEnd = toUnix;
  } else {
    pointerStart = Math.min(...minutes.keys());
    pointerEnd = Math.max(...minutes.keys()) + 60000;
  }

  for (let pointer = pointerStart; pointer <= pointerEnd; ) {
    const to = pointer + config.duration * 60000;
    if (to > pointerEnd) {
      break;
    }

    const canWeGetFullSlotFromHere = (from: number) => {
      const minutesBasicAvailable: number[] = [];
      const minutesBasicUnavailable: number[] = [];
      const metadataAvailable = minutes.get(from)?.metadataAvailable ?? [];
      const metadataUnavailable = minutes.get(from)?.metadataUnavailable ?? [];
      for (
        let slotMinute = from;
        slotMinute <= from + config.duration * 60000 - 60000;
        slotMinute += 60000
      ) {
        let minuteAvailable: boolean = false;
        const minute = minutes.get(slotMinute);
        if (minute) {
          if (minute.blankAvailable && !minute.blankUnavailable) {
            minuteAvailable = true;
          }
          for (const [index, metadata] of metadataAvailable.entries()) {
            if (!minute.metadataAvailable.find((obj) => equal(obj, metadata))) {
              // If there is a metadata in the array but not in this minute, delete it from the array
              metadataAvailable.splice(index, 1);
            }
          }

          for (const metadata of minute.metadataUnavailable ?? []) {
            if (
              !minute.metadataUnavailable.find((obj) => equal(obj, metadata))
            ) {
              // If the array does not have this metadata, add it to the array
              metadataUnavailable.push(metadata);
            }
          }
        } else {
          // Minute does not exist in config availability or unavailability
          if (config.defaultAvailable) {
            minuteAvailable = true;
          }
        }

        // At end of loop
        if (minuteAvailable) {
          minutesBasicAvailable.push(slotMinute);
        } else {
          minutesBasicUnavailable.push(slotMinute);
        }
      }
      return {
        minutesBasicAvailable,
        minutesBasicUnavailable,
        metadataAvailable,
        metadataUnavailable,
      };
    };

    const {
      minutesBasicAvailable,
      minutesBasicUnavailable,
      metadataAvailable,
      metadataUnavailable,
    } = canWeGetFullSlotFromHere(pointer);

    const pushSlot = ({
      from,
      to,
      available,
    }: {
      from: number;
      to: number;
      available: boolean;
    }) => {
      const date = DateTime.fromMillis(from)
        .setZone(config.outputTimezone)
        .toISODate();
      const slot: OutputSlot = {
        from: DateTime.fromMillis(from)
          .setZone(config.outputTimezone ?? "utc")
          .toISO(),
        to: DateTime.fromMillis(to)
          .setZone(config.outputTimezone ?? "utc")
          .toISO(),
        available,
      };
      if (metadataAvailable.length) slot.metadataAvailable = metadataAvailable;
      if (metadataUnavailable.length)
        slot.metadataUnavailable = metadataUnavailable;

      if (available) {
        availableSlots.push(slot);

        // Add to available slots by day
        if (!availableSlotsByDay[date]) availableSlotsByDay[date] = [];
        availableSlotsByDay[date].push(slot);

        // Add to available dates
        availableDatesSet.add(date);
      }

      allSlots.push(slot);

      // Add to all slots by day
      if (!allSlotsByDay[date]) allSlotsByDay[date] = [];
      allSlotsByDay[date].push(slot);

      // Add to all dates
      allDatesSet.add(date);
    };

    if (minutesBasicAvailable.length === config.duration) {
      // console.log("here");
      pushSlot({
        from: pointer,
        to,
        available: true,
      });
      pointer = to;
    } else if (metadataAvailable.length) {
      // console.log("here1");
      pushSlot({
        from: pointer,
        to,
        available: true,
      });
      pointer = to;
    } else if (minutesBasicUnavailable.length === config.duration) {
      // console.log("here2");
      pushSlot({
        from: pointer,
        to,
        available: false,
      });
      pointer = to;
    } else if (minutesBasicAvailable.length) {
      // There are some available minutes we can explore. If not fruitful, mark unavailable
      for (const availableMinute of minutesBasicAvailable) {
        const { minutesBasicAvailable } =
          canWeGetFullSlotFromHere(availableMinute);

        if (minutesBasicAvailable.length === config.duration) {
          const foundSlotTo = availableMinute + config.duration * 60000;
          if (foundSlotTo > pointerEnd) {
            pointer += 60000;
            break;
          }
          // Found an available slot starting from a minute in this pointer range
          // console.log("here3");
          pushSlot({
            from: availableMinute,
            to: foundSlotTo,
            available: true,
          });
          pointer = foundSlotTo;
          break;
        } else {
          // Fallback to pointer range's slot and mark as unavailable
          // console.log("here4");
          pushSlot({
            from: pointer,
            to,
            available: false,
          });
          pointer = to;
          break;
        }
      }
    } else {
      pointer += 60000;
    }
  }

  const allDates = [...allDatesSet];
  const availableDates = [...availableDatesSet];
  const timeTaken = Math.round(performance.now() - functionStart) + "ms";

  if (warnDaySlotNotProcessed)
    console.warn(
      "Day slots (e.g. Monday from 15:00 to 16:00) were not processed as there is no `from` or `to` property in configuration."
    );

  return {
    allSlots,
    availableSlots,
    allDates,
    availableDates,
    allSlotsByDay,
    availableSlotsByDay,
    timeTaken,
  };
}

export default { getSlots };
