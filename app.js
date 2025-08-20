const express = require("express");
const path = require("path");
const { body, validationResult, check } = require("express-validator");
const prisma = require("./config/prismaClient");
const bcrypt = require("bcryptjs");

const nameLengthError = "must be between 3 and 10 characters.";
const nameAlphaError = "must contain only letters.";
const passwordSpaceError = "cannot contain whitespaces in the middle.";
const passwordMinLengthError = "must contain at least 7 characters.";

const validateUser = [
  body("firstName")
    .trim()
    .isLength({ min: 3, max: 10 })
    .withMessage(`First name ${nameLengthError}`)
    .isAlpha()
    .withMessage(`First name ${nameAlphaError}`),
  body("lastName")
    .trim()
    .isLength({ min: 3, max: 10 })
    .withMessage(`Last name ${nameLengthError}`)
    .isAlpha()
    .withMessage(`Last name ${nameAlphaError}`),
  body("password")
    .trim()
    .isLength({ min: 7 })
    .withMessage(`Password ${passwordMinLengthError}`)
    .custom((value) => !/\s/.test(value))
    .withMessage(`Password ${passwordSpaceError}`),
  check("confirmPassword", "Passwords do not match").custom(
    (value, { req }) => value === req.body.password
  ),
];

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

app.post("/sign-up", [
  validateUser,
  async (request, response) => {
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
      response.render("sign-up-form", {
        errors: errors.array(),
      });
    } else {
      const { firstName, lastName, username, password } = request.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const existingUsers = await prisma.user.findMany({
        where: {
          username: username,
          password: hashedPassword,
        },
      });
      if (existingUsers && existingUsers.length > 0) {
        response.render("sign-up-form", {
          errors: [
            {
              msg: "Error. Username or password already exists.",
            },
          ],
        });
      } else {
        await prisma.user.create({
          data: {
            firstName: firstName,
            lastName: lastName,
            username: username,
            password: hashedPassword,
          },
        });
        response.redirect("/");
      }
    }
  },
]);

app.get("/log-in", (request, response) => {
  response.render("log-in-form");
});

app.listen(PORT, () =>
  console.log(`Server was launched: http://localhost:${PORT}/`)
);
