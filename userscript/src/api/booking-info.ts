import { localFetch, log } from "../utils";
import { Course } from "./course-info";
import { ExtractedKeys } from "./extract-keys";

export interface RoomBooking {
    building: string;
    room: string;
    bookings: Booking[];
}
interface Booking {
    desc: string;
    date: string;
    /**
     * Hour in 24 hour time of the start of the booking
     */
    start: number;
    /**
     * Hour in 24 hour time of the end of the booking
     */
    end: number;
}
/**
 * Format that the booking information comes in from the LSM API
 */
interface LsmBooking {
    allDay: boolean;
    title: string;
    className: string;
    start: string;
    end: string;
}

export type CourseRoomBookings = Record<
    string,
    { day: number; room: string }[]
>;

function extractHoursFromDate(date: Date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return hours + (minutes + seconds / 60) / 60;
}

function formatLSMBooking(lsmBooking: LsmBooking): Booking {
    const startTime = new Date(lsmBooking.start);
    const endTime = new Date(lsmBooking.end);
    const date = lsmBooking.start.slice(0, 10);

    return {
        desc: lsmBooking.title,
        date,
        start: extractHoursFromDate(startTime),
        end: extractHoursFromDate(endTime),
    };
}

/**
 * Add `days` days to a date.
 */
function addDays(date: Date, days: number) {
    const ret = new Date(date);
    ret.setDate(ret.getDate() + days);
    return ret;
}
/**
 * Format a date in the "YYYYMMDD000000" format for an LSM request
 */
function dateToRequestString(date: Date) {
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = date.getUTCDate().toString().padStart(2, "0");
    return `${year}${month}${day}000000`;
}

/**
 * Fetch information about the bookings for the rooms in a particular building on a particular date.
 */
export async function fetchScheduleForRooms(
    rooms: [string, string][],
    date: string | Date,
    pageVars: ExtractedKeys
): Promise<RoomBooking[]> {
    if (typeof date === "string") {
        date = new Date(date);
    }
    const start = dateToRequestString(date);
    const end = dateToRequestString(addDays(date, 1));

    const requestParams = { x01: "GET", x02: start, x03: end };

    return await Promise.all(
        rooms.map(async ([building, room]) => {
            const body = new URLSearchParams({
                p_flow_id: "162",
                p_flow_step_id: "1",
                p_instance: pageVars.pInstance,
                p_request: `PLUGIN=${pageVars.ajaxIdentifiers.PLUGIN}`,
                p_page_submission_id: pageVars.pPageSubmissionId,
                p_json: JSON.stringify({
                    salt: pageVars.pSalt,
                    pageItems: {
                        itemsToSubmit: [
                            { n: "BLDG", v: building },
                            { n: "ROOM", v: room },
                        ],
                        protected: pageVars.pPageItemsProtected,
                        rowVersion: "",
                    },
                }),
                ...requestParams,
            });

            const resp = await localFetch(
                "https://lsm.utoronto.ca/ords/wwv_flow.ajax",
                {
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded; charset=UTF-8",
                        Pragma: "no-cache",
                        "Cache-Control": "no-cache",
                        Accept: "application/json",
                    },
                    method: "POST",
                    body: body,
                }
            );
            const data = await resp.json();
            if (!Array.isArray(data)) {
                throw new Error(
                    `Expected Array but got ${JSON.stringify(data)}`
                );
            }
            return {
                building,
                room,
                bookings: data.map(formatLSMBooking) as Booking[],
            };
        })
    );
}

/**
 * Fetch information about all the room bookings for a particular course.
 */
