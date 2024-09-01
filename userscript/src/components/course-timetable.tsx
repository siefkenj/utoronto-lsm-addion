import React from "react";
import {
    DayPilotCalendar as _DayPilotCalendar,
    CalendarProps,
    DayPilot,
} from "@daypilot/daypilot-lite-react";
import { log } from "../utils";
import { Course, Section, Time } from "../api/course-info";
import { useStoreState } from "../store/hooks";

const DayPilotCalendar =
    _DayPilotCalendar as any as React.ComponentClass<CalendarProps>;

type EventData = NonNullable<CalendarProps["events"]>[number];

export function CourseTimetable({
    course,
    sessionCode,
    display = "lecture",
}: {
    course: Course;
    sessionCode: string;
    display?: "lecture" | "tutorial";
}) {
    const [events, setEvents] = React.useState<EventData[]>([]);
    const courseRoomBookings = useStoreState(
        (state) => state.courseRoomBookings
    );

    React.useEffect(() => {
        const colorManager = new ColorManager(colors);
        const sections = course.sections.filter((s) =>
            s.cancelInd === "N" && display === "lecture"
                ? s.type === "Lecture"
                : s.type === "Tutorial"
        );
        let events: EventData[] = sections.flatMap((s, i) =>
            s.meetingTimes
                .filter((t) => sessionCode.startsWith(t.sessionCode))
                .map((t) => {
                    // Attempt to get the real room number
                    let room = t.building.buildingCode;
                    const courseKey = `${sessionCode}-${course.code}${course.sectionCode}-${s.name}`;
                    if (courseRoomBookings[courseKey]) {
                        const roomBooking = courseRoomBookings[courseKey].find(
                            (b) => b.day === t.start.day
                        );
                        if (roomBooking) {
                            room = roomBooking.room;
                        }
                    }

                    return {
                        id: i,
                        start: meetingTimeToDateString(t.start),
                        end: meetingTimeToDateString(t.end),
                        text: `${s.name} (${room}) ${s.instructors
                            .map((i) => `${i.firstName} ${i.lastName}`)
                            .join(", ")}`,
                        borderColor: "#00000000",
                        html: `<div class="time lecture"><b>${
                            s.name
                        }</b><ul> <li>(${room})</li>${s.instructors.map(
                            (i) => ` <li>${i.firstName} ${i.lastName}</li>`
                        )}</ul></div>`,
                    } satisfies EventData;
                })
        );
        events.sort((a, b) => a.text.localeCompare(b.text));
        events = events.map((e, i) => ({
            ...e,
            id: i,
            backColor: colorManager.getColor(e.text.split(" ")[0] || ""),
        }));

        setEvents(events);
    }, [course, display, sessionCode, courseRoomBookings]);

    return (
        <DayPilotCalendar
            viewType="WorkWeek"
            events={events}
            startDate={new DayPilot.Date("2023-01-02")}
            cellHeight={22}
            eventClickHandling="Disabled"
            eventDeleteHandling="Disabled"
            eventMoveHandling="Disabled"
            eventResizeHandling="Disabled"
            timeRangeSelectedHandling="Disabled"
            eventRightClickHandling="Disabled"
            durationBarVisible={false}
            heightSpec="BusinessHoursNoScroll"
            businessBeginsHour={9}
            businessEndsHour={22}
            headerDateFormat="dddd"
        />
    );
}

