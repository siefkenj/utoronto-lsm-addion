import React, { act } from "react";
import { SessionDisplay, SessionSelectWide } from "./session-select";
import { Session } from "../libs/session-date";
import {
    useStoreActions,
    useStoreDispatch,
    useStoreState,
} from "../store/hooks";
import {
    Alert,
    Button,
    Card,
    Form,
    ListGroup,
    Stack,
    Table,
} from "react-bootstrap";
import { log } from "../utils";
import {
    Course,
    Section,
    getCourseId,
    getCourseInfo,
    getCourseStats,
} from "../api/course-info";
import {
    CourseTimetable,
    InstructorAvailabilityTimetable,
} from "./course-timetable";

export function CourseStats() {
    const host = useStoreState((state) => state.host);
    const [courseCode, setCourseCode] = React.useState("");
    const activeSession = useStoreState((state) => state.activeSession);
    const setActiveSession = useStoreActions((state) => state.setActiveSession);
    const [error, setError] = React.useState<string | null>(null);
    const setLoadingData = useStoreActions((state) => state.setLoadingData);
    const fetchCoursesBySearchTerm = useStoreActions(
        (actions) => actions.fetchCoursesBySearchTerm
    );
    const activeCourse = useStoreState((state) => state.activeCourse);
    const allCourses = useStoreState((state) => state.allCourses);
    const setActiveCourseId = useStoreActions(
        (state) => state.setActiveCourseId
    );
    const [availableCourseIds, setAvailableCourseIds] = React.useState<
        string[]
    >([]);
    const fetchBookingsForCourse = useStoreActions(
        (actions) => actions.fetchBookingsForCourse
    );
    const activeInstructors = useStoreState((state) => state.activeInstructors);
    const fetchCoursesByInstructor = useStoreActions(
        (actions) => actions.fetchCoursesByInstructor
    );
    // All sections of courses taught by active instructors
    const activeInstructorSections = React.useMemo(() => {
        // Find all sections that have an instructor matching someone from the activeInstructors list
        // Inject into that section the course code and sectionCode.
        const sections: Section[] = Object.values(allCourses)
            .flatMap((c) =>
                c.sections.map(
                    (s) =>
                        ({
                            ...s,
                            code: c.code,
                            sectionCode: c.sectionCode,
                        } satisfies Section)
                )
            )
            .filter(
                (s) =>
                    s.type === "Lecture" &&
                    s.cancelInd === "N" &&
                    s.instructors.some((i) =>
                        activeInstructors.some(
                            (ai) =>
                                ai.firstName === i.firstName &&
                                ai.lastName === i.lastName
                        )
                    )
            );
        return sections;
    }, [allCourses, activeInstructors]);

    const onSearchClick = React.useCallback(async () => {
        try {
            setLoadingData(true);
            setError(null);
            setActiveCourseId(null);
            setAvailableCourseIds([]);

            let courses = await fetchCoursesBySearchTerm(courseCode.trim());
            if (courses.length === 0) {
                setError(`Could not find courses matching "${courseCode}"`);
            } else if (courses.length >= 20) {
                setError(
                    `Too many courses found (${courses.length}), please narrow your search`
                );
            } else {
                setError(null);
            }

            // We want to only select a course if its prefix matches what we typed.
            courses = courses.filter((c) =>
                `${c.code}${c.sectionCode}`
                    .toUpperCase()
                    .startsWith(courseCode.trim().toUpperCase())
            );

            if (courses.length === 1) {
                setActiveCourseId(getCourseId(courses[0]));
            } else {
                setAvailableCourseIds(courses.map(getCourseId));
            }
        } catch (e) {
            log(e);
        } finally {
            setLoadingData(false);
        }
    }, [activeSession, courseCode]);

    React.useEffect(() => {
        if (activeCourse) {
            fetchBookingsForCourse(activeCourse).catch(log);
        }
    }, [activeCourse, activeSession]);
    React.useEffect(() => {
        fetchCoursesByInstructor(
            activeInstructors.map((i) => `${i.firstName} ${i.lastName}`)
        ).catch(log);
    }, [activeInstructors]);

    return (
        <Stack gap={2}>
            {host !== "lsm" && (
                <Alert variant="warning">
                    <p style={{ margin: 0 }}>
                        <b>Warning:</b> Room booking information is only
                        available when this addon is run from{" "}
                        <Alert.Link href="https://lsm.utoronto.ca/lsm_portal">
                            https://lsm.utoronto.ca/lsm_portal
                        </Alert.Link>
                        .
                    </p>
                </Alert>
            )}
            <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ flexGrow: 0 }}>
                    <SessionDisplay session={activeSession} />
                </div>
                <div style={{ flexGrow: 1, marginTop: "1.3em" }}>
                    <SessionSelectWide
                        selectedSession={activeSession}
                        onClick={(session) => setActiveSession(session)}
                    />
                </div>
            </div>
            <Stack direction="horizontal" style={{ gap: 3 }}>
                <Form.Control
                    placeholder="Course code"
                    value={courseCode}
                    onChange={(e) => {
                        setCourseCode(e.target.value);
                    }}
                    onKeyUp={(e) => {
                        // Trigger onSearchClick when the Enter key is pressed
                        if (e.key === "Enter") {
                            onSearchClick();
                        }
                    }}
                />
                <Button variant="primary" onClick={onSearchClick}>
                    Search
                </Button>
            </Stack>
            <Stack>
                {error && (
                    <Alert variant="danger" style={{ marginTop: "1em" }}>
                        {error}
                    </Alert>
                )}
                {availableCourseIds.length > 0 && (
                    <Alert variant="info" style={{ marginTop: "1em" }}>
                        Multiple courses found. Please select one from the list
                        below.
                        <ListGroup>
                            {availableCourseIds.map((id) => (
                                <ListGroup.Item
                                    key={id}
                                    action
                                    onClick={() => {
                                        setActiveCourseId(id);
                                        setAvailableCourseIds([]);
                                    }}
                                >
                                    <CourseName
                                        course={allCourses[id]}
                                        showStats={true}
                                    />
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Alert>
                )}
                {activeCourse && (
                    <React.Fragment>
                        <Alert variant="success" style={{ marginTop: "1em" }}>
                            <CourseName
                                course={activeCourse}
                                showStats={true}
                            />
                        </Alert>
                        <h4>Course Description</h4>
                        <p>{activeCourse.cmCourseInfo.description}</p>
                        <h3 style={{ marginTop: "1em" }}>Lectures</h3>
                        <CourseTimetable
                            course={activeCourse}
                            sessionCode={activeSession.toTtbApiString()}
                        />
                        <h3 style={{ marginTop: "1em" }}>Tutorials</h3>
                        <CourseTimetable
                            course={activeCourse}
                            display="tutorial"
                            sessionCode={activeSession.toTtbApiString()}
                        />
                        <h3 style={{ marginTop: "1em" }}>
                            Instructor Availability
                        </h3>
                        <p>
                            Below is a timetable listing every course taught by
                            instructors in {activeCourse.code}. These are
                            queried from the database and may not contain
                            courses like graduate courses (or other oddities
                            that the database doesn't list).
                        </p>
                        <InstructorAvailabilityTimetable
                            sections={activeInstructorSections}
                            sessionCode={activeSession.toTtbApiString()}
                        />
                    </React.Fragment>
                )}
            </Stack>
        </Stack>
    );
}

/**
 * Display the course name in a readable way.
 */
function CourseName({
    course,
    showStats = false,
}: {
    course: Course;
    showStats?: boolean;
}) {
    if (!course) {
        log("Warning: asked to display a null course");
        return null;
    }
    let code = course.code;
    let suffix = "";
    // Filter off the H1, Y5, etc. suffixes
    if (code.match(/(F|H)\d$/)) {
        suffix = code.slice(-2);
        code = code.slice(0, -2);
    }
    const stats = getCourseStats(course);

    if (!showStats) {
        return (
            <div
                title={`${stats.currentEnrolment} (${stats.currentWaitlist}) Enrollment (Waitlist); ${stats.numLectures} Lectures and ${stats.numTutorials} Tutorials`}
            >
                <b>{code}</b>
                <span className="suffix">
                    {suffix}
                    {course.sectionCode}
                </span>{" "}
                (<i>{course.name}</i> in {course.sessions.join("-")} session)
            </div>
        );
    }
    return (
        <Card>
            <Card.Body>
                <Card.Title>
                    <b>{code}</b>
                    <span className="suffix">
                        {suffix}
                        {course.sectionCode}
                    </span>
                </Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                    <i>{course.name}</i> ({course.sessions.join("-")} session)
                </Card.Subtitle>
                <Table size="sm" style={{ marginBottom: 0 }}>
                    <thead>
                        <tr>
                            <th>Enrollment</th>
                            <th>(Waitlist)</th>
                            <th>Num Lectures</th>
                            <th>Num Tutorials</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{stats.currentEnrolment}</td>
                            <td>({stats.currentWaitlist})</td>
                            <td>{stats.numLectures}</td>
                            <td>{stats.numTutorials}</td>
                        </tr>
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
}
