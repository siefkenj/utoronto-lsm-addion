import { localFetch } from "../utils";
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
