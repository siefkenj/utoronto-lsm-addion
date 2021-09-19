import React from "react";
import { useStoreActions, useStoreState } from "../store/hooks";
import { Typeahead } from "react-bootstrap-typeahead";
// Import as a module in your JS
import "react-bootstrap-typeahead/css/Typeahead.css";

export function BuildingPicker() {
    const roomInfo = useStoreState((state) => state.roomInfo.buildings);
    const activeBuildings = useStoreState((state) => state.activeBuildings);
    const setActiveBuildings = useStoreActions(
        (state) => state.setActiveBuildings
    );
    const multiSelectOptions = React.useMemo(
        () =>
            roomInfo.map((building) => ({
                id: building.building,
                label: building.buildingName,
            })),
        [roomInfo]
    );
    return (
        <div className="d-flex align-items-center">
            <div className="mr-2">View rooms in building</div>
            <div style={{ flexGrow: 1 }}>
                <Typeahead
                    id="building-picker"
                    options={multiSelectOptions}
                    placeholder="Pick one or more buildings..."
                    multiple
                    selected={activeBuildings}
                    onChange={(buildings) => setActiveBuildings(buildings)}
                />
            </div>
        </div>
    );
}
