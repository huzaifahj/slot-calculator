const Moment = require("moment-timezone")

function getSlots({ from, to, availability, unavailability, duration }) {

    duration = parseInt(duration)
    let limitFrom = Moment.utc(from).seconds(0).milliseconds(0)
    let limitTo = Moment.utc(to).seconds(0).milliseconds(0)

    let availabilityByMinute = {}

    // Populate object with minutes which are either available or unavailable

    for (const type of ["availability", "unavailability"]) {
        let array = type === "availability" ? availability : unavailability

        if (!array) continue

        for (const obj of array) {
            const slotFrom = Moment.utc(obj.from)
            const slotTo = Moment.utc(obj.to)

            if (slotFrom.diff(limitFrom) > 0 && limitTo.diff(slotTo) > 0) {
                const minutes1 = slotFrom.diff(limitFrom, "minutes")
                const minutes2 = slotTo.diff(limitFrom, "minutes")

                for (let i = minutes1; i < minutes2; i++) {
                    availabilityByMinute[i] = type === "availability" ? true : false
                }
            }
        }
    }

    // Get only minutes that are available

    let availableMinutes = new Set()

    for (const [key, value] of Object.entries(availabilityByMinute)) {
        if (value) {
            availableMinutes.add(parseInt(key))
        }
    }

    // Pointer start from first available minute and detects free slots

    let availableSlots = []
    const min = Math.min(...Array.from(availableMinutes.values()))
    const max = Math.max(...Array.from(availableMinutes.values()))

    for (let i = min; i <= max; i++) {
        if (availableMinutes.has(i) && availableMinutes.has(i + duration - 1)) {
            availableSlots.push(i)
            i = i + duration - 1
        }
    }

    if (availableSlots.length === 0) return null

    // Normalise slots by day and convert to viewer timezone

    var availableSlotsByDay = {}

    for (const minutes of availableSlots) {
        const finalFrom = Moment.utc(from).add(minutes, "minutes")
        const finalTo = Moment.utc(from).add(minutes + duration, "minutes")

        if (!availableSlotsByDay[finalFrom.format("YYYY-MM-DD")]) {
            availableSlotsByDay[finalFrom.format("YYYY-MM-DD")] = []
        }

        availableSlotsByDay[finalFrom.format("YYYY-MM-DD")].push({
            from: finalFrom.format("HH:mm"),
            to: finalTo.format("HH:mm")
        })
    }

    return availableSlotsByDay

}

function getSlotsMultipleUsers({ from, to, users, duration }) {
    let availableSlotsByUsers = {}

    for (const [user, { availability, unavailability }] of Object.entries(users)) {
        let availableSlots = getSlots({
            from,
            to,
            availability,
            unavailability,
            duration,
        })

        if (!availableSlots) continue

        for (const [day, slots] of Object.entries(availableSlots)) {
            if (!availableSlotsByUsers[day]) availableSlotsByUsers[day] = []
            for (const slot of slots) {
                let index = availableSlotsByUsers[day].findIndex(element => element.from === slot.from && element.to === slot.to)

                if (index === -1) {
                    availableSlotsByUsers[day].push({
                        from: slot.from,
                        to: slot.to,
                        users: [user]
                    })
                } else {
                    let existingSlot = availableSlotsByUsers[day][index]
                    existingSlot.users.push(user)
                    availableSlotsByUsers[day][index] = existingSlot
                }
            }
        }
    }

    return availableSlotsByUsers
}

function convertSlotsToTimezone({ slots, timezone }) {
    let slotsWithTimezone = {}

    for (const [day, slotsArray] of Object.entries(slots)) {
        for (const slot of slotsArray) {
            const dayAdjusted = Moment.utc(`${day} ${slot.from}`).tz(timezone).format("YYYY-MM-DD")
            slot.from = Moment.utc(`${day} ${slot.from}`).tz(timezone).format("HH:mm")
            slot.to = Moment.utc(`${day} ${slot.to}`).tz(timezone).format("HH:mm")

            if (!slotsWithTimezone[dayAdjusted]) slotsWithTimezone[dayAdjusted] = []
            slotsWithTimezone[dayAdjusted].push(slot)
        }
    }

    return slotsWithTimezone
}

function getVersion() {
    const {version} = require('./package.json')
    return version
}

module.exports = {
    getSlots,
    getSlotsMultipleUsers,
    convertSlotsToTimezone,
    getVersion,
}