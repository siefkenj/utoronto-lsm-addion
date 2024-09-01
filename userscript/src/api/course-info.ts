import { Session, SessionLike } from "../libs/session-date";
import { log } from "../utils";

export interface CourseApiQuery {
    payload: CourseApiQueryPayload;
    status: CourseApiQueryStatus[];
}

export interface CourseApiQueryPayload {
    pageableCourse: PageableCourse;
    divisionalLegends: DivisionalLegends;
    divisionalEnrolmentIndicators: DivisionalEnrolmentIndicators;
}

export interface PageableCourse {
    courses: Course[];
    total: number;
    page: number;
    pageSize: number;
}

export interface Course {
    id: string;
    name: string;
    ucName: unknown;
    code: string;
    sectionCode: string;
    campus: string;
    sessions: string[];
    sections: Section[];
    duration: unknown;
    cmCourseInfo: CmCourseInfo;
    created: string;
    modified: unknown;
    lastSaved: number;
    primaryTeachMethod: string;
    faculty: Faculty;
    coSec: CoSec;
    department: Department;
    title: unknown;
    maxCredit: number;
    minCredit: number;
    breadths: Breadth[];
    cancelInd: "Y" | "N";
    subscriptionTtb: boolean;
    subscriptionOpenData: boolean;
    tb1Active: boolean;
    tb2Active: boolean;
    primaryWaitlistable: boolean;
    fullyOnline: boolean;
    primaryFull: boolean;
}

export interface Section {
    name: string;
    type: "Lecture" | "Tutorial" | "Practical";
    teachMethod: "TUT" | "LEC" | "PRA";
    sectionNumber: string;
    meetingTimes: MeetingTime[];
    firstMeeting: any;
    instructors: Instructor[];
    currentEnrolment: number;
    maxEnrolment: number;
    subTitle: string;
    cancelInd: string;
    waitlistInd: string;
    deliveryModes: DeliveryMode[];
    currentWaitlist: number;
    enrolmentInd: string;
    tbaInd: string;
    openLimitInd: string;
    enrolmentControls: EnrolmentControl[];
    linkedMeetingSections: any;
    /**
     * Inserted in when needed by the view-model
     */
    code?: string;
    /**
     * Inserted in when needed by the view-model
     */
    sectionCode?: string;
}

export interface MeetingTime {
    start: Time;
    end: Time;
    building: Building;
    sessionCode: string;
    repetition: string;
    repetitionTime: string;
}

export interface Time {
    day: number;
    millisofday: number;
}

export interface Building {
    buildingCode: string;
    buildingRoomNumber: string;
    buildingRoomSuffix: string;
    buildingUrl: string;
    buildingName: any;
}

export interface Instructor {
    firstName: string;
    lastName: string;
}

export interface DeliveryMode {
    session: string;
    mode: string;
}

export interface EnrolmentControl {
    yearOfStudy: string;
    post: EnrollmentInfo;
    subject: EnrollmentInfo;
    subjectPost: EnrollmentInfo;
    typeOfProgram: EnrollmentInfo;
    designation: EnrollmentInfo;
    primaryOrg: EnrollmentInfo;
    associatedOrg: EnrollmentInfo;
    secondOrg: EnrollmentInfo;
    adminOrg: EnrollmentInfo;
    collaborativeOrgGroupCode: string;
    quantity: number;
    sequence: number;
}

export interface EnrollmentInfo {
    code: string;
    name: string;
}

export interface CmCourseInfo {
    description: string;
    title: string;
    levelOfInstruction: string;
    prerequisitesText: string;
    corequisitesText?: string;
    exclusionsText?: string;
    recommendedPreparation?: string;
    note: any;
    division: string;
    breadthRequirements: string[];
    distributionRequirements?: string[];
    publicationSections: string[];
    cmPublicationSections: CmPublicationSection[];
}

export interface CmPublicationSection {
    section: string;
    subSections: any;
}

export interface Faculty {
    code: string;
    name: string;
}

export interface CoSec {
    code: string;
    name: any;
}

export interface Department {
    code: string;
    name: string;
}

export interface Breadth {
    org: Org;
    breadthTypes: BreadthType[];
}

export interface Org {
    code: string;
    name: string;
}

export interface BreadthType {
    kind: string;
    type: string;
    description: string;
    code: string;
}

export interface DivisionalLegends {
    ERIN: string;
    ARTSC: string;
}

export interface DivisionalEnrolmentIndicators {
    APSC: any[];
    ARTSC: Artsc[];
}

export interface Artsc {
    code: string;
    name: string;
}

export interface CourseApiQueryStatus {
    code: number;
    message: string;
}

/**
 * Retrieve scheduling information about a course by a `courseCode` search term and a `session`.
 */
