import React from "react";
import { Button, Spinner } from "react-bootstrap";
import { fetchRoomInfoForAllBuildings } from "../api/building-info";
import { useStoreActions, useStoreState } from "../store/hooks";
import { StoredRoomInfo } from "../store/store";

export function RoomInfoDownloadButton() {
    const [currentlyClicked, setCurrentlyClicked] = React.useState(false);
    const roomInfo = useStoreState((state) => state.roomInfo);
    const loading = useStoreState((state) => state.loadingData);
    const setLoading = useStoreActions((state) => state.setLoadingData);
    const setRoomInfo = useStoreActions((state) => state.setRoomInfo);
    return (
        <Button
            variant="light"
            title={`Last updated on ${roomInfo._downloadDate.slice(
                0,
                10
            )}. Re-download information about classroom capacities. This takes a long time`}
            onClick={async () => {
                setCurrentlyClicked(true);
                setLoading(true);

                try {
                    const buildings = await fetchRoomInfoForAllBuildings();
                    const roomInfo: StoredRoomInfo = {
                        _downloadDate: new Date().toJSON(),
                        buildings,
                    };
                    // We cache updated room info into local storage for use later.
                    localStorage.setItem("room-info", JSON.stringify(roomInfo));
                    setRoomInfo(roomInfo);
                } finally {
                    setCurrentlyClicked(false);
                    setLoading(false);
                }
            }}
        >
            {currentlyClicked && loading && (
                <Spinner animation="border" size="sm" className="mr-2" />
            )}
            Update Room Database
        </Button>
    );
}
