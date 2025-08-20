const express = require("express");
const { check } = require("express-validator");

const poolControllers = require("../controllers/poolControllers");

const router = express.Router();

router.get("/:uid/:type/preSign", poolControllers.getPresignedUrl);

router.post("/:uid/uploadFood", poolControllers.uploadFood);

router.get("/:uid/getCustomizedFood", poolControllers.getCustomizedFood);

router.post("/:uid/:foodId/updateFood", poolControllers.updateFood);

router.delete("/:uid/:foodId/deleteFood", poolControllers.deleteFood);

module.exports = router;
