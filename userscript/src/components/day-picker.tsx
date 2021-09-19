import React from "react";
import { useStoreActions, useStoreState } from "../store/hooks";

function getWeekday(dateStr: string) {
    // We need to append the `T00:00`, otherwise the date gets set in the UTC
    // timezone and won't return the correct weekday.
    let date = new Date(`${dateStr}T00:00`);
    if (!Number.isNaN(date.getDate())) {
        return date.toLocaleDateString("en-CA", { weekday: "long" });
    }
    date = new Date(`${dateStr}`);
    if (!Number.isNaN(date.getDate())) {
        return date.toLocaleDateString("en-CA", { weekday: "long" });
    }
    return null;
}

export function DayPicker() {
    const activeDate = useStoreState((state) => state.activeDate);
    const setActiveDate = useStoreActions((state) => state.setActiveDate);
    const weekDay = getWeekday(activeDate || "");
    return (
        <div>
            View room bookings for
            {weekDay && <b className="text-primary"> {weekDay}</b>}{" "}
            <input
                type="date"
                value={activeDate || new Date().toLocaleDateString("en-CA")}
                onChange={(e) => setActiveDate(e.target.value)}
            />
        </div>
    );
}
