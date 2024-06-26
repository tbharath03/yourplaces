import React, { useEffect, useState } from "react";

import { useParams } from "react-router-dom";
import PlaceList from "../components/PlaceList";
// import ErrorModal from "../../shared/components/UIElements/ErrorModal";
import LoadingSpinner from "../../shared/components/UIElements/LoadingSpinner";
import { useHttpClient } from "../../shared/hooks/http-hook";

const UserPlaces = () => {
    const [loadedPlaces, setLoadedPlaces] = useState();
    const userId = useParams().userId;
    const { isLoading, sendRequest } = useHttpClient();
    useEffect(() => {
        const fetchPlaces = async () => {
            try {
                const responeData = await sendRequest(
                    `${process.env.REACT_APP_BACKEND_URL}/places/user/${userId}`
                );
                setLoadedPlaces(responeData.places);
            } catch (err) {}
        };
        fetchPlaces();
    }, [sendRequest, userId]);

    const placeDeletedHandler = (deletedPlaceId) => {
        setLoadedPlaces((prevPlaces) =>
            prevPlaces.filter((place) => place.id !== deletedPlaceId)
        );
    };

    return (
        <>
            {/* <ErrorModal error={error} onClear={clearError} /> */}
            {isLoading && (
                <div className="center">
                    <LoadingSpinner />
                </div>
            )}
            {!isLoading && loadedPlaces && (
                <PlaceList
                    items={loadedPlaces}
                    onDeletePlace={placeDeletedHandler}
                />
            )}
        </>
    );
};

export default UserPlaces;
