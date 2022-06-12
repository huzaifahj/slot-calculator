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
export declare type Day = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
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
export declare function getSlots(config: {
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
}): GetSlots;
declare const _default: {
    getSlots: typeof getSlots;
};
export default _default;
