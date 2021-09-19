import React from "react";
import "./App.css";
import "./namespaced-bootstrap.css";
import { Modal, Button } from "react-bootstrap";
import { DayPicker } from "./components/day-picker";
import { BuildingPicker } from "./components/building-picker";
import { RoomCalendar } from "./components/room-calendar";
import { CapacitySlider } from "./components/capacity-slider";
import { ActivityThrobber } from "./components/activity-throbber";
import { RoomInfoDownloadButton } from "./components/room-info-download";
import { useStoreActions } from "./store/hooks";

export function App() {
    const [modalOpen, setModalOpen] = React.useState(false);
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
                    <Modal.Title>
                        UToronto LSM Addon
                        <ActivityThrobber />
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
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
            </Modal>
        </React.Fragment>
    );
}

export default App;
