import React from "react";
import { useStoreActions, useStoreState } from "../store/hooks";
// Import as a module in your JS
import { Form } from "react-bootstrap";

import "react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css";
import RangeSlider from "react-bootstrap-range-slider";

export function CapacitySlider() {
    const capacity = useStoreState((state) => state.capacity);
    const setCapacity = useStoreActions((state) => state.setCapacity);
    const minCapacity = capacity.min;
    const maxCapacity = capacity.max;
    const filterByCapacity = useStoreState((state) => state.filterByCapacity);
    const setFilterByCapacity = useStoreActions(
        (state) => state.setFilterByCapacity
    );

    function setMinCapacity(v: number) {
        setCapacity({ min: v });
    }
    function setMaxCapacity(v: number) {
        setCapacity({ max: v });
    }

    return (
        <div>
            <Form>
                <Form.Group controlId="capacity-filter">
                    <Form.Check
                        className="mx-3"
                        label="Filter by classroom size"
                        type="checkbox"
                        checked={filterByCapacity}
                        onChange={(e) => {
                            setFilterByCapacity(e.target.checked);
                        }}
                    />
                </Form.Group>
            </Form>
            {filterByCapacity && (
                <div
                    className="slider-container"
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        width: "100%",
                    }}
                >
                    <RangeSlider
                        value={minCapacity}
                        tooltip="on"
                        onChange={(v) => setMinCapacity(+v.target.value)}
                        min={0}
                        max={maxCapacity - 1}
                    />
                    <RangeSlider
                        value={maxCapacity}
                        tooltip="on"
                        min={minCapacity + 1}
                        max={2000}
                        onChange={(v) => setMaxCapacity(+v.target.value)}
                    />
                </div>
            )}
        </div>
    );
}
