const HttpError = require("../models/HttpError");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");
const getCoordsForAddress = require("../util/location");
const fs = require("fs");

const getPlaceById = async (req, res, next) => {
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        const error = new HttpError(
            "Something went wrong, could not find place.",
            500
        ); // error caused when our get method went wrong
        return next(error);
    }

    if (!place) {
        return next(
            new HttpError("Could not find a place for the provided id.", 404) // error when placesId not in database.
        );
    }
    res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid;
    let places;
    try {
        places = await Place.find({ creator: userId });
    } catch (err) {
        return next(
            new HttpError(
                "Fetching places failed, please try again later.",
                500
            )
        );
    }
    // if (places.length === 0) {
    //     return next(
    //         new HttpError(
    //             "Could not find a place for the provided user id.",
    //             404
    //         )
    //     );
    // }
    res.json({
        places: places.map((place) => place.toObject({ getters: true })),
    });
};

const createPlace = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new HttpError("Invalid inputs passed, please check your data.", 422)
        );
    }
    const { title, description, address } = req.body;

    let coordinates;
    try {
        coordinates = await getCoordsForAddress(address);
        console.log(coordinates);
    } catch (error) {
        return next(new HttpError("Unable to get Coordinates",500));
    }

    const createdPlace = new Place({
        title,
        description,
        location: coordinates,
        address,
        image: req.file.path,
        creator: req.userData.userId,
    });

    let user;

    try {
        user = await User.findById(req.userData.userId);
        console.log(user);
    } catch (err) {
        return next(
            new HttpError("Creating place failed,please try again.", 500)
        );
    }

    if (!user) {
        return next(new HttpError("Could not find any user.", 404));
    }

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPlace.save({ session: sess });
        user.places.push(createdPlace); // here push operation is mongoose push, which pushes id of object not the object itself.
        await user.save({ sesssion: sess });
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError(
            "Creating place failed, please try again later.",
            500
        );
        return next(error);
    }

    res.status(201).json({ place: createdPlace });
};

const updatePlaceById = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new HttpError("Invalid inputs passed, please check your data.", 422)
        );
    }
    const { title, description } = req.body;
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        return next(
            new HttpError("Something went wrong could not update place.", 500)
        );
    }

    if (place.creator.toString() !== req.userData.userId) {
        return next(
            new HttpError("you are not allowed to edit this place.", 401)
        );
    }

    place.title = title;
    place.description = description;

    try {
        place.save();
    } catch (err) {
        return next(
            new HttpError("Something went wrong could not update place.", 500)
        );
    }

    res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlaceById = async (req, res, next) => {
    const placeId = req.params.pid;
    let place;

    try {
        place = await Place.findById(placeId).populate("creator");
    } catch (err) {
        return next(
            new HttpError("Something went wrong, could not delete place.", 500)
        );
    }

    if (!place) {
        return next(new HttpError("Could not find place for this id.", 404));
    }

    if (place.creator.id !== req.userData.userId) {
        return next(
            new HttpError("you are not allowed to delete this place.", 401)
        );
    }

    const imagePath = place.image;

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.deleteOne({ session: sess });
        place.creator.places.pull(place);
        await place.creator.save({ session: sess });
        await sess.commitTransaction();
    } catch (err) {
        return next(
            new HttpError("Something went wrong, could not delete place", 500)
        );
    }

    fs.unlink(imagePath, (err) => {
        console.log(err);
    });

    res.status(200).json({ message: "Deleted place." });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlaceById = updatePlaceById;
exports.deletePlaceById = deletePlaceById;
