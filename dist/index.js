import { DateTime } from "luxon";
export function getSlots(config) {
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
    const allDates = [];
    let datesByDay = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: [],
    };
    for (let i = from; i.valueOf() <= to.valueOf(); i = i.plus({ days: 1 })) {
        datesByDay[i.weekdayLong].push(i.toISODate());
        allDates.push(i.toISODate());
    }
    // Get map of available minutes
    const availableMinutes = new Map();
    const processInputSlots = (slots, action) => {
        for (const slot of slots) {
            // Allow for weekdays
            if ("day" in slot) {
                const generatedSlots = datesByDay[slot.day].map((date) => {
                    const obj = {
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
            if (slotFromUnix > slotToUnix)
                continue;
            // Check if slot bounds are within config bounds
            if (slotFromUnix >= fromUnix && toUnix >= slotToUnix) {
                // OK
            }
            else {
                continue;
            }
            // Set or delete availability for each minute
            for (let i = slotFromUnix; i < slotToUnix; i += 60000) {
                if (action === "set") {
                    const mapValue = availableMinutes.get(i);
                    if (mapValue && slot.metadata) {
                        mapValue.push(slot.metadata);
                    }
                    else {
                        availableMinutes.set(i, slot.metadata ? [slot.metadata] : undefined);
                    }
                }
                else {
                    availableMinutes.delete(i);
                }
            }
        }
    };
    processInputSlots(config.availability, "set");
    if (config.unavailability)
        processInputSlots(config.unavailability, "delete");
    // Pointer start from first available minute and detects free slots
    const slots = [];
    const minMinute = Math.min(...availableMinutes.keys());
    const maxMinute = Math.max(...availableMinutes.keys());
    const slotsByDay = {};
    const availableDatesSet = new Set();
    for (let slotFrom = minMinute; slotFrom <= maxMinute; slotFrom += 60000) {
        let allMinutesAvailable = true;
        const slotTo = slotFrom + config.duration * 60000;
        const metadataAvailable = new Set();
        for (const metadata of availableMinutes.get(slotFrom) ?? []) {
            if (metadata)
                metadataAvailable.add(JSON.stringify(metadata));
        }
        for (let slotMinute = slotFrom; slotMinute <= slotTo - 60000; slotMinute += 60000) {
            if (!availableMinutes.has(slotMinute)) {
                allMinutesAvailable = false;
                break;
            }
            for (const metadata of metadataAvailable) {
                if (!availableMinutes
                    .get(slotMinute)
                    ?.map((value) => JSON.stringify(value))
                    .find((value) => value === metadata))
                    metadataAvailable.delete(metadata);
            }
        }
        if (allMinutesAvailable) {
            const from = DateTime.fromMillis(slotFrom).setZone(config.outputTimezone);
            const to = DateTime.fromMillis(slotTo).setZone(config.outputTimezone);
            const metadata = [...metadataAvailable].map((value) => JSON.parse(value));
            const date = from.toISODate();
            // Add to slots
            const slot = {
                from: from.toISO(),
                to: to.toISO(),
            };
            if (metadata.length)
                slot.metadata = metadata;
            slots.push(slot);
            // Add to slots by day
            if (!slotsByDay[date])
                slotsByDay[date] = [];
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