export async function fetchRoomsForCourse(
    course: Course,
    sessionCode: string,
    pageVars: ExtractedKeys
) {
    const requestParams = {};

    const body = new URLSearchParams({
        p_flow_id: "151",
        p_flow_step_id: "1",
        p_reload_on_submit: "S",
        p_instance: pageVars.pInstance,
        p_request: `Go`,
        p_page_submission_id: pageVars.pPageSubmissionId,
        p_json: JSON.stringify({
            salt: pageVars.pSalt,
            pageItems: {
                itemsToSubmit: [
                    // XXX: Yes, this is misspelled in the source. Maybe they'll fix the spelling one day and break this app? (2024-08-31)
                    { n: "P1_SESSON", v: [sessionCode] },
                    { n: "P1_SUBJECT", v: course.code.slice(0, 3) },
                    { n: "P1_COURSE", v: course.code },
                ],
                protected: pageVars.pPageItemsProtected,
                formRegionChecksums: [],
                rowVersion: "",
            },
        }),
        ...requestParams,
    });

    let resp = await localFetch(
        "https://lsm.utoronto.ca/ords/wwv_flow.accept?p_context=courses103151/courses-at-a-glance",
        {
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded; charset=UTF-8",
                Pragma: "no-cache",
                "Cache-Control": "no-cache",
                Accept: "application/json",
            },
            method: "POST",
            body: body,
        }
    );
    const data = await resp.json();
    if (typeof data !== "object" || !("redirectURL" in data)) {
        log(
            "Got data",
            data,
            "from",
            resp.url,
            "but data does not contain redirectURL"
        );
        throw new Error("redirectURL for finding rooms for a course not found");
    }

    const redirectURL = data.redirectURL;
    resp = await localFetch(`https://lsm.utoronto.ca${redirectURL}`, {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
            Accept: "text/html",
        },
    });
    const doc = new DOMParser().parseFromString(await resp.text(), "text/html");
    const table = doc.querySelector("table.t-Report-report");
    if (!table) {
        throw new Error(
            "No table of course bookings found; cannot continue looking for course rooms"
        );
    }
    const parsedTable = parseTableToJSON(table);

    return indexTableBySection(parsedTable);
}

/**
 * Convert a document whose root is a table into a JSON object whose headers are the keys.
 */
function parseTableToJSON(table: Element) {
    const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
        (th.textContent || "").trim()
    );
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    const data = rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        const rowData: Record<string, string> = {};
        cells.forEach((cell, index) => {
            rowData[headers[index]] = (cell.textContent || "").trim();
        });
        return rowData;
    });
    return data;
}

/**
 * Take a table with rows that conform to
 * ```
 * {
 *   "Ssn": "20245",
 *   "P Org": "ARTSC",
 *   "S Org": "MAT",
 *   "Co Sec": "",
 *   "Course": "MAT137Y1",
 *   "Sectyr": "Y",
 *   "Lec": "TUT",
 *   "Sctn": "0401",
 *   "Delivery Mode": "SYNC",
 *   "Enrol": "35",
 *   "Sdate": "20240506",
 *   "Edate": "20240812",
 *   "Day of Week": "Fr",
 *   "Begn": "1200",
 *   "Ends": "1300",
 *   "Durn": "1",
 *   "Bd": "ON",
 *   "Room": "LINES",
 *   "Type": "Online",
 *   "Room Cap": "9999",
 *   "Instr": ""
 * }
 * ```
 * and create an object indexed by `Ssn-CourseSectyr-LecSctn` which contains an
 * array of [day-of-week, room] pairs.
 */
function indexTableBySection(table: Record<string, string>[]) {
    const ret: CourseRoomBookings = {};
    table.forEach((row) => {
        const key = `${row["Ssn"]}-${row["Course"]}${row["Sectyr"]}-${row["Lec"]}${row["Sctn"]}`;
        if (!(key in ret)) {
            ret[key] = [];
        }
        ret[key].push({
            day: dayOfWeekToNumber(row["Day of Week"]),
            room: `${row["Bd"]} ${row["Room"]}`,
        });
    });
    return ret;
}

/**
 * Convert day-of-week abbreviations to numbers, with `Mo` being 1, `Su` being 0, and `Sa` being 6.
 * @param dayOfWeek
 */
function dayOfWeekToNumber(dayOfWeek: string): number {
    switch (dayOfWeek) {
        case "Su":
            return 0;
        case "Mo":
            return 1;
        case "Tu":
            return 2;
        case "We":
            return 3;
        case "Th":
            return 4;
        case "Fr":
            return 5;
        case "Sa":
            return 6;
        default:
            throw new Error(`Unknown day of week: ${dayOfWeek}`);
    }
}
