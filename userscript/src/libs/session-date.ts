/*
 * Utilities for working with dates and sessions.
 */

export type Term = "F" | "S" | "Y" | "SF" | "SS" | "SY";
export type SessionLike = Session | { term: Term; year: number };

/**
 * Class for handling session comparison and formatting
 */
class Session {
    year: number = 2024;
    term: Term = "F";
    constructor(
        year?: string | number | Session | { term: Term; year: number },
        term?: Term
    ) {
        if (!year) {
            let tmp = Session.fromDate();
            return new Session(tmp.year, tmp.term);
        }
        if (typeof year === "object") {
            return new Session(year.year, year.term);
        }
        if (!term && typeof year !== "string" && typeof year !== "number") {
            throw new Error(`Invalid initialization '${JSON.stringify(year)}'`);
        }
        if (!term && typeof year === "string") {
            // assume `year` is a formatted string "YYYY-<session>"
            [year, term] = year.split("-") as [string, Term];
            return new Session(year, term);
        }
        if (typeof year === "string") {
            year = +year;
        }
        this.year = Session.normalizeYear(year);
        this.term = term || "F";
    }

    toString() {
        return `${this.year}-${this.term}`;
    }

    valueOf() {
        return +this.toDate();
    }

    get prettyYear() {
        return Session.formatYear(this.year);
    }

    get prettyTerm() {
        switch (this.term) {
            case "F":
                return "(F) Fall Term";
            case "S":
                return "(S) Spring Term";
            case "Y":
                return "(Y) Year-long Term";
            case "SF":
                return "(F) Summer Term 1";
            case "SS":
                return "(S) Summer Term 2";
            case "SY":
                return "(Y) Summer Full Term";
            default:
                return "Unknown Term";
        }
    }

    toDate() {
        const { year, term } = this;

        switch (term) {
            case "F":
            case "Y":
                return new Date(year, 8, 1);
            case "S":
                return new Date(year + 1, 0, 1);
            case "SY":
            case "SF":
                return new Date(year + 1, 4, 1);
            case "SS":
                return new Date(year + 1, 5, 15);
            default:
                throw new Error("Unknown term ''" + term + "'");
        }
    }

    /**
     * Creates "sessions" suitable for sending to the ttb.utoronto.ca API.
     */
    toTtbApiString(term?: Term): string {
        if (term && term.length === 1 && this.term.length !== 1) {
            // We are in a summer term, so "Y" becomes "SY", "F" becomes "SF", etc.
            term = `S${term}` as Term;
        }
        switch (term || this.term) {
            case "F":
                return `${this.year}9`;
            case "S":
                return `${this.year + 1}1`;
            case "Y":
                return `${this.year}9-${this.year + 1}1`;
            case "SF":
                return `${this.year + 1}5F`;
            case "SS":
                return `${this.year + 1}5S`;
            case "SY":
                return `${this.year + 1}5`;
            default:
                throw new Error("Unknown term ''" + this.term + "'");
        }
    }

    equal(b: any) {
        return Session.equal(this, b);
    }

    static formatAsString(session: Session) {
        return new this(session).toString();
    }

    static formatYear(year: string | number | Session) {
        year = +year;
        return `${year}/${year + 1}`;
    }

    static normalizeYear(year: string | number | Number) {
        if (typeof year === "number") {
            return year;
        }
        if (year instanceof Number) {
            return +year;
        }
        if (typeof year === "string") {
            if (year.includes("/")) {
                year = year.match(/(.*)\//)?.[1] || 0;
            }
            return +year;
        }
        throw new Error(`Cannot parse '${year}' as a year.`);
    }

    static fromDate(date = new Date()) {
        let month = date.getMonth();
        let year = date.getFullYear();
        switch (month) {
            case 0:
            case 1:
            case 2:
            case 3:
                return new Session({ term: "S", year: year - 1 });
            case 4:
            case 5:
                return new Session({ term: "SF", year: year - 1 });
            case 6:
            case 7:
            case 8:
                return new Session({ term: "SS", year: year - 1 });
            case 9:
            case 10:
            case 11:
            default:
                return new Session({ term: "F", year: year });
        }
    }

    static equal(a: SessionLike, b: SessionLike) {
        if (
            typeof a !== "object" ||
            typeof b !== "object" ||
            a == null ||
            b == null
        ) {
            return false;
        }
        return a.year === b.year && a.term === b.term;
    }

    static ensure(session: any) {
        if (session instanceof this) {
            return session;
        }
        return new this(session);
    }
}

/**
 * Returns the percentage that `now` is through the session range.
 */
function progressInSession(
    now: number | Date,
    startSession: SessionLike,
    endSession: SessionLike
) {
    startSession = Session.ensure(startSession);
    endSession = Session.ensure(endSession);
    let startYear = startSession.year;
    let endYear = endSession.year;
    let start = +new Session({ term: "F", year: startYear });
    let end = +new Session({ term: "F", year: endYear + 1 });
    return (+now - start) / (end - start);
}

export { Session, progressInSession };
