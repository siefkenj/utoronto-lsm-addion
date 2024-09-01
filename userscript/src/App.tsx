import React, { act } from "react";
import "./App.css";
// Previously bootstrap was namespaced via `less`. However the new version of bootstrap causes a compile error with `less`,
// so we just directly import it at the risk of mangling global styles.
//import "./namespaced-bootstrap.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, Button, Tabs, Tab, Alert } from "react-bootstrap";
import { DayPicker } from "./components/day-picker";
import { BuildingPicker } from "./components/building-picker";
import { RoomCalendar } from "./components/room-calendar";
import { CapacitySlider } from "./components/capacity-slider";
import { ActivityThrobber } from "./components/activity-throbber";
import { RoomInfoDownloadButton } from "./components/room-info-download";
import { useStoreActions, useStoreState } from "./store/hooks";
import { CourseStats } from "./components/course-stats";

export function App() {
    const host = useStoreState((state) => state.host);
    const [modalOpen, setModalOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<"rooms" | "course">(
        host === "lsm" ? "rooms" : "course"
    );
    const init = useStoreActions((state) => state.init);

    React.useEffect(() => {
        // Only initialize the app on the first load
        init();
    });

    React.useLayoutEffect(() => {
        const htmlNode = document.body.parentElement;
        if (modalOpen && htmlNode) {
            // We only want bootstrap styles to appear while the dialog is open.
            // The styles are loaded by namespaced to an element with `id="canvas-quiz-stats"`.
            // Since we are showing a modal dialog, we need to apply this id to the root <html />
            // node for the page whenever the dialog is open.
            htmlNode.setAttribute("id", "canvas-quiz-stats");
        } else if (htmlNode) {
            htmlNode.removeAttribute("id");
        }
    }, [modalOpen]);

    return (
        <React.Fragment>
            <span
                onClick={() => setModalOpen(true)}
                className="t-Button t-Button--header"
                style={{ backgroundColor: "#c3c3c34d" }}
            >
                Room Viewer Addon
            </span>
            <Modal
                show={modalOpen}
                dialogClassName="fullscreen-modal"
                onHide={() => setModalOpen(false)}
            >
                <Modal.Header closeButton>
                    <Modal.Title className="modal-title">
                        <ActivityThrobber />
                        UToronto LSM Addon
                        <Tabs
                            id="room-viewer-tabs"
                            defaultActiveKey="rooms"
                            activeKey={activeTab}
                            onSelect={(k) =>
                                setActiveTab((k as typeof activeTab) || "rooms")
                            }
                            style={{ marginLeft: "1rem", fontWeight: "normal" }}
                            variant="pills"
                        >
                            <Tab eventKey="rooms" title="Room Viewer" />
                            <Tab eventKey="course" title="Course Stats" />
                        </Tabs>
                    </Modal.Title>
                </Modal.Header>

                {activeTab === "rooms" && (
                    <React.Fragment>
                        <Modal.Body>
                            {host !== "lsm" && (
                                <Alert variant="warning">
                                    <p style={{ margin: 0 }}>
                                        <b>Warning:</b> Room booking information
                                        is only available when this addon is run
                                        from{" "}
                                        <Alert.Link href="https://lsm.utoronto.ca/lsm_portal">
                                            https://lsm.utoronto.ca/lsm_portal
                                        </Alert.Link>
                                        .
                                    </p>
                                </Alert>
                            )}
                            <div className="d-flex align-items-start">
                                <DayPicker />
                                <div style={{ flexGrow: 1 }}>
                                    <CapacitySlider />
                                </div>
                            </div>
                            <BuildingPicker />
                            <RoomCalendar />
                        </Modal.Body>

                        <Modal.Footer>
                            <RoomInfoDownloadButton />
                            <span style={{ flexGrow: 1 }} />
                            <Button
                                variant="secondary"
                                onClick={() => setModalOpen(false)}
                            >
                                Close
                            </Button>
                        </Modal.Footer>
                    </React.Fragment>
                )}
                {activeTab === "course" && (
                    <React.Fragment>
                        <Modal.Body>
                            <CourseStats />
                        </Modal.Body>

                        <Modal.Footer>
                            <span style={{ flexGrow: 1 }} />
                            <Button
                                variant="secondary"
                                onClick={() => setModalOpen(false)}
                            >
                                Close
                            </Button>
                        </Modal.Footer>
                    </React.Fragment>
                )}
            </Modal>
        </React.Fragment>
    );
}

export default App;
