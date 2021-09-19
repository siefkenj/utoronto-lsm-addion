import {
    Action,
    action,
    computed,
    Computed,
    createStore,
    thunk,
    Thunk,
} from "easy-peasy";
import { fetchScheduleForRooms, RoomBooking } from "../api/booking-info";
import { RoomInfo } from "../api/building-info";
import { extractKeysFromLsmPage } from "../api/extract-keys";
import { ROOM_INFO } from "../data/room-info";
import { localFetch, log } from "../utils";

export type StoredRoomInfo = {
    _downloadDate: string;
    buildings: { rooms: RoomInfo[]; building: string; buildingName: string }[];
};

export const HOURS_IN_CALENDAR = [
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
];
const EMPTY_LIST: any[] = [];

/**
 * Turn a booking into a unique string hash. This function assumes that `booking.bookings` only
 * contains information about one calendar day.
 */
function hashBooking(booking: RoomBooking, bookingDate?: string) {
    const date = booking.bookings[0]?.date || bookingDate || "";
    const { room, building } = booking;
    return `${date},${building},${room}`;
}
export interface RootStore {
    init: Thunk<RootStore, never>;
    roomInfo: StoredRoomInfo;
    setRoomInfo: Action<RootStore, StoredRoomInfo>;
    loadingData: boolean;
    setLoadingData: Action<RootStore, boolean>;
    filterByCapacity: boolean;
    capacity: { min: number; max: number };
    setCapacity: Action<RootStore, { min?: number; max?: number }>;
    setFilterByCapacity: Action<RootStore, boolean>;
    activeDate: string | null;
    setActiveDate: Action<RootStore, string>;
    activeBuildings: { id: string; label: string }[];
    setActiveBuildings: Action<RootStore, { id: string; label: string }[]>;
    activeRooms: Computed<RootStore, RoomInfo[]>;
    bookingCache: Record<string, RoomBooking>;
    setBookingCache: Action<
        RootStore,
        { bookings: RoomBooking[]; date?: string }
    >;
    fetchBookings: Thunk<
        RootStore,
        { date: string; rooms: [string, string][] }
    >;
    activeBookings: Computed<RootStore, RoomBooking[]>;
    activeBookingsCalendar: Computed<
        RootStore,
        {
            date: string;
            room: string;
            building: string;
            bookings: ({ desc: string; hour: number } | null)[];
        }[]
    >;
}

