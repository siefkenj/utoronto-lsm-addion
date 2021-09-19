import React from "react";
import { Spinner } from "react-bootstrap";
import { useStoreState } from "../store/hooks";

export function ActivityThrobber() {
    const loading = useStoreState((state) => state.loadingData);
    return (
        <div className="throbber-container">
            {loading && (
                <Spinner animation="border" role="status" variant="primary" />
            )}
        </div>
    );
}
