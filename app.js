const express = require("express");
const path = require("path");
const { body, validationResult } = require("express-validator");

const nameError = "must be between 3 and 10 characters.";
const passwordSpaceError = "cannot contain whitespaces.";
const passwordMinLengthError = "must be at least 3 characters.";

const PORT = 3000;
const app = express();
app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.get("/", (request, response) => {
  response.render("index");
});

app.get("/sign-up", (request, response) => {
  response.render("sign-up-form");
});

app.listen(PORT, () =>
  console.log(`Server was launched: http://localhost:${PORT}/`)
);
