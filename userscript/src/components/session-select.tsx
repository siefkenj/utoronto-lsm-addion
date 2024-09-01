import React from "react";
import classNames from "classnames";
import { Session, SessionLike, progressInSession } from "../libs/session-date";
import "./session-select.css";
import { Button } from "react-bootstrap";

// Select a session/term showing the previous and future sessions
export function SessionSelectWide({
    selectedSession,
    today = new Date(),
    startYear: _startYear,
    onClick = () => {},
}: {
    selectedSession?: Session;
    today?: Date;
    startYear?: number;
    onClick?: (session: Session) => void;
}) {
    let endYear;
    const todaySession = Session.fromDate(today);
    if (!_startYear) {
        _startYear = todaySession.year - 1;
    } else {
        _startYear = +_startYear;
    }

    if (!selectedSession) {
        selectedSession = Session.fromDate(today);
    }
    selectedSession = Session.ensure(selectedSession);

    function selectSessionFactory(session: SessionLike) {
        return () => {
            onClick(Session.ensure(session));
        };
    }

    const [startYear, setStartYear] = React.useState(_startYear);

    endYear = startYear + 2;
    const progress = progressInSession(
        today,
        { year: startYear, term: "F" },
        { year: endYear, term: "F" }
    );

    const yearsLabels = Array.from(new Array(endYear - startYear + 1)).map(
        (a, b) => b + startYear
    );

    // build up table rows
    let row1 = [],
        row2 = [],
        row3 = [];
    for (let year of yearsLabels) {
        const selected = {
            year: selectedSession.year === year,
            y: false,
            f: false,
            s: false,
            sy: false,
            sf: false,
            ss: false,
        };
        selected.y =
            selected.year && ["Y", "F", "S"].includes(selectedSession.term);
        selected.f = selected.year && selectedSession.term === "F";
        selected.s = selected.year && selectedSession.term === "S";
        selected.sy =
            selected.year && ["SY", "SF", "SS"].includes(selectedSession.term);
        selected.sf = selected.year && selectedSession.term === "SF";
        selected.ss = selected.year && selectedSession.term === "SS";

        // Row for year labels
        row1.push(
            <div
                className={classNames({ year: true, selected: selected.year })}
                key={year}
                onClick={selectSessionFactory({ year: year, term: "F" })}
            >
                {Session.formatYear(year)}
            </div>
        );
        // Row for Y sessions
        row2.push(
            <div
                className={classNames({
                    "session-y": true,
                    selected: selected.y,
                })}
                key={year + "Y"}
                onClick={selectSessionFactory({ year: year, term: "F" })}
            >
                Y
            </div>
        );
        row2.push(
            <div
                className={classNames({
                    "session-y": true,
                    selected: selected.sy,
                    summer: true,
                })}
                key={year + "SY"}
                onClick={selectSessionFactory({ year: year, term: "SF" })}
            >
                Summer Y
            </div>
        );
        // Row for F/S sessions
        row3.push(
            <div
                className={classNames({
                    "session-f": true,
                    selected: selected.f,
                })}
                key={year + "F"}
                onClick={selectSessionFactory({ year: year, term: "F" })}
            >
                F
            </div>
        );
        row3.push(
            <div
                className={classNames({
                    "session-s": true,
                    selected: selected.s,
                })}
                key={year + "S"}
                onClick={selectSessionFactory({ year: year, term: "S" })}
            >
                S
            </div>
        );
        row3.push(
            <div
                className={classNames({
                    "session-f": true,
                    selected: selected.sf,
                    summer: true,
                })}
                key={year + "SF"}
                onClick={selectSessionFactory({ year: year, term: "SF" })}
            >
                F
            </div>
        );
        row3.push(
            <div
                className={classNames({
                    "session-s": true,
                    selected: selected.ss,
                    summer: true,
                })}
                key={year + "SS"}
                onClick={selectSessionFactory({ year: year, term: "SS" })}
            >
                S
            </div>
        );
    }

    return (
        <div className="tswc">
            <div className="term-selector-container">
                <div
                    style={{
                        marginRight: 3,
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <Button
                        title="Previous Year"
                        onClick={() => setStartYear(startYear - 1)}
                        variant="light"
                    >
                        ◀
                    </Button>
                </div>
                <div className="term-selector-body">
                    <div className="term-selector">
                        {row1}
                        {row2}
                        {row3}
                    </div>
                    <div className="year-progress">
                        <div
                            className="year-progress-arrow"
                            style={{ left: `${100 * progress}%` }}
                            onClick={selectSessionFactory(
                                Session.fromDate(today)
                            )}
                        >
                            <div className="year-progress-arrow-marker">⌃</div>
                            <div>Today</div>
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        marginLeft: 3,
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <Button
                        title="Next Year"
                        onClick={() => setStartYear(startYear + 1)}
                        variant="light"
                    >
                        ▶
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Display the current session with an optional edit button
export function SessionDisplay({
    session,
    editable,
    onChange,
    ...rest
}: {
    session: Session;
    editable?: boolean;
    onChange?: (session: SessionLike) => void;
}) {
    session = new Session(session);
    onChange = onChange || (() => {});

    const [dialogOpenState, setDialogOpenState] = React.useState(false);
    function toggleDialogState() {
        setDialogOpenState(!dialogOpenState);
    }
    function closeDialog() {
        setDialogOpenState(false);
    }

    return (
        <React.Fragment>
            <div className="utk-session-name">
                <div className="utk-session-header">
                    <span
                        role="img"
                        aria-label="calendar"
                        style={{ marginRight: "1em" }}
                    >
                        &#x1F5D3;
                    </span>
                    {session.prettyYear}
                </div>
                <div className="utk-session-term">
                    {editable && (
                        <Button color="primary" onClick={toggleDialogState}>
                            <span role="img" aria-label="edit">
                                &#x1F589;
                            </span>
                        </Button>
                    )}
                    {session.prettyTerm}
                </div>
            </div>
            {
                //           <SessionSelectDialog
                //              open={dialogOpenState}
                //              currentSession={session}
                //              onClose={closeDialog}
                //              onChange={onChange}
                //          />
            }
        </React.Fragment>
    );
}

//// Dialog to
//function SessionSelectDialog({ onClose, onChange, currentSession, ...rest }) {
//    const propCurrentSession = currentSession;
//    let setCurrentSession;
//    [currentSession, setCurrentSession] = React.useState(currentSession);
//    // if the dialog is not showing, set currentSession to the passed in prop
//    // so the next time the dialog is opened it starts in the proper state
//    if (!rest.open) {
//        if (
//            !Session.ensure(propCurrentSession).equal(
//                Session.ensure(currentSession)
//            )
//        ) {
//            setCurrentSession(propCurrentSession);
//        }
//    }
//    function changeSession() {
//        onClose();
//        onChange(currentSession);
//    }
//    return (
//        <Dialog onClose={onClose} maxWidth="xl" {...rest}>
//            <DialogTitle>Select Session</DialogTitle>
//            <DialogContent>
//                <SessionDisplay session={currentSession} />
//                <div style={{ minWidth: "700px", minHeight: "100px" }}>
//                    <SessionSelectWide
//                        selectedSession={currentSession}
//                        onClick={(session) => setCurrentSession(session)}
//                    />
//                </div>
//            </DialogContent>
//            <DialogActions>
//                <Button color="primary" onClick={onClose}>
//                    Cancel
//                </Button>
//                <Button color="primary" onClick={changeSession}>
//                    Select
//                </Button>
//            </DialogActions>
//        </Dialog>
//    );
//}