export function InstructorAvailabilityTimetable({
    sections: sections,
    sessionCode,
}: {
    sections: Section[];
    sessionCode: string;
}) {
    const [events, setEvents] = React.useState<EventData[]>([]);
    const courseRoomBookings = useStoreState(
        (state) => state.courseRoomBookings
    );

    React.useEffect(() => {
        const colorManager = new ColorManager(colors);
        let events: EventData[] = sections.flatMap((s, i) =>
            s.meetingTimes
                .filter((t) => sessionCode.startsWith(t.sessionCode))
                .map((t) => {
                    // Attempt to get the real room number
                    let room = t.building.buildingCode;
                    const courseKey = `${sessionCode}-${s.code}${s.sectionCode}-${s.name}`;
                    if (courseRoomBookings[courseKey]) {
                        const roomBooking = courseRoomBookings[courseKey].find(
                            (b) => b.day === t.start.day
                        );
                        if (roomBooking) {
                            room = roomBooking.room;
                        }
                    }
                    const instructors =s.instructors
                            .map((i) => `${i.firstName} ${i.lastName}`)
                            .join(", ");

                    return {
                        id: i,
                        start: meetingTimeToDateString(t.start),
                        end: meetingTimeToDateString(t.end),
                        text: `${instructors} (${s.code}${s.sectionCode} ${s.name})`,
                        backColor: colorManager.getColor(instructors),
                        borderColor: "#00000000",
                        html: `<div class="time lecture"><b>${
                            instructors
                        }</b><ul> <li>(${s.code}${s.sectionCode} ${s.name})</li></ul></div>`,
                    } satisfies EventData;
                })
        );

        setEvents(events);
    }, [sections, sessionCode, courseRoomBookings]);

    return (
        <DayPilotCalendar
            viewType="WorkWeek"
            events={events}
            startDate={new DayPilot.Date("2023-01-02")}
            cellHeight={22}
            eventClickHandling="Disabled"
            eventDeleteHandling="Disabled"
            eventMoveHandling="Disabled"
            eventResizeHandling="Disabled"
            timeRangeSelectedHandling="Disabled"
            eventRightClickHandling="Disabled"
            durationBarVisible={false}
            heightSpec="BusinessHoursNoScroll"
            businessBeginsHour={9}
            businessEndsHour={22}
            headerDateFormat="dddd"
        />
    );
}

const START_YEAR = 2023;
const START_MONTH = 1;
const START_DATE = 2;

function createUtcDateString(
    year: number,
    month: number,
    date: number,
    hour: number,
    minute: number
): string {
    return new Date(
        Date.UTC(year, month - 1, date, hour, minute)
    ).toISOString();
}

function meetingTimeToDateString(t: Time): EventData["start"] {
    const hour = Math.floor(t.millisofday / 3600000);
    const minute = Math.floor((t.millisofday % 3600000) / 60000);

    const year = START_YEAR;
    const month = START_MONTH;
    const date = START_DATE + t.day - 1;

    return new DayPilot.Date(
        createUtcDateString(year, month, date, hour, minute)
    );
}

/**
 * ColorManager class to manage a sequence of colors.
 * It returns the same color for the same key and assigns the next color in the sequence for a new key.
 */
class ColorManager {
    private colors: string[];
    private colorMap: Map<string, string>;
    private currentIndex: number;

    /**
     * Creates an instance of ColorManager.
     * @param {string[]} colors - An array of color strings in CSS format (e.g., "#FF6F61").
     */
    constructor(colors: string[]) {
        this.colors = colors;
        this.colorMap = new Map();
        this.currentIndex = 0;
    }

    /**
     * Gets the color associated with the given key.
     * If the key is new, assigns the next color in the sequence.
     * @param {string} key - The key for which to get the color.
     * @returns {string} - The color associated with the key.
     */
    getColor(key: string): string {
        if (this.colorMap.has(key)) {
            return this.colorMap.get(key)!;
        } else {
            const color = this.colors[this.currentIndex % this.colors.length];
            this.colorMap.set(key, color);
            this.currentIndex++;
            return color;
        }
    }
}

// Example usage:
const colors = [
    "#79c41a",
    "#f3ed31",
    "#fac832",
    "#f2852f",
    "#ef7463",
    "#bc77d0",
    "#8d86e4",
    "#5ea0d7",
    "#58b9e0",
    "#5ab776",
    "#fef08a",
    "#a5f3fc",
    "#c4b5fd",
    "#f9a8d4",
    "#fb7185",
    "#bef264",
    "#fb923c",
    "#f87171",
    "#d6d3d1",
    "#818cf8",
];