export async function getCourseInfo(courseCode: string, session: SessionLike) {
    const ses = new Session(session);

    try {
        const body = JSON.stringify({
            courseCodeAndTitleProps: {
                courseCode: "",
                courseTitle: courseCode,
                courseSectionCode: "",
                searchCourseDescription: true,
            },
            departmentProps: [],
            campuses: [],
            sessions: [
                ses.toTtbApiString(),
                // Always include Y term in the searches
                ses.toTtbApiString("Y"),
            ],
            requirementProps: [],
            instructor: "",
            courseLevels: [],
            deliveryModes: [],
            dayPreferences: [],
            timePreferences: [],
            // ARTSC = Arts & Science, APSC = Applied Science and Engineering
            divisions: ["ARTSC", "APSC"],
            creditWeights: [],
            availableSpace: false,
            waitListable: false,
            page: 1,
            pageSize: 100,
            direction: "asc",
        });
        const url = "https://api.easi.utoronto.ca/ttb/getPageableCourses";
        log("Making POST request to", url, "with body", body);

        let response = await fetch(
            "https://api.easi.utoronto.ca/ttb/getPageableCourses",
            {
                credentials: "omit",
                headers: {
                    //        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Content-Type": "application/json",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-site",
                    Priority: "u=0",
                    Pragma: "no-cache",
                    "Cache-Control": "no-cache",
                },
                referrer: "https://ttb.utoronto.ca/",
                body,
                method: "POST",
                mode: "cors",
            }
        );
        if (!response.ok) {
            throw new Error("Failed to fetch course information");
        }
        return (await response.json()) as CourseApiQuery;
    } catch (e) {
        log(e);
        throw e;
    }
}

/**
 * Retrieve scheduling information about a course by a list of `instructors` and a `session`.
 */
export async function getCourseInfoByInstructor(
    instructors: string[],
    session: SessionLike
) {
    const ses = new Session(session);

    try {
        return Promise.all(
            instructors.map(async (instructor) => {
                const body = JSON.stringify({
                    courseCodeAndTitleProps: {
                        courseCode: "",
                        courseTitle: "",
                        courseSectionCode: "",
                    },
                    departmentProps: [],
                    campuses: [],
                    sessions: [
                        ses.toTtbApiString(),
                        // Always include Y term in the searches
                        ses.toTtbApiString("Y"),
                    ],
                    requirementProps: [],
                    instructor,
                    courseLevels: [],
                    deliveryModes: [],
                    dayPreferences: [],
                    timePreferences: [],
                    // ARTSC = Arts & Science, APSC = Applied Science and Engineering
                    divisions: ["ARTSC", "APSC"],
                    creditWeights: [],
                    availableSpace: false,
                    waitListable: false,
                    page: 1,
                    pageSize: 100,
                    direction: "asc",
                });
                const url =
                    "https://api.easi.utoronto.ca/ttb/getPageableCourses";
                log("Making POST request to", url, "with body", body);

                let response = await fetch(
                    "https://api.easi.utoronto.ca/ttb/getPageableCourses",
                    {
                        credentials: "omit",
                        headers: {
                            //        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
                            Accept: "application/json, text/plain, */*",
                            "Accept-Language": "en-US,en;q=0.5",
                            "Content-Type": "application/json",
                            "Sec-Fetch-Dest": "empty",
                            "Sec-Fetch-Mode": "cors",
                            "Sec-Fetch-Site": "same-site",
                            Priority: "u=0",
                            Pragma: "no-cache",
                            "Cache-Control": "no-cache",
                        },
                        referrer: "https://ttb.utoronto.ca/",
                        body,
                        method: "POST",
                        mode: "cors",
                    }
                );
                if (!response.ok) {
                    throw new Error("Failed to fetch course information");
                }
                return (await response.json()) as CourseApiQuery;
            })
        );
    } catch (e) {
        log(e);
        throw e;
    }
}

/**
 * Compute the id of a course which is it `SESSION-CODE`. E.g. `20249-MAT223H1F`
 */
export function getCourseId(course: Course) {
    return `${course.sessions.join("-")}-${course.code}${course.sectionCode}`;
}

/**
 * Get the stats of a course, including current enrolment, max enrolment, current waitlist,
 * number of sections, and number of tutorials.
 */
export function getCourseStats(course: Course) {
    const stats = {
        currentEnrolment: 0,
        currentWaitlist: 0,
        numLectures: 0,
        numTutorials: 0,
    };

    const lectures = course.sections.filter(
        (c) => c.type === "Lecture" && c.cancelInd === "N"
    );
    const tutorials = course.sections.filter(
        (c) => c.type === "Tutorial" && c.cancelInd === "N"
    );

    stats.numLectures = lectures.length;
    stats.numTutorials = tutorials.length;
    for (const lec of lectures) {
        stats.currentEnrolment += lec.currentEnrolment;
        stats.currentWaitlist += lec.currentWaitlist;
    }

    return stats;
}