const rootStore: RootStore = {
    init: thunk((actions) => {
        // Initialize the app by loading roomInfo from local storage if there is a cached version there.
        const roomInfoStr = localStorage.getItem("room-info");
        if (!roomInfoStr) {
            return;
        }
        try {
            const roomInfo: StoredRoomInfo = JSON.parse(roomInfoStr);
            if (!roomInfo._downloadDate) {
                throw new Error(
                    `Expected roomInfo to have a "_downloadDate" field, but it does not. roomInfo: ${roomInfoStr.slice(
                        0,
                        100
                    )}`
                );
            }
            log(
                "Found cached roomInfo data. It is likely newer than the built-in data, so it will be used."
            );
            // If we made it here, assume the data is good
            actions.setRoomInfo(roomInfo);
        } catch (e) {
            log(
                "Error encountered when trying to load roomInfo from local storage",
                e
            );
        }
    }),
    roomInfo: ROOM_INFO,
    setRoomInfo: action((state, payload) => {
        state.roomInfo = payload;
    }),
    loadingData: false,
    setLoadingData: action((state, payload) => {
        state.loadingData = payload;
    }),
    filterByCapacity: false,
    capacity: { min: 30, max: 500 },
    setCapacity: action((state, payload) => {
        if (payload.min != null) {
            state.capacity.min = payload.min;
        }
        if (payload.max != null) {
            state.capacity.max = payload.max;
        }
    }),
    setFilterByCapacity: action((state, payload) => {
        state.filterByCapacity = payload;
    }),
    activeDate: new Date().toJSON().slice(0, 10),
    setActiveDate: action((state, payload) => {
        state.activeDate = payload;
    }),
    activeBuildings: [],
    bookingCache: {},
    setBookingCache: action((state, { bookings, date }) => {
        // We assume that each entry in the payload array corresponds to a booking for only
        // one day.
        for (const booking of bookings) {
            const hash = hashBooking(booking, date);
            // Make a deep copy of the booking object
            state.bookingCache[hash] = {
                ...booking,
                bookings: booking.bookings.map((x) => ({ ...x })),
            };
        }
    }),
    setActiveBuildings: action((state, payload) => {
        state.activeBuildings = payload;
    }),
    activeRooms: computed((state) => {
        const buildings = state.activeBuildings.map((b) => b.id);
        const rooms = state.roomInfo.buildings
            .filter((building) => buildings.includes(building.building))
            .flatMap((building) => building.rooms);
        if (state.filterByCapacity) {
            return rooms.filter(
                (room) =>
                    room.capacity &&
                    room.capacity >= state.capacity.min &&
                    room.capacity <= state.capacity.max
            );
        }
        return rooms;
    }),
    activeBookings: computed((state) => {
        const date = state.activeDate;
        const activeRooms = state.activeRooms;
        const cachedRooms = activeRooms.filter((room) => {
            const hash = `${date},${room.building},${room.room}`;
            return hash in state.bookingCache;
        });
        return cachedRooms.map((room) => {
            const hash = `${date},${room.building},${room.room}`;
            return state.bookingCache[hash];
        });
    }),
    activeBookingsCalendar: computed((state) => {
        const activeBookings = state.activeBookings;
        const date = state.activeDate;
        if (!date) {
            return EMPTY_LIST;
        }

        // `activeBookingsCalendar` is like `activeBookings` except the bookings are
        // given hour-by-hour, with null filled in for times when there isn't a booking.
        const ret = activeBookings.map((booking) => {
            const bookingsMatchingDate = booking.bookings.filter(
                (b) => b.date === date
            );
            return {
                date,
                room: booking.room,
                building: booking.building,
                bookings: HOURS_IN_CALENDAR.map((hour) => {
                    const matchingBooking = bookingsMatchingDate.find(
                        // We're looking for a booking that starts this hour,
                        // ends this hour, or contains a the whole hour block
                        (b) =>
                            (b.start >= hour && b.start < hour + 1) ||
                            (b.end >= hour && b.end < hour + 1) ||
                            (b.start <= hour && b.end >= hour)
                    );
                    if (matchingBooking) {
                        return { desc: matchingBooking.desc, hour };
                    }
                    return null;
                }),
            };
        });
        return ret;
    }),
    fetchBookings: thunk(async (actions, payload, { getState }) => {
        const bookingCache = getState().bookingCache;
        const date = payload.date;
        // Get a list of rooms that aren't included in the booking cache
        const missingBookingInfo = payload.rooms.filter((room) => {
            const hash = `${date},${room[0]},${room[1]}`;
            return !(hash in bookingCache);
        });

        if (missingBookingInfo.length === 0) {
            return;
        }

        actions.setLoadingData(true);

        try {
            // Set the cache for all bookings that we're about to fetch. This will
            // get overridden soon, but it will prevent us from trying to fetch the
            // data multiple times.
            actions.setBookingCache({
                date,
                bookings: missingBookingInfo.map((x) => ({
                    building: x[0],
                    room: x[1],
                    bookings: [],
                })),
            });

            // Get the page variables so we can start making requests
            let resp = await localFetch(
                "https://lsm.utoronto.ca/ords/f?p=162:101::BRANCH_TO_PAGE_ACCEPT::::"
            );
            const pageVars = extractKeysFromLsmPage(await resp.text());
            const bookings = await fetchScheduleForRooms(
                missingBookingInfo,
                new Date(date),
                pageVars
            );

            log("Got bookings for", date, bookings);
            actions.setBookingCache({ bookings, date });
        } finally {
            actions.setLoadingData(false);
        }
    }),
};

export const store = createStore(rootStore);

export type RootState = ReturnType<typeof store.getState>;
