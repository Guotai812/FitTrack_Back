const express = require("express");
const { check } = require("express-validator");

const poolControllers = require("../controllers/poolControllers");

const router = express.Router();

router.get("/:uid/:type/preSign", poolControllers.getPresignedUrl);

router.post("/:uid/uploadFood", poolControllers.uploadFood);

router.get("/:uid/getCustomizedFood", poolControllers.getCustomizedFood);

router.post("/:uid/:foodId/updateFood", poolControllers.updateFood);

router.delete("/:uid/:foodId/deleteFood", poolControllers.deleteFood);

router.get("/:uid/getCusExercise", poolControllers.getCusExercise);

router.post("/:uid/uploadAerobic", poolControllers.uploadAerobic);

router.post("/:uid/uploadAnaerobic", poolControllers.uploadAnaerobic);

router.patch("/:uid/updateCusExercise/:id", poolControllers.updateCusExercise);

module.exports = router;
